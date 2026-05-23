// STRIDE OS · stripe-webhook
// Receives Stripe events, verifies the signing secret, and updates the
// coach's subscription tier in Supabase. This is the source of truth for
// "is this coach paying?" — never trust the client.
//
// Required env vars:
//   STRIPE_SECRET_KEY         sk_live_...
//   STRIPE_WEBHOOK_SECRET     whsec_... (from the webhook endpoint config)
//   STRIPE_PRICE_MONTHLY      price_...
//   STRIPE_PRICE_ANNUAL       price_...
//   SUPABASE_URL              auto
//   SUPABASE_SERVICE_ROLE_KEY auto
//
// IMPORTANT: this function is invoked by Stripe directly. It MUST be
// deployed with `verify_jwt = false` (no Supabase Auth check). Stripe's
// signature is the auth.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PRICE_MONTHLY = Deno.env.get('STRIPE_PRICE_MONTHLY');
const PRICE_ANNUAL = Deno.env.get('STRIPE_PRICE_ANNUAL');

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('missing stripe-signature header', { status: 400 });
  }
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error('webhook signature verification failed', err);
    return new Response(`signature verification failed: ${(err as Error).message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await onSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        // Subscription renewal succeeded. Make sure status is 'active'.
        await onInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Stripe sends a lot of events; we only care about the few above.
        console.log(`unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('webhook handler error', err);
    // 500 makes Stripe retry; let it.
    return new Response('handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});

// --- Event handlers ---

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return;
  if (!session.customer || !session.subscription) return;

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;

  // Fetch full subscription to know its price/interval/status.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await applySubscriptionState(customerId, subscription);

  // If the coach started Checkout before a customer record existed in
  // our coaches table (shouldn't happen, but defensively), make sure
  // the supabase_coach_id link is set by mapping client_reference_id.
  if (session.client_reference_id) {
    await admin
      .from('coaches')
      .update({ stripe_customer_id: customerId })
      .eq('id', session.client_reference_id)
      .is('stripe_customer_id', null);
  }
}

async function onSubscriptionChanged(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  await applySubscriptionState(customerId, subscription);
}

async function onSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  // Subscription canceled / ended. Drop the coach to free.
  await admin.rpc('apply_stripe_subscription', {
    stripe_customer: customerId,
    new_tier: 'free',
    new_status: 'canceled',
    new_interval: null,
    subscription_id: subscription.id,
  });
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  // Renewal succeeded. Re-affirm pro tier just in case.
  if (!invoice.customer || !invoice.subscription) return;
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
  const subId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subId);
  await applySubscriptionState(customerId, subscription);
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.customer) return;
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
  // Don't kick them off pro on first failure — Stripe's smart retries may
  // recover. Just mark the status so the UI can warn them.
  await admin
    .from('coaches')
    .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId);
}

// --- Helpers ---

async function applySubscriptionState(
  customerId: string,
  subscription: Stripe.Subscription,
) {
  // Map Stripe subscription status → our coach tier.
  // active, trialing → pro. anything else (canceled, unpaid, paused) → free.
  const status = subscription.status;
  const isPaying = status === 'active' || status === 'trialing';
  const tier = isPaying ? 'pro' : 'free';

  // Derive interval from the price.
  const priceId = subscription.items.data[0]?.price.id;
  let interval: string | null = null;
  if (priceId && priceId === PRICE_MONTHLY) interval = 'monthly';
  else if (priceId && priceId === PRICE_ANNUAL) interval = 'annual';
  else interval = subscription.items.data[0]?.price.recurring?.interval === 'year'
    ? 'annual'
    : 'monthly';

  const { error } = await admin.rpc('apply_stripe_subscription', {
    stripe_customer: customerId,
    new_tier: tier,
    new_status: status,
    new_interval: interval,
    subscription_id: subscription.id,
  });
  if (error) {
    console.error('apply_stripe_subscription RPC failed', error);
    throw error;
  }
}
