// ══════════════════════════════════════════════════════════════════════════
// MANAGE-SUBSCRIPTION BACKEND PROBES (2026-08-18)
// ══════════════════════════════════════════════════════════════════════════
// The pause/freeze/cancel edge function moves real money and rewrites real
// Stripe subscriptions, so its guarantees have to be proven against the REAL
// handler, not assumed. This loads supabase/functions/manage-subscription/
// index.ts itself (remote imports swapped for recording stubs, TS stripped by
// esbuild) and drives handleRequest() with real Request objects, asserting:
//   · auth / ownership: no token → 401, foreign subscription falls back to
//     the coach's own
//   · pause eligibility: monthly-only, 180-day cooldown, resumes_at math
//   · freeze: schedule carries our metadata marker; foreign schedules are
//     never rewritten or released (409 instead)
//   · no-freeze-price degradation: status + cancel keep working, freeze 400s
//   · freeze eligibility: monthly plans only (annual/team refused)
//   · failure safety: injected schedule create/update failures roll back —
//     unmarked schedules released, prior cancel/pause intent restored
//   · unfreeze: released schedule + price swap + fresh cycle anchor; the
//     restored price is recovered from schedule metadata and DISCLOSED
//     (resume_amount_cents / resume_interval) before any confirm
//   · fallback discovery: stale stored id → trialing sub found, dead skipped
//   · the function contains NO Stripe catalog writes (static probe)
//
// Run: node tests/manage-subscription-probes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(here, '..', 'supabase', 'functions', 'manage-subscription', 'index.ts');
let src = fs.readFileSync(srcPath, 'utf8');

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};

// ── Static probes: catalog safety ──────────────────────────────────────────
console.log('\n— static: no Stripe catalog writes —');
ok(!/prices\.create|products\.create/.test(src),
  'function source contains no prices.create / products.create');
ok(/STRIPE_PRICE_FREEZE/.test(src) && !/lookup_keys:/.test(src),
  'freeze price comes from env only — no runtime catalog lookup/creation');

// ── Compile the real handler with stub imports ─────────────────────────────
src = src
  .replace(/import Stripe from '[^']+';\n/, '')
  .replace(/import \{ createClient \} from '[^']+';\n/, '')
  .replace(/import \{ corsHeaders, handleCorsPreflight \} from '[^']+';\n/, '');
src = `const Stripe = globalThis.__stubs.Stripe;
const createClient = globalThis.__stubs.createClient;
const corsHeaders = globalThis.__stubs.corsHeaders;
const handleCorsPreflight = globalThis.__stubs.handleCorsPreflight;
` + src;

const js = execFileSync('npx', ['--yes', 'esbuild', '--loader=ts', '--format=esm'], {
  input: src, encoding: 'utf8',
});
const tmpDir = path.join(here, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const modPath = path.join(tmpDir, 'manage-subscription.compiled.mjs');
fs.writeFileSync(modPath, js);

// ── Stub world ─────────────────────────────────────────────────────────────
const env = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  SUPABASE_URL: 'http://supabase.local',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  STRIPE_PRICE_MONTHLY: 'price_monthly',
  STRIPE_PRICE_FREEZE: 'price_freeze',
};
globalThis.Deno = { env: { get: (k) => env[k] ?? undefined }, serve: () => {} };

