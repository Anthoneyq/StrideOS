// STRIDE OS · manage-subscription
// In-app retention actions for the signed-in coach, so cancelling doesn't
// require the Stripe portal and we can offer honest alternatives first:
//
//   status    → where the subscription stands (active / paused / frozen /
//               freeze_scheduled / cancel_scheduled) + what offers apply
//   pause     → one free month: pause_collection(void) from the end of the
//               current period, auto-resumes ~30 days later. Monthly plans
//               only, at most once every 180 days.
//   unpause   → clear a pause early
//   freeze    → swap to the $1.99/mo data-storage price AT PERIOD END via a
//               subscription schedule (they keep the Pro time they paid for)
//   unfreeze  → back to the remembered price; if already frozen, billing
//               restarts today (full price, new cycle, no proration games)
//   cancel    → cancel_at_period_end = true (access until period end)
//   uncancel  → undo a scheduled cancel
//
// Any action may carry { reason } — stored on the subscription's metadata so
// churn insight shows up right in the Stripe Dashboard. Never trust the
// client for tier changes: the stripe-webhook remains the source of truth;
// this function only moves the Stripe subscription, then the webhook lands.
//
// Design constraints (peer-review 2026-08-18):
//   · This function NEVER writes to the Stripe catalog. The freeze price is
//     created by the operator and validated by deploy-stripe-functions.sh;
//     here it is only read from env. No freeze price → freeze unavailable,
//     while status / cancel / pause keep working untouched.
//   · Subscription schedules are only ever created, classified, released, or
//     rewritten when they carry our metadata marker. A schedule some other
//     tool attached is foreign: freeze/unfreeze refuse to touch it, cancel
//     leaves it in place.
//
// Required env vars:
//   STRIPE_SECRET_KEY         sk_live_...
//   STRIPE_PRICE_MONTHLY      price_... (unfreeze fallback if metadata lost)
//   STRIPE_PRICE_FREEZE       price_... ($1.99/mo; unset → freeze offer off)
//   SUPABASE_URL              auto
//   SUPABASE_SERVICE_ROLE_KEY auto

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const FREEZE_LOOKUP_KEY = 'strideos_freeze_199';
const SCHEDULE_MARKER_KEY = 'strideos';
const SCHEDULE_MARKER_VALUE = 'freeze';
const PAUSE_COOLDOWN_DAYS = 180;
const PAUSE_LENGTH_SECONDS = 30 * 86400;

const ACTIONS = new Set([
  'status', 'pause', 'unpause', 'freeze', 'unfreeze', 'cancel', 'uncancel',
]);

Deno.serve(handleRequest);

