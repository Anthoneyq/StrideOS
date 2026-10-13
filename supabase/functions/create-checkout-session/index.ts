// STRIDE OS · create-checkout-session
// Creates a Stripe Checkout Session for the signed-in coach, returns the
// hosted Checkout URL. The frontend redirects to this URL.
//
// Request body: { plan: "monthly" | "annual" | "founding" | "team_annual" }
// Response:     { url: "https://checkout.stripe.com/..." }
//
// Required env vars (set in Supabase Dashboard → Project Settings → Edge
// Functions → secrets):
//   STRIPE_SECRET_KEY        sk_live_... (or sk_test_... for test mode)
//   STRIPE_PRICE_MONTHLY     price_... for the $19.99/mo price
//   STRIPE_PRICE_ANNUAL      price_... for the $199/yr price
//   STRIPE_FOUNDING_COUPON   coupon id for Founding Coach ($199→$149/yr,
//                            max_redemptions=25, duration=forever) — optional;
//                            plan:"founding" 400s until it is set
//   STRIPE_PRICE_TEAM_ANNUAL price_... for the $399/yr Program/Team price
//   APP_BASE_URL             e.g. https://strideos.thecoachlab.app
//   SUPABASE_URL             auto-provided
//   SUPABASE_SERVICE_ROLE_KEY auto-provided

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
  timeout: 15000,
  maxNetworkRetries: 1,
});

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  let admin: ReturnType<typeof createClient> | null = null;
  let lockedOwner: string | null = null;
  const lockToken = crypto.randomUUID();
  try {
    if(req.method !== 'POST') return json({error:'method_not_allowed'}, 405);
    // 1. Authenticate the coach from their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'missing or invalid Authorization header' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return json({ error: 'not signed in' }, 401);
    }

    // 2. Parse the requested plan and resolve its configured price.
    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    const PRICE_ENV: Record<string, string> = {
      monthly: 'STRIPE_PRICE_MONTHLY',
      annual: 'STRIPE_PRICE_ANNUAL',
      // Founding Coach = the standard annual price with the capped FOUNDING
      // coupon auto-applied; Stripe enforces the 25-seat cap via the coupon's
      // max_redemptions. No separate price, no separate tier.
      founding: 'STRIPE_PRICE_ANNUAL',
      team_annual: 'STRIPE_PRICE_TEAM_ANNUAL',
    };
    const envVar = PRICE_ENV[plan];
    if (!envVar) {
      return json(
        { error: 'plan must be "monthly", "annual", "founding", or "team_annual"' },
        400,
      );
    }
    const foundingCoupon = plan === 'founding'
      ? Deno.env.get('STRIPE_FOUNDING_COUPON')
      : undefined;
    if (plan === 'founding' && !foundingCoupon) {
      return json({ error: 'Founding seats are not open right now' }, 400);
    }
    const priceId = Deno.env.get(envVar);
    if (!priceId) {
      return json({ error: `price for ${plan} is not configured` }, 500);
    }

    // 3. Look up the coach row (need stripe_customer_id if present).
    // We use the service-role client here because the coaches table has RLS
    // and we want a clean read regardless of the user's RLS state.
    admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: coach, error: coachError } = await admin
      .from('coaches')
      .select('id, email, stripe_customer_id, deleted_at')
      .eq('id', user.id)
      .maybeSingle();

    if(coachError || !coach || coach.deleted_at) return json({error:'profile_not_ready', message:'Your coach account is not ready. Sign in again before purchasing.'}, 409);
    const {data: acquired, error: lockError} = await admin.rpc('acquire_checkout_lock', {owner_id:user.id, lock_token:lockToken});
    if(lockError) throw new Error('Checkout is temporarily unavailable. Please try again.');
    if(!acquired) return json({error:'checkout_busy', message:'Checkout is already opening. Please wait a moment and try again.'}, 409);
    lockedOwner = user.id;

    // Re-read inside the lease: another request may just have created the customer.
    const {data: currentCoach, error: currentError} = await admin.from('coaches').select('stripe_customer_id').eq('id',user.id).single();
    if(currentError || !currentCoach) throw new Error('Could not verify your billing profile.');
    coach.stripe_customer_id = currentCoach.stripe_customer_id;

    // 4. Create or reuse a Stripe Customer so future invoices, the
    // Customer Portal, etc. all hang off the same customer record.
    let customerId = coach?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? coach?.email ?? undefined,
        metadata: { supabase_coach_id: user.id },
      }, {idempotencyKey: `stride_customer_${user.id}`});
      customerId = customer.id;
      const {error: customerSaveError} = await admin
        .from('coaches')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if(customerSaveError) throw new Error('Could not save your billing profile. Please retry.');
    }

    // The lease covers every plan and tab. Reuse an open session for the same
    // plan; expire a different one before creating a replacement. Check Stripe
    // itself rather than potentially delayed webhook-derived account state.
    const hasSubscription = async () => {
      for await (const sub of stripe.subscriptions.list({customer:customerId, status:'all', limit:100})) {
        if(!['canceled','incomplete_expired'].includes(sub.status)) return true;
      }
      return false;
    };
    if(await hasSubscription()) return json({error:'already_subscribed', message:'You already have a subscription. Manage it in billing.'}, 409);
    for await (const open of stripe.checkout.sessions.list({customer:customerId, status:'open', limit:100})) {
      if(open.mode !== 'subscription') continue;
      if(open.metadata?.stride_plan === plan && open.url) return json({url:open.url});
      try{ await stripe.checkout.sessions.expire(open.id); }
      catch(_err){ return json({error:'checkout_busy', message:'An existing checkout changed. Wait a moment, then retry.'}, 409); }
    }
    if(await hasSubscription()) return json({error:'already_subscribed'}, 409);

    // 5. Create the Checkout session.
    const appUrl =
      Deno.env.get('APP_BASE_URL') ?? 'https://strideos.thecoachlab.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      metadata: {stride_plan:plan},
      expires_at: Math.floor(Date.now()/1000) + 2100,
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe rejects `discounts` combined with `allow_promotion_codes` —
      // founding auto-applies its coupon, everyone else may type a promo code.
      ...(foundingCoupon
        ? { discounts: [{ coupon: foundingCoupon }] }
        : { allow_promotion_codes: true }),
      billing_address_collection: 'auto',
      success_url: `${appUrl}/?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?upgrade=cancelled`,
      subscription_data: {
        metadata: { supabase_coach_id: user.id, plan },
      },
    }, {idempotencyKey:`stride_checkout_${lockToken}`});

    return json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error', err);
    return json({ error:'checkout_unavailable', message:'Could not open checkout. Please try again in a moment.' }, 500);
  } finally {
    if(admin && lockedOwner){
      try{ await admin.from('checkout_locks').delete().eq('coach_id',lockedOwner).eq('token',lockToken); }
      catch(_err){ console.warn('Checkout lease cleanup deferred to expiry'); }
    }
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