const S = { // mutable per-test state
  user: { id: 'coach-1' }, userError: null,
  coach: { stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' },
  subs: {}, schedules: {}, calls: [], schedSeq: 0,
};
const rec = (name, args) => S.calls.push({ name, args });

const PRICES = {
  price_monthly: { id: 'price_monthly', unit_amount: 1999, recurring: { interval: 'month' }, lookup_key: null },
  price_annual: { id: 'price_annual', unit_amount: 19900, recurring: { interval: 'year' }, lookup_key: null },
  price_freeze: { id: 'price_freeze', unit_amount: 199, recurring: { interval: 'month' }, lookup_key: 'strideos_freeze_199' },
};

// Injectable failures: S.fail = { 'schedules.update': 1 } makes the next such
// call throw once — how the rollback paths get exercised.
const maybeFail = (name) => {
  if (S.fail && S.fail[name] > 0) { S.fail[name]--; throw new Error(`injected ${name} failure`); }
};

class StubStripe {
  constructor() {
    this.prices = {
      retrieve: async (id) => {
        rec('prices.retrieve', { id });
        const p = PRICES[id];
        if (!p) throw new Error(`No such price: ${id}`);
        return p;
      },
    };
    this.subscriptions = {
      retrieve: async (id) => {
        rec('subscriptions.retrieve', { id });
        const s = S.subs[id];
        if (!s) throw new Error(`No such subscription: ${id}`);
        return s;
      },
      list: async ({ customer, status }) => {
        rec('subscriptions.list', { customer, status });
        const mine = Object.values(S.subs).filter((s) => s.customer === customer);
        return { data: status === 'all' || !status ? mine : mine.filter((s) => s.status === status) };
      },
      update: async (id, params) => {
        rec('subscriptions.update', { id, params });
        const s = S.subs[id];
        if (!s) throw new Error(`No such subscription: ${id}`);
        if ('pause_collection' in params) {
          s.pause_collection = params.pause_collection === '' ? null : params.pause_collection;
        }
        if ('cancel_at_period_end' in params) s.cancel_at_period_end = params.cancel_at_period_end;
        if ('metadata' in params) s.metadata = { ...params.metadata };
        if (params.items) {
          const want = params.items[0];
          s.items.data[0] = { id: s.items.data[0].id, price: PRICES[want.price] || { id: want.price, recurring: { interval: 'month' } } };
        }
        return s;
      },
    };
    this.subscriptionSchedules = {
      create: async ({ from_subscription }) => {
        rec('schedules.create', { from_subscription });
        maybeFail('schedules.create');
        const sub = S.subs[from_subscription];
        const id = `sched_${++S.schedSeq}`;
        S.schedules[id] = {
          id, metadata: {},
          phases: [{ start_date: 1755000000, items: [{ price: sub.items.data[0].price.id, quantity: 1 }] }],
        };
        sub.schedule = id;
        return S.schedules[id];
      },
      retrieve: async (id) => {
        rec('schedules.retrieve', { id });
        const sc = S.schedules[id];
        if (!sc) throw new Error(`No such schedule: ${id}`);
        return sc;
      },
      update: async (id, params) => {
        rec('schedules.update', { id, params });
        maybeFail('schedules.update');
        Object.assign(S.schedules[id], params);
        return S.schedules[id];
      },
      release: async (id) => {
        rec('schedules.release', { id });
        for (const sub of Object.values(S.subs)) if (sub.schedule === id) sub.schedule = null;
        S.schedules[id].released = true;
        return S.schedules[id];
      },
    };
  }
  static createFetchHttpClient() { return {}; }
}

globalThis.__stubs = {
  Stripe: StubStripe,
  corsHeaders: {},
  handleCorsPreflight: (req) => (req.method === 'OPTIONS' ? new Response('ok', { status: 200 }) : null),
  createClient: (_url, _key, opts) => {
    if (opts?.global) {
      return { auth: { getUser: async () => ({ data: { user: S.userError ? null : S.user }, error: S.userError }) } };
    }
    return { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: S.coach }) }) }) }) };
  },
};

const { handleRequest } = await import(pathToFileURL(modPath).href);