export async function handleRequest(req: Request): Promise<Response> {
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

    let body: { action?: string; reason?: string } = {};
    try {
      body = await req.json();
    } catch (_e) {
      // empty body → treated as status below
    }
    const action = body.action ?? 'status';
    if (!ACTIONS.has(action)) {
      return json({ error: `unknown action: ${action}` }, 400);
    }
    // Reason is coach-typed free text headed for Stripe metadata — cap it.
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 480) : '';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: coach } = await admin
      .from('coaches')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();
    if (!coach?.stripe_customer_id) {
      return json({ error: 'no Stripe customer on file' }, 400);
    }

    const sub = await findSubscription(coach);
    if (!sub) {
      return json({ error: 'no active subscription found' }, 400);
    }

    const sched = await getSchedule(sub);
    const state = describe(sub, sched);

    switch (action) {
      case 'status':
        return json(await describeWithResume(sub, sched));

      case 'pause': {
        if (!state.pause_available) {
          return json({ error: state.pause_blocked_reason ?? 'pause not available' }, 400);
        }
        const updated = await stripe.subscriptions.update(sub.id, {
          pause_collection: {
            behavior: 'void',
            resumes_at: sub.current_period_end + PAUSE_LENGTH_SECONDS,
          },
          metadata: {
            ...sub.metadata,
            last_pause_at: String(Math.floor(Date.now() / 1000)),
            ...(reason ? { retention_reason: reason } : {}),
          },
        });
        return json(describe(updated, sched));
      }

      case 'unpause': {
        if (state.state !== 'paused') {
          return json({ error: 'subscription is not paused' }, 400);
        }
        const updated = await stripe.subscriptions.update(sub.id, {
          pause_collection: '',
        });
        return json(describe(updated, sched));
      }

      case 'freeze': {
        if (state.state === 'frozen' || state.state === 'freeze_scheduled') {
          return json(state); // idempotent — already where they asked to be
        }
        const freezePrice = freezePriceId();
        if (!freezePrice) {
          return json({ error: 'freeze is not available right now' }, 400);
        }
        if (state.interval !== 'month') {
          // Annual/team seats prepaid a year — a $1.99/mo hold makes no sense
          // mid-term, and unfreezing one would spring a large surprise charge.
          return json({ error: 'freeze is for monthly plans — annual plans keep access to their paid term' }, 400);
        }
        if (sched && !sched.owned) {
          // Another tool (Stripe Dashboard phases, a partner integration…)
          // owns this subscription's schedule. Rewriting it could destroy
          // that plan — refuse instead.
          return json({ error: 'this subscription is managed by another schedule — contact support to freeze' }, 409);
        }
        const currentPriceId = sub.items.data[0]?.price.id;
        if (!currentPriceId) return json({ error: 'subscription has no price' }, 500);

        // Failure-safe ordering: remember the coach's prior intent, clear it
        // only for the schedule build, and put it back on ANY failure — a
        // botched freeze must never eat a scheduled cancel or an active pause.
        const prior = {
          cancel: sub.cancel_at_period_end,
          pause: sub.pause_collection,
        };
        const restorePrior = async () => {
          try {
            await stripe.subscriptions.update(sub.id, {
              cancel_at_period_end: prior.cancel,
              pause_collection: prior.pause
                ? { behavior: prior.pause.behavior, resumes_at: prior.pause.resumes_at ?? undefined }
                : '',
            });
          } catch (e) {
            console.error('freeze rollback failed — prior cancel/pause state may be lost', e);
          }
        };
        if (prior.cancel || prior.pause) {
          await stripe.subscriptions.update(sub.id, {
            cancel_at_period_end: false,
            pause_collection: '',
          });
        }

        // Build the schedule: swap to $1.99 at period end — they keep the Pro
        // time they paid for. end_behavior 'release' lets the sub keep
        // renewing at $1.99 indefinitely until they unfreeze or cancel.
        // Stripe's from_subscription create accepts no other params, so the
        // ownership marker AND the way back (previous_price) land in ONE
        // update straight after — if that update fails, the schedule is
        // released again and the sub restored, so an unmarked schedule can
        // never linger looking foreign.
        let created: Stripe.SubscriptionSchedule;
        try {
          created = await stripe.subscriptionSchedules.create({
            from_subscription: sub.id,
          });
        } catch (err) {
          await restorePrior();
          return json({ error: 'could not start the freeze — nothing was changed' }, 502);
        }
        try {
          const phase0 = created.phases[0];
          await stripe.subscriptionSchedules.update(created.id, {
            end_behavior: 'release',
            metadata: {
              [SCHEDULE_MARKER_KEY]: SCHEDULE_MARKER_VALUE,
              previous_price: currentPriceId,
            },
            phases: [
              {
                items: phase0.items.map((i) => ({
                  price: typeof i.price === 'string' ? i.price : i.price.id,
                  quantity: i.quantity ?? 1,
                })),
                start_date: phase0.start_date,
                end_date: sub.current_period_end,
              },
              {
                items: [{ price: freezePrice, quantity: 1 }],
                iterations: 1,
                proration_behavior: 'none',
              },
            ],
          });
        } catch (err) {
          console.error('freeze schedule update failed — rolling back', err);
          try {
            await stripe.subscriptionSchedules.release(created.id);
          } catch (e) {
            console.error('freeze rollback: schedule release failed', e);
          }
          await restorePrior();
          return json({ error: 'could not complete the freeze — your plan is unchanged' }, 502);
        }

        // Best-effort mirror of previous_price + reason onto the sub itself.
        // The schedule metadata (written atomically above) is the durable
        // copy, so a failure here must not fail the freeze.
        try {
          await stripe.subscriptions.update(sub.id, {
            metadata: {
              ...sub.metadata,
              previous_price: currentPriceId,
              ...(reason ? { retention_reason: reason } : {}),
            },
          });
        } catch (err) {
          console.warn('freeze: subscription metadata write failed (schedule metadata holds previous_price)', err);
        }
        const updated = await stripe.subscriptions.retrieve(sub.id);
        return json(await describeWithResume(updated, await getSchedule(updated)));
      }

      case 'unfreeze': {
        if (state.state === 'freeze_scheduled') {
          // Freeze hasn't kicked in yet — releasing our schedule is the whole
          // undo; the subscription keeps running exactly as before.
          await stripe.subscriptionSchedules.release(sched!.id);
          const updated = await stripe.subscriptions.retrieve(sub.id);
          return json(describe(updated, null));
        }
        if (state.state !== 'frozen') {
          return json({ error: 'subscription is not frozen' }, 400);
        }
        if (sched && !sched.owned) {
          return json({ error: 'this subscription is managed by another schedule — contact support to unfreeze' }, 409);
        }
        // The way back: sub metadata mirror first, then the schedule's own
        // (atomically written) copy, then the configured monthly price.
        const backTo = sub.metadata?.previous_price || sched?.previous_price ||
          Deno.env.get('STRIPE_PRICE_MONTHLY');
        if (!backTo) return json({ error: 'no price to unfreeze to' }, 500);
        const itemId = sub.items.data[0]?.id;
        if (!itemId) return json({ error: 'subscription has no item' }, 500);
        if (sched) await stripe.subscriptionSchedules.release(sched.id);
        // Full price, fresh cycle starting today, no proration credits from
        // the $1.99 period — plain and predictable.
        const updated = await stripe.subscriptions.update(sub.id, {
          items: [{ id: itemId, price: backTo, quantity: 1 }],
          billing_cycle_anchor: 'now',
          proration_behavior: 'none',
          cancel_at_period_end: false,
        });
        return json(describe(updated, null));
      }

      case 'cancel': {
        // Our own freeze schedule in flight would resurrect the sub — clear
        // it. A foreign schedule is left strictly alone: cancel_at_period_end
        // still goes on the subscription, which is the most we can honestly do.
        if (sched?.owned) {
          await stripe.subscriptionSchedules.release(sched.id);
        } else if (sched) {
          console.warn(`cancel: leaving foreign schedule ${sched.id} untouched on ${sub.id}`);
        }
        const updated = await stripe.subscriptions.update(sub.id, {
          cancel_at_period_end: true,
          pause_collection: '',
          metadata: {
            ...sub.metadata,
            ...(reason ? { cancel_reason: reason } : {}),
            cancel_requested_at: String(Math.floor(Date.now() / 1000)),
          },
        });
        return json(describe(updated, sched?.owned ? null : sched));
      }

      case 'uncancel': {
        if (!sub.cancel_at_period_end) {
          return json(state); // idempotent — nothing scheduled
        }
        const updated = await stripe.subscriptions.update(sub.id, {
          cancel_at_period_end: false,
        });
        return json(describe(updated, sched));
      }
    }
    return json({ error: 'unreachable' }, 500);
  } catch (err) {
    console.error('manage-subscription error', err);
    return json({ error: (err as Error).message ?? 'unknown error' }, 500);
  }
}

