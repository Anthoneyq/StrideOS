# STRIDE OS — Project Audit

**Date:** 2026-05-29
**Auditor:** Cowork engineering pass (architecture, backend/data, billing, security, performance, QA)
**Commit reviewed:** `75de41a` + uncommitted working changes (`index.html`, `create-checkout-session`)
**Scope:** Full codebase — `index.html`, `stride-config.js`, Supabase edge functions, SQL migrations/RLS, deploy scripts.

> This document consolidates what would otherwise be split across `PROJECT_AUDIT`, `TECH_DEBT`, and `ROADMAP`. Actionable bugs live in `BUGS.md`; what changed this pass is in `FINAL_HANDOFF.md`.

---

## 1. Headline

StrideOS is in **substantially better shape than a typical "needs repair" codebase.** The frontend JS parses cleanly, every database call resolves to a real object, auth and billing are wired correctly, and RLS is comprehensive. The audit found **one confirmed runtime-breaking bug** (Strava import), which has been fixed in this pass, plus a small set of security/quality items that are documented below and are safe to address incrementally.

The app was **not** rebuilt or refactored. Editing a 6,180-line working single-file app for cosmetic or "improvement" reasons without a browser-based test loop would risk regressions — which the directive explicitly warns against. Changes were kept surgical and verifiable.

---

## 2. What the app is

A single-file, static web app (`index.html`) that turns a runner's race time into a coaching toolkit: training paces across intensity zones, race forecasts for adjacent distances, event-fit analysis, environmental corrections, multi-event analysis, and a Speed Reserve Ratio. It is the first module of "CoachLab."

It works fully anonymously (data in `localStorage`), and layers on a Supabase backend for sign-in, multi-device sync, athlete/workout management, Strava import, and Stripe Pro billing.

## 3. Architecture

**Frontend.** One static `index.html` (~6,180 lines: HTML + CSS + ~5,500 lines inline vanilla JS). No framework, no build step, no bundler. Dependencies load from CDN: `@supabase/supabase-js@2`, `papaparse@5.4.1`, `xlsx@0.18.5`, plus `stride-config.js`. State is held in module-scoped variables (`sbClient`, `sbUser`, `A` = active athlete, etc.) with `localStorage` as the local-first store.

**Backend.** Supabase project `uvjrflkzgulxwrlrqowp`. Three SQL migrations define 11 tables (`coaches`, `athletes`, `races`, `daily_checkins`, `predictions`, `workouts`, `athlete_strava`, `validation_corpus`, `access_log`, `local_imports`, `event_distances`), RLS on all of them, a `my_subscription` view, and a set of `SECURITY DEFINER` RPCs (`upsert_coach_profile`, `import_local_storage`, `import_local_athlete`, `link_athlete_user`, `apply_stripe_subscription`, `expire_trials`, `export_coach_data`, `request_account_deletion`).

**Edge functions (Deno).** `create-checkout-session`, `create-portal-session`, `stripe-webhook`, `strava-oauth-callback`, `strava-sync-activities`, plus shared `cors.ts`. Stripe pinned to API `2024-06-20`.

**Billing.** Trial → free → pro tiers on the `coaches` row. Stripe is the source of truth; the webhook calls `apply_stripe_subscription` (service-role) to sync tier/status/interval. Frontend reads its own state from the `my_subscription` view.

**Data flow (core coach loop).** Coach signs in (Supabase magic link) → `upsert_coach_profile` creates the coach row with a 14-day trial → coach creates athletes/logs races → predictions computed client-side → optional Strava import writes `workouts` → coach reviews. This loop is intact end-to-end in code.

## 4. Checks performed

This is a static site — there is **no `npm install` / `build` / `lint` / `test`** to run (no `package.json`). The directive's "required checks" were adapted to the actual stack:

| Check | Tool | Result |
|---|---|---|
| JS syntax (whole inline app) | `node --check` on extracted lines 668–6177 | **Pass** — no parse errors |
| Duplicate element IDs | static scan of all `id="…"` | **0 duplicates** |
| Dangling `getElementById` | cross-ref vs static IDs | only `workoutFormOverlay` / `upgradeOverlay`, both created dynamically — **OK** |
| Inline handlers point at real fns | cross-ref 32 handlers vs 204 defs | **All resolve** |
| Every `.rpc()` exists in schema | cross-ref vs migrations | **All 4 resolve** |
| Every `.from()` table/view exists | cross-ref vs migrations | **All 6 resolve** |
| Edge-function request/response shapes | manual review vs frontend callers | **Match** (auth header, body keys) |
| Strava upsert vs index | manual + documentation | **Bug found & fixed** (see §5) |