// ── Drivers & fixtures ─────────────────────────────────────────────────────
const NOW = Math.floor(Date.now() / 1000);
const PERIOD_END = NOW + 12 * 86400;
function makeSub(over = {}) {
  return {
    id: 'sub_1', customer: 'cus_1', status: 'active',
    cancel_at_period_end: false, pause_collection: null, schedule: null,
    current_period_end: PERIOD_END, metadata: {},
    items: { data: [{ id: 'si_1', price: PRICES.price_monthly }] },
    ...over,
  };
}
function reset(subOver = {}) {
  S.user = { id: 'coach-1' }; S.userError = null;
  S.coach = { stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' };
  S.subs = { sub_1: makeSub(subOver) }; S.schedules = {}; S.calls = []; S.schedSeq = 0; S.fail = {};
  env.STRIPE_PRICE_FREEZE = 'price_freeze';
}
async function call(action, { auth = 'Bearer tok', reason } = {}) {
  const req = new Request('http://edge.local/manage-subscription', {
    method: 'POST',
    headers: auth ? { Authorization: auth } : {},
    body: JSON.stringify(reason ? { action, reason } : { action }),
  });
  const res = await handleRequest(req);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const called = (name) => S.calls.filter((c) => c.name === name);

// ── Auth & ownership ───────────────────────────────────────────────────────
console.log('\n— auth & ownership —');
reset();
{
  const r = await handleRequest(new Request('http://x/', { method: 'OPTIONS' }));
  ok(r.status === 200, 'CORS preflight answered');
}
ok((await call('status', { auth: null })).status === 401, 'no Authorization header → 401');
S.userError = { message: 'bad token' };
ok((await call('status')).status === 401, 'invalid session → 401');
reset(); S.coach = { stripe_customer_id: null, stripe_subscription_id: null };
ok((await call('status')).status === 400, 'no Stripe customer on file → 400');
reset();
// stored subscription id belongs to someone else's customer → must fall back
// to listing this coach's own subs, never operate on the foreign one
S.subs.sub_1 = makeSub({ id: 'sub_1', customer: 'cus_OTHER' });
S.subs.sub_mine = makeSub({ id: 'sub_mine', customer: 'cus_1' });
{
  const r = await call('cancel');
  ok(r.status === 200, 'foreign stored subscription id → falls back to own sub');
  ok(S.subs.sub_mine.cancel_at_period_end === true && S.subs.sub_1.cancel_at_period_end === false,
    'cancel landed on the coach\'s own subscription, not the foreign one');
}

// ── Status & pause eligibility ─────────────────────────────────────────────
console.log('\n— status & pause eligibility —');
reset();
{
  const r = await call('status');
  ok(r.status === 200 && r.body.state === 'active', 'status: active monthly sub reported');
  ok(r.body.pause_available === true, 'pause offered to an eligible monthly sub');
  ok(r.body.freeze_available === true, 'freeze offered when the price is configured');
}
reset({ items: { data: [{ id: 'si_1', price: PRICES.price_annual }] } });
{
  const r = await call('pause');
  ok(r.status === 400 && /monthly/.test(r.body.error), 'pause refused on annual plans');
}
reset({ metadata: { last_pause_at: String(NOW - 30 * 86400) } });
ok((await call('pause')).status === 400, 'pause refused inside the 180-day cooldown');
reset({ metadata: { last_pause_at: String(NOW - 200 * 86400) } });
{
  const r = await call('pause');
  ok(r.status === 200 && r.body.state === 'paused', 'pause allowed after the cooldown');
  const pc = S.subs.sub_1.pause_collection;
  ok(pc && pc.behavior === 'void' && pc.resumes_at === PERIOD_END + 30 * 86400,
    'pause voids collection and auto-resumes 30 days after period end');
  ok(Number(S.subs.sub_1.metadata.last_pause_at) >= NOW, 'cooldown timestamp recorded');
}
ok((await call('unpause')).status === 200 && S.subs.sub_1.pause_collection === null,
  'unpause clears the pause');
reset();
ok((await call('unpause')).status === 400, 'unpause on a non-paused sub → 400');

// ── Freeze: schedule ownership ─────────────────────────────────────────────
console.log('\n— freeze & schedule ownership —');
reset();
{
  const r = await call('freeze', { reason: 'price' });
  ok(r.status === 200 && r.body.state === 'freeze_scheduled', 'freeze schedules the swap');
  const sched = Object.values(S.schedules)[0];
  ok(sched.metadata.strideos === 'freeze', 'our schedule carries the ownership marker');
  ok(sched.metadata.previous_price === 'price_monthly',
    'previous_price written to schedule metadata ATOMICALLY with the marker');
  ok(sched.end_behavior === 'release', 'schedule releases (keeps renewing at $1.99) after the swap');
  ok(sched.phases[1].items[0].price === 'price_freeze', 'phase 2 is the freeze price');
  ok(sched.phases[0].end_date === PERIOD_END, 'paid Pro time runs to period end before the swap');
  ok(S.subs.sub_1.metadata.previous_price === 'price_monthly', 'way back remembered before the swap');
  ok(S.subs.sub_1.metadata.retention_reason === 'price', 'reason stored for churn insight');
}
{
  const r = await call('freeze');
  ok(r.status === 200 && called('schedules.create').length === 1,
    'freeze is idempotent — second call creates no second schedule');
}
reset();
S.schedules.sched_foreign = { id: 'sched_foreign', metadata: { source: 'partner-tool' }, phases: [] };
S.subs.sub_1.schedule = 'sched_foreign';
{
  const r = await call('freeze');
  ok(r.status === 409, 'freeze refuses a subscription managed by a FOREIGN schedule');
  ok(called('schedules.update').length === 0 && called('schedules.release').length === 0,
    'the foreign schedule was neither rewritten nor released');
}

// ── Degradation without a freeze price ─────────────────────────────────────
console.log('\n— no freeze price configured —');
reset(); delete env.STRIPE_PRICE_FREEZE;
{
  const st = await call('status');
  ok(st.status === 200 && st.body.freeze_available === false,
    'status still works and reports freeze unavailable');
  const fr = await call('freeze');
  ok(fr.status === 400 && called('schedules.create').length === 0,
    'freeze cleanly refuses — no schedule side effects');
  const ca = await call('cancel');
  ok(ca.status === 200 && S.subs.sub_1.cancel_at_period_end === true,
    'cancel is fully independent of freeze configuration');
}

// ── Unfreeze ───────────────────────────────────────────────────────────────
console.log('\n— unfreeze —');
reset();
await call('freeze');
{
  const r = await call('unfreeze');
  ok(r.status === 200 && r.body.state === 'active', 'unfreeze before period end just releases our schedule');
  ok(called('schedules.release').length === 1 && S.subs.sub_1.schedule === null, 'schedule released');
  ok(S.subs.sub_1.items.data[0].price.id === 'price_monthly', 'price untouched — freeze never started');
}
reset({ items: { data: [{ id: 'si_1', price: PRICES.price_freeze }] }, metadata: { previous_price: 'price_monthly' } });
S.schedules.sched_ours = { id: 'sched_ours', metadata: { strideos: 'freeze' }, phases: [] };
S.subs.sub_1.schedule = 'sched_ours';
{
  const r = await call('unfreeze');
  ok(r.status === 200 && r.body.state === 'active', 'unfreeze of a frozen sub succeeds');
  ok(S.subs.sub_1.items.data[0].price.id === 'price_monthly', 'swapped back to the remembered price');
  const upd = called('subscriptions.update').find((c) => c.args.params.items);
  ok(upd && upd.args.params.billing_cycle_anchor === 'now' && upd.args.params.proration_behavior === 'none',
    'billing restarts today, full price, no proration games');
  ok(S.schedules.sched_ours.released === true, 'our leftover schedule released');
}
reset({ items: { data: [{ id: 'si_1', price: PRICES.price_freeze }] }, metadata: { previous_price: 'price_monthly' } });
S.schedules.sched_foreign = { id: 'sched_foreign', metadata: {}, phases: [] };
S.subs.sub_1.schedule = 'sched_foreign';
{
  const r = await call('unfreeze');
  ok(r.status === 409 && !S.schedules.sched_foreign.released,
    'unfreeze refuses to release a FOREIGN schedule');
}
reset();
ok((await call('unfreeze')).status === 400, 'unfreeze on a normal active sub → 400');

// ── Cancel / uncancel ──────────────────────────────────────────────────────
console.log('\n— cancel & uncancel —');
reset();
await call('freeze');
{
  const r = await call('cancel', { reason: 'switching' });
  ok(r.status === 200 && S.subs.sub_1.cancel_at_period_end === true, 'cancel after freeze works');
  ok(called('schedules.release').length === 1, 'cancel releases OUR schedule so it cannot resurrect the sub');
  ok(S.subs.sub_1.metadata.cancel_reason === 'switching', 'cancel reason stored');
}
reset();
S.schedules.sched_foreign = { id: 'sched_foreign', metadata: { source: 'partner' }, phases: [] };
S.subs.sub_1.schedule = 'sched_foreign';
{
  const r = await call('cancel');
  ok(r.status === 200 && S.subs.sub_1.cancel_at_period_end === true,
    'cancel still works with a foreign schedule present');
  ok(called('schedules.release').length === 0 && !S.schedules.sched_foreign.released,
    'the foreign schedule was left strictly alone');
}
{
  const r = await call('uncancel');
  ok(r.status === 200 && S.subs.sub_1.cancel_at_period_end === false, 'uncancel clears the scheduled cancel');
  const r2 = await call('uncancel');
  ok(r2.status === 200, 'uncancel is idempotent when nothing is scheduled');
}

// ── Freeze plan eligibility ────────────────────────────────────────────────
console.log('\n— freeze eligibility (monthly only) —');
reset({ items: { data: [{ id: 'si_1', price: PRICES.price_annual }] } });
{
  const st = await call('status');
  ok(st.body.freeze_available === false, 'status: freeze not offered to annual plans');
  const fr = await call('freeze');
  ok(fr.status === 400 && /monthly/.test(fr.body.error), 'freeze refused on annual plans');
  ok(called('schedules.create').length === 0, 'no schedule side effects on refusal');
}

// ── Freeze failure safety ──────────────────────────────────────────────────
console.log('\n— freeze failure safety (rollback) —');
reset({ cancel_at_period_end: true });
S.fail['schedules.update'] = 1;
{
  const r = await call('freeze');
  ok(r.status === 502, 'schedule-update failure → clean error, not a half-freeze');
  const sched = Object.values(S.schedules)[0];
  ok(sched && sched.released === true, 'the unmarked schedule was released — cannot linger looking foreign');
  ok(S.subs.sub_1.cancel_at_period_end === true, 'the coach\'s scheduled CANCEL was restored');
  ok(!S.subs.sub_1.metadata.previous_price, 'no stray metadata written on the failed path');
}
reset({ pause_collection: { behavior: 'void', resumes_at: PERIOD_END + 30 * 86400 } });
S.fail['schedules.create'] = 1;
{
  // A paused sub asking to freeze: state 'paused', not frozen/scheduled, so
  // freeze proceeds by lifting the pause first — creation failure must put
  // the pause back.
  const r = await call('freeze');
  ok(r.status === 502, 'schedule-create failure → clean error');
  const pc = S.subs.sub_1.pause_collection;
  ok(pc && pc.behavior === 'void' && pc.resumes_at === PERIOD_END + 30 * 86400,
    'the coach\'s active PAUSE was restored exactly');
}

// ── Unfreeze price recovery & disclosure ───────────────────────────────────
console.log('\n— unfreeze price recovery & disclosure —');
reset({ items: { data: [{ id: 'si_1', price: PRICES.price_freeze }] }, metadata: {} });
S.schedules.sched_ours = { id: 'sched_ours', metadata: { strideos: 'freeze', previous_price: 'price_annual' }, phases: [] };
S.subs.sub_1.schedule = 'sched_ours';
{
  const st = await call('status');
  ok(st.body.state === 'frozen' && st.body.resume_price_id === 'price_annual',
    'frozen status names the REAL price unfreezing restores');
  ok(st.body.resume_amount_cents === 19900 && st.body.resume_interval === 'year',
    'status disclosed the real amount + interval for the confirm dialog');
  const r = await call('unfreeze');
  ok(r.status === 200 && S.subs.sub_1.items.data[0].price.id === 'price_annual',
    'unfreeze recovered previous_price from SCHEDULE metadata when sub metadata was lost');
}

// ── Fallback discovery: non-canceled subscriptions ─────────────────────────
console.log('\n— fallback discovery (trialing / stale id) —');
reset();
S.coach.stripe_subscription_id = 'sub_GONE'; // stale id, retrieve throws
delete S.subs.sub_1;
S.subs.sub_dead = makeSub({ id: 'sub_dead', status: 'canceled' });
S.subs.sub_trial = makeSub({ id: 'sub_trial', status: 'trialing' });
{
  const r = await call('status');
  ok(r.status === 200 && r.body.status === 'trialing',
    'stale stored id → falls back to the coach\'s TRIALING subscription');
  const ca = await call('cancel');
  ok(ca.status === 200 && S.subs.sub_trial.cancel_at_period_end === true
    && S.subs.sub_dead.cancel_at_period_end === false,
    'actions land on the trialing sub; the canceled corpse is skipped');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