// --- Helpers ---

// Catalog reads only, and only from env — this function must never create
// Stripe products or prices (that's the operator's job, via the deploy script).
function freezePriceId(): string | null {
  return Deno.env.get('STRIPE_PRICE_FREEZE') || null;
}

function isFreezePrice(price: Stripe.Price | undefined | null): boolean {
  if (!price) return false;
  const envId = freezePriceId();
  if (envId && price.id === envId) return true;
  return price.lookup_key === FREEZE_LOOKUP_KEY;
}

async function findSubscription(coach: {
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
}): Promise<Stripe.Subscription | null> {
  if (coach.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(coach.stripe_subscription_id);
      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      if (custId === coach.stripe_customer_id && sub.status !== 'canceled') return sub;
    } catch (_e) {
      // fall through to listing
    }
  }
  // 'all' (not just 'active'): a trialing, past_due, or paused subscription
  // is still the coach's manageable subscription. Only truly-dead states are
  // skipped.
  const list = await stripe.subscriptions.list({
    customer: coach.stripe_customer_id,
    status: 'all',
    limit: 10,
  });
  const DEAD = new Set(['canceled', 'incomplete_expired']);
  return list.data.find((s) => !DEAD.has(s.status)) ?? null;
}

interface ScheduleInfo {
  id: string;
  owned: boolean; // carries our metadata marker → safe to rewrite/release
  previous_price: string | null; // durable copy of the pre-freeze price
}