## 5. Confirmed bug — FIXED this pass

**Strava import was broken at runtime (partial-index `ON CONFLICT`).** Both `strava-oauth-callback` and `strava-sync-activities` upsert workouts with `onConflict: 'athlete_id,source,source_ref'`. The only matching unique index (`idx_workouts_source_ref`) was **partial** (`where source_ref is not null`). PostgreSQL cannot infer a partial unique index from a bare column list — the `ON CONFLICT` target must repeat the index predicate, which PostgREST's `onConflict` cannot emit. Every import therefore threw `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`.

**Fix:** migration `20260529173000_fix_workouts_upsert_unique_index.sql` replaces the partial index with a full unique index on the same columns (NULL `source_ref` rows stay distinct by default, so coach manual entries are unaffected). No app-code change needed. Verified against PostgreSQL/PostgREST documentation and a matching Supabase issue (live DB repro was not possible in this sandbox — no Postgres/root available).

## 6. Open findings (not yet changed — see BUGS.md for detail)

**Security — `innerHTML` XSS surface (REVIEWED — already mitigated).** ~45 `innerHTML =` assignments interpolate data. This was flagged as a likely stored-XSS vector (e.g. a Strava activity name → `coach_notes` → coach's dashboard) and then traced exhaustively. **It is not vulnerable:** the only sink is direct `.innerHTML =`, and a robust `esc()` helper (escapes `& < > " '`) is applied at every user-controlled render site (athlete name, `coach_notes` at line 1310, notes, location, event, prediction source, tier badge), while `toast()`/`updateChip()` use `textContent` and deletion uses `confirm()`. No change needed. The standing rule: any *new* `innerHTML` interpolation of a DB/user string must be wrapped in `esc()`. (See BUG-002.)

**Billing — no distinct "team" tier (LOW/product).** `create-checkout-session` accepts `team_annual`, but the webhook only maps subscriptions to `pro`/`free` and `plan_interval` to `monthly`/`annual`. A team purchase is recorded as a normal annual `pro` and is indistinguishable from an individual annual. Functionally fine (they get Pro); revisit when team features ship.

**Secrets / config (GOOD).** `stride-config.js` contains only publishable values (Supabase URL + anon key, Strava `client_id` placeholder). No secret keys are in the client. Edge functions read all secrets from `Deno.env`. CORS is `*` but functions require a JWT (except the webhook, which uses Stripe signature verification, and the OAuth callback, which uses the `state` param) — acceptable.

**Performance (acceptable at current scale).** One 331 KB unminified HTML/JS file, no code-splitting or caching headers beyond Vercel defaults. Fine for a closed beta; revisit (minify, split, defer non-critical work) before wide launch.

## 7. Tech debt

- **Monolithic `index.html`** (~5,500 lines of inline JS). Hard to test and review. A future structural improvement is to split JS/CSS into modules — but only with a test loop in place, since it touches everything.
- **Doc drift:** `README.md` line-count was stale (fixed this pass: `~4,500` → `~6,180`). Trial copy and price points still live in several places — keep `stride-config.js`, the edge-function comments, and `Stripe_Setup_SOP.md` in sync.
- **Eight loose `==`** comparisons in the frontend — harmless, cosmetic. (The two `console.log`s are debug-gated and intentional — not debt.)
- **Large data/research artifacts in the repo** (`Data_Validation/*.csv`, `research/`). Fine for a knowledge repo, but bloats clones; consider Git LFS or a separate data repo.
- **Uncommitted work:** `index.html` and `create-checkout-session/index.ts` have unstaged changes; `deploy-stripe-functions.sh` is untracked. Commit or stash to keep the working tree clean.

## 8. Priority order (recommended next steps)

1. **Apply the migration** (`supabase db push` or paste in SQL editor) and re-test Strava "Sync Now." *(Fix is written; deploy is yours.)*
2. **Commit the working tree** and reconcile price/trial copy across files.
3. **Add a minimal test loop** — even a manual QA checklist or a headless smoke test — so future frontend edits are verifiable.
4. **Decide the team-tier model** before selling `team_annual` broadly.
5. **Pre-launch performance pass** (minify + cache headers) once features stabilize.

*(The previously-suspected `innerHTML` XSS work was investigated and found unnecessary — see §6 / BUG-002.)*

## 9. What was deliberately *not* done

No rewrite of the frontend, no reorganization of files, no "improvement" edits to working features, no dependency upgrades. Rationale: the directive demands verified, durable, non-cosmetic changes and warns against breaking working flows. Without a browser-based test harness in this environment, broad frontend edits could not be verified, so they are documented as prioritized recommendations instead of applied blind.
