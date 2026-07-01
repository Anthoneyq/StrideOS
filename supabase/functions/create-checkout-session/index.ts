// STRIDE OS · create-checkout-session
// Creates a Stripe Checkout Session for the signed-in coach, returns the
// hosted Checkout URL. The frontend redirects to this URL.
//
// Request body: { plan: "monthly" | "annual" | "team_annual" }
// Response:     { url: "https://checkout.stripe.com/..." }
//
// Required env vars (set in Supabase Dashboard → Project Settings → Edge
// Functions → secrets):
//   STRIPE_SECRET_KEY        sk_live_... (or sk_test_... for test mode)
//   STRIPE_PRICE_MONTHLY     price_... for the $19.99/mo price
//   STRIPE_PRICE_ANNUAL      price_... for the $199/yr price
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
});

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
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
      team_annual: 'STRIPE_PRICE_TEAM_ANNUAL',
    };
    const envVar = PRICE_ENV[plan];
    if (!envVar) {
      return json(
        { error: 'plan must be "monthly", "annual", or "team_annual"' },
        400,
      );
    }
    const priceId = Deno.env.get(envVar);
    if (!priceId) {
      return json({ error: `price for ${plan} is not configured` }, 500);
    }

    // 3. Look up the coach row (need stripe_customer_id if present).
    // We use the service-role client here because the coaches table has RLS
    // and we want a clean read regardless of the user's RLS state.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: coach } = await admin
      .from('coaches')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    // 4. Create or reuse a Stripe Customer so future invoices, the
    // Customer Portal, etc. all hang off the same customer record.
    let customerId = coach?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? coach?.email ?? undefined,
        metadata: { supabase_coach_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from('coaches')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 5. Create the Checkout session.
    const appUrl =
      Deno.env.get('APP_BASE_URL') ?? 'https://strideos.thecoachlab.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${appUrl}/?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?upgrade=cancelled`,
      subscription_data: {
        metadata: { supabase_coach_id: user.id, plan },
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error', err);
    return json({ error: (err as Error).message ?? 'unknown error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
