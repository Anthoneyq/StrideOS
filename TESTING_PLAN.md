# STRIDE OS — Testing Plan

**Last updated:** 2026-06-22
There is **no build system** yet (static single-file app), but the prediction engine now has a Node regression benchmark. This plan gives you (1) repeatable checks that need no browser, and (2) a manual QA checklist for the flows that matter — plus exact regression tests for prediction/math and the P0 Strava fix.

---

## 1. Run it locally

It's a static file, so any static server works. From the repo root:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/index.html
```

Anonymous mode works immediately (data in `localStorage`). To exercise sign-in / sync / billing / Strava you need the Supabase backend reachable and DNS resolving for the project in `stride-config.js`; it points at the live project, so sign-in works from localhost when that project is reachable. Stripe checkout redirects to real Stripe; use test-mode keys on the Edge Functions for safe end-to-end billing tests.

## 2. Repeatable static checks (no browser, ~seconds)

These caught real issues this pass and should be re-run after any `index.html` edit:

```bash
# (a) JS syntax of the whole inline app
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim() && !s.includes('supabase-js') && !s.includes('papaparse') && !s.includes('xlsx.full.min')); scripts.forEach((s,i)=>new Function(s)); console.log('inline script syntax ok:', scripts.length);"

# (a2) prediction/math regression benchmark
node Predictive_Model/prediction_benchmarks.js
#     Covers VDOT calibration, short/long race equivalence, invalid time parsing,
#     speed-percentage pace math, expanded event support, and target-result leakage.

# (b) duplicate element IDs (silent DOM breakage)
node -e 'const h=require("fs").readFileSync("index.html","utf8");const m=[...h.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);const c={};m.forEach(i=>c[i]=(c[i]||0)+1);const d=Object.entries(c).filter(([,n])=>n>1);console.log(d.length?d:"no duplicate IDs")'

# (c) inline on*= handlers must resolve to defined functions
#     (full analyzer lived in the audit; re-run if you add handlers)

# (d) every .rpc()/.from() in the frontend must exist in supabase/migrations
grep -oE "\.rpc\(\s*'[^']+'" index.html | grep -oE "'[^']+'" | sort -u
grep -oE "\.from\(\s*'[^']+'" index.html | grep -oE "'[^']+'" | sort -u
#     compare against: grep -hoE "create (table|or replace function|view)[^(]*" supabase/migrations/*.sql
```

**Security rule to keep:** any new `innerHTML` interpolation of a DB/user value must be wrapped in `esc()` (`index.html:674`). Verify with:
```bash
grep -nE "\.innerHTML\s*=" index.html   # review new sites; user strings need esc()
```

## 3. P0 regression test — Strava import (BUG-001)

This is the bug fixed by `migrations/20260529173000_fix_workouts_upsert_unique_index.sql`. Test on a **staging** Supabase branch before prod.

1. Apply migrations: `supabase db push` (or run the new migration's SQL in the dashboard).
2. Confirm the index is now full (not partial):
   ```sql
   select indexdef from pg_indexes
   where indexname = 'idx_workouts_source_ref';
   -- expect: CREATE UNIQUE INDEX ... ON public.workouts (athlete_id, source, source_ref)
   -- with NO "WHERE source_ref IS NOT NULL"
   ```
3. In the app: connect Strava for a test athlete → expect redirect back with `?strava=connected` and activities appearing.
4. Click **Sync Now** → expect a toast `Imported N activities` (no error toast).
5. Click **Sync Now** again → expect `Imported 0 activities` (idempotent; proves the upsert conflict path works, which is exactly what was broken).
6. Sanity SQL: `select count(*) from workouts where source='strava';` should not grow on re-sync.

**Pre-fix expected failure (to confirm you understand the bug):** without the migration, steps 4–5 produce an error toast and the function logs `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`.

## 4. Manual QA checklist (core flows)

Protect the core loop: **coach → athlete → data → review.**

**Auth**
- [ ] Magic-link sign-in succeeds; refresh keeps you signed in (`getSession`).
- [ ] Sign-out clears state; protected actions prompt "Sign in first".
- [ ] New coach gets a 30-day trial (`my_subscription.has_pro_access = true`, tier `trial`).

**Coach → athlete**
- [ ] Create athlete; appears in roster and chip count updates.
- [ ] Edit athlete (name, event, race time); changes persist after refresh.
- [ ] Delete athlete asks for confirm and removes workouts (cascade).
- [ ] Athlete name with punctuation/`<>&` renders literally (XSS check) — try a name like `A <b> & "B"`.

**Data: races / predictions / workouts**
- [ ] Enter a race result → paces, predictions, event-fit, multi-event render without console errors.
- [ ] Log a workout (all types in the dropdown); appears in the training log; edit/delete works.
- [ ] CSV/XLSX import maps columns and creates athletes/results.
- [ ] Local → cloud sync (`import_local_storage`) records Terms/Privacy and migrates data.

**Billing**
- [x] "Upgrade" → checkout opens for monthly and annual in live Stripe smoke test (2026-07-02); stop before payment unless running an intentional live charge/refund.
- [ ] Paid success returns `?upgrade=success` and tier flips to `pro`.
- [ ] `team_annual` checkout and distinct team-plan persistence before broad Team sales.
- [ ] Manage subscription opens the Stripe Customer Portal.
- [ ] Webhook: cancel in Stripe → coach drops to `free` (via `apply_stripe_subscription`).
- [x] `pg_cron` scheduled `expire-trials-daily` to run `public.expire_trials()` daily at 08:00 UTC.

**Strava** — see §3.

**Mobile / responsiveness**
- [ ] At 375 px width: nav, calculator, athlete cards, modals (workout form, upgrade) are usable; no horizontal scroll; tap targets reachable.

**Console**
- [ ] No uncaught errors in DevTools across the above (debug-gated `console.log`s are fine).

## 5. Later: automate a smoke test

When ready, a single Playwright spec gives a real regression net:
- boot a local server, load `index.html`,
- assert the calculator renders with no console errors,
- enter a race time, assert prediction cards appear,
- (with a test Supabase project) sign in via magic-link token, create an athlete, log a workout, assert it persists.

Keep it to a handful of high-value paths — the goal is a safety net before any refactor of the monolithic `index.html`, not exhaustive coverage.
