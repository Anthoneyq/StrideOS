// STRIDE OS · create-portal-session
// Returns a Stripe Customer Portal URL for the signed-in coach. The
// portal lets them update payment method, cancel, view invoices, and
// switch plans — all hosted by Stripe.
//
// Request body: {} (no params — the coach is identified by their JWT)
// Response:     { url: "https://billing.stripe.com/..." }
//
// Required env vars:
//   STRIPE_SECRET_KEY         sk_live_...
//   APP_BASE_URL              return URL after they close the portal
//   SUPABASE_URL              auto
//   SUPABASE_SERVICE_ROLE_KEY auto

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: coach } = await admin
      .from('coaches')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!coach?.stripe_customer_id) {
      return json(
        { error: 'no Stripe customer on file — upgrade to Pro first' },
        400,
      );
    }

    const appUrl =
      Deno.env.get('APP_BASE_URL') ?? 'https://strideos.thecoachlab.app';
    const session = await stripe.billingPortal.sessions.create({
      customer: coach.stripe_customer_id,
      return_url: appUrl,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('create-portal-session error', err);
    return json({ error: (err as Error).message ?? 'unknown error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
