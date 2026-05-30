# STRIDE OS — Bug Tracker

**Last updated:** 2026-05-29
Severity: **P0** breaks core flow · **P1** security/correctness · **P2** quality · **P3** cosmetic
Status: ✅ fixed this pass · 🔧 fix specified, not applied · 📝 noted

---

## ✅ BUG-001 · Strava import broken — partial-index `ON CONFLICT` (P0)

**Where:** `supabase/functions/strava-oauth-callback/index.ts`, `supabase/functions/strava-sync-activities/index.ts` (both call `workouts.upsert(rows, { onConflict: 'athlete_id,source,source_ref' })`), against index `idx_workouts_source_ref` in `20260522210000_add_workouts_and_athlete_users.sql`.

**Symptom:** Initial Strava connect AND the "Sync Now" button fail. Postgres raises `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`. The function returns 500 / `workouts upsert failed`; no activities import.

**Cause:** The unique index is *partial* (`where source_ref is not null`). PostgreSQL won't infer a partial unique index from a column list alone; PostgREST's `onConflict` can't emit the required `WHERE` predicate.

**Fix (applied):** `supabase/migrations/20260529173000_fix_workouts_upsert_unique_index.sql` — drop the partial index, create a full unique index on `(athlete_id, source, source_ref)`. NULL `source_ref` stays distinct, so coach manual entries are unaffected.

**To deploy:** `supabase db push` (or run the migration SQL in the Supabase SQL editor). Then connect Strava / click Sync Now and confirm activities appear and a re-sync imports 0 new (idempotent).

**Verified:** behaviour confirmed against PostgreSQL + PostgREST docs and Supabase discussion #36532. Live-DB repro not possible in the audit sandbox (no Postgres/root).

---

## 🔧 BUG-002 · Stored XSS via `innerHTML` of user-controlled text (P1)

**Where:** ~45 `innerHTML =` sites in `index.html`. Highest-risk path: `strava-*` functions store `coach_notes = "Strava: " + activity.name`; the dashboard renders notes via `innerHTML`.

**Symptom (potential):** A Strava activity named `<img src=x onerror="…">` (attacker controls their own activity names) executes script in the **coach's** browser when they view that athlete's workouts. Athlete-entered notes and athlete names are similar vectors once athlete self-login is live.

**Fix (specified):** Add a small `escapeHtml(str)` helper and apply it to every interpolated user value going into `innerHTML` (athlete `name`, `coach_notes`, `athlete_notes`, Strava `name`, `location`), or switch those nodes to `textContent`. Audit all 45 sites; many interpolate only app-controlled strings and are safe, so do this with a browser open to confirm rendering is unchanged.

**Why not auto-fixed:** safe remediation needs per-site review + a render test loop, unavailable in this pass.

---

## 📝 BUG-003 · `team_annual` has no distinct tier (P2 / product)

**Where:** `create-checkout-session/index.ts` (accepts `team_annual`) vs `stripe-webhook/index.ts` + `apply_stripe_subscription` (only `pro`/`free`, interval only `monthly`/`annual`).

**Symptom:** A team purchase is stored as ordinary annual `pro`; you can't tell team vs individual customers from the DB, and team seat logic has nowhere to live.

**Fix (specified):** Decide the model first. Minimal: store the plan on the subscription metadata (already set: `plan: 'team_annual'`) into a `coaches.plan_code` column via the webhook. Fuller: add a `team`/`program` tier to the `subscription_tier` check and seat tables. Defer until team features are scoped.

---

## 📝 BUG-004 · Quality / cosmetic (P3)

- Two `console.log` calls left in `index.html` (debug noise).
- Eight loose `==` comparisons in `index.html` — prefer `===` (don't bulk-change without checking each, since some may rely on coercion).
- `README.md` states `index.html` is "~4,500 lines"; actual is 6,180 — update.
- Price/trial copy duplicated across `stride-config.js`, edge-function header comments, and `Stripe_Setup_SOP.md`; keep in sync (monthly `$24`, annual `$199`, team `$399`, 14-day trial).

---

## Notes on things that are **correct** (checked, no bug)

- All 4 frontend `.rpc()` names exist as migration functions; all 6 `.from()` targets exist.
- Auth wiring (`getSession` → `access_token` → `Authorization: Bearer`) is correct on every edge-function call.
- `apply_stripe_subscription` RPC signature matches the webhook's call exactly.
- No secret keys in client config. No duplicate element IDs. JS parses cleanly.
- Strava token refresh logic (60 s skew, refresh-token rotation) is correct.
- RLS policies cover coach-owns-data and athlete-self-access paths consistently.