async function getSchedule(sub: Stripe.Subscription): Promise<ScheduleInfo | null> {
  const scheduleId = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule?.id;
  if (!scheduleId) return null;
  const sched = await stripe.subscriptionSchedules.retrieve(scheduleId);
  return {
    id: sched.id,
    owned: sched.metadata?.[SCHEDULE_MARKER_KEY] === SCHEDULE_MARKER_VALUE,
    previous_price: sched.metadata?.previous_price ?? null,
  };
}

function describe(sub: Stripe.Subscription, sched: ScheduleInfo | null) {
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const interval = item?.price.recurring?.interval ?? null;
  const frozen = isFreezePrice(item?.price);
  const freezeScheduled = !frozen && Boolean(sched?.owned);
  const paused = Boolean(sub.pause_collection);

  let state = 'active';
  if (frozen) state = 'frozen';
  else if (freezeScheduled) state = 'freeze_scheduled';
  else if (paused) state = 'paused';
  else if (sub.cancel_at_period_end) state = 'cancel_scheduled';

  let pauseAvailable = false;
  let pauseBlocked: string | null = null;
  if (frozen || freezeScheduled) pauseBlocked = 'account is frozen';
  else if (paused) pauseBlocked = 'already paused';
  else if (sub.cancel_at_period_end) pauseBlocked = 'cancellation already scheduled';
  else if (interval !== 'month') pauseBlocked = 'pause is for monthly plans';
  else {
    const last = Number(sub.metadata?.last_pause_at ?? 0);
    const cooldown = PAUSE_COOLDOWN_DAYS * 86400;
    if (last && Date.now() / 1000 - last < cooldown) {
      pauseBlocked = 'pause was already used recently';
    } else {
      pauseAvailable = true;
    }
  }

  // Freeze is offered only when the operator configured the price, the plan
  // is monthly (annual seats prepaid their term — see the freeze action),
  // AND no foreign schedule stands in the way.
  const freezeAvailable = frozen || freezeScheduled ||
    (Boolean(freezePriceId()) && interval === 'month' && !(sched && !sched.owned));

  return {
    state,
    status: sub.status,
    price_id: priceId,
    interval,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: sub.cancel_at_period_end,
    paused_until: sub.pause_collection?.resumes_at ?? null,
    pause_available: pauseAvailable,
    pause_blocked_reason: pauseBlocked,
    freeze_available: freezeAvailable,
    freeze_price_cents: 199,
  };
}

// describe() plus, for frozen subs, the real price unfreezing would restore —
// so the UI can disclose the exact amount/interval BEFORE the coach confirms,
// never a hardcoded guess. Enrichment is best-effort: a failed price read
// still returns the base status.
async function describeWithResume(sub: Stripe.Subscription, sched: ScheduleInfo | null) {
  const base = describe(sub, sched);
  if (base.state !== 'frozen') return base;
  const resumeId = sub.metadata?.previous_price || sched?.previous_price ||
    Deno.env.get('STRIPE_PRICE_MONTHLY');
  if (!resumeId) return base;
  try {
    const price = await stripe.prices.retrieve(resumeId);
    return {
      ...base,
      resume_price_id: price.id,
      resume_amount_cents: price.unit_amount,
      resume_interval: price.recurring?.interval ?? null,
    };
  } catch (err) {
    console.warn('describeWithResume: price read failed', err);
    return { ...base, resume_price_id: resumeId };
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
