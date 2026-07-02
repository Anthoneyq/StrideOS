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

## ✅ BUG-002 · `innerHTML` XSS surface — REVIEWED, already mitigated (was flagged P1)

**Initial hypothesis:** ~45 `innerHTML =` sites; a Strava activity name flowing into `coach_notes` and rendered to the coach looked like a stored-XSS vector.

**Verification (this pass):** Traced every HTML sink and every user-controlled field. Result: **not vulnerable.**

- The only HTML sink is direct `.innerHTML =` — no `insertAdjacentHTML` / `outerHTML` / `document.write` / `innerHTML +=`.
- A robust `esc()` helper (`index.html:674`; escapes `& < > " '`, so it covers element-content **and** attribute contexts) is applied at **every** user-controlled render site: athlete `name`, `coach_notes` (the Strava path — `index.html:1310`), `prescribed_notes`, `location` / `raceLocation`, `primaryEvent` / `event`, prediction `source` (`esc(anchor.source)` at 5038), the subscription tier badge, etc. Edit-form textareas escape existing notes too (1357, 1390).
- `toast()` and `updateChip()` write via `textContent` (XSS-safe); athlete deletion uses `confirm()` (a plain dialog, no HTML).

**Action:** none — adding more escaping would double-encode. **Maintain the discipline:** any *new* `innerHTML` interpolation of a DB/user string must be wrapped in `esc()`.

---

## 📝 BUG-003 · `team_annual` has no distinct tier (P2 / product)

**Where:** `create-checkout-session/index.ts` (accepts `team_annual`) vs `stripe-webhook/index.ts` + `apply_stripe_subscription` (only `pro`/`free`, interval only `monthly`/`annual`).

**Symptom:** A team purchase is stored as ordinary annual `pro`; you can't tell team vs individual customers from the DB, and team seat logic has nowhere to live.

**Fix (specified):** Decide the model first. Minimal: store the plan on the subscription metadata (already set: `plan: 'team_annual'`) into a `coaches.plan_code` column via the webhook. Fuller: add a `team`/`program` tier to the `subscription_tier` check and seat tables. Defer until team features are scoped.

---

## 📝 BUG-004 · Quality / cosmetic (P3)

- ~~Two `console.log` calls~~ — these are **debug-gated** (`if(WEATHER_CONFIG.debug)`), i.e. intentional. Leave as-is. (Originally mis-flagged as stray noise.)
- Eight loose `==` comparisons in `index.html` — prefer `===` (don't bulk-change without checking each, since some may rely on coercion).
- ~~`README.md` line-count drift~~ — **FIXED** this pass (`~4,500` → `~6,180`).
- Price/trial copy duplicated across `stride-config.js`, edge-function header comments, and `Stripe_Setup_SOP.md`; keep in sync (monthly `$24`, annual `$199`, team `$399`, 14-day trial).

---

## 2026-06-30 — Wave 1 trust fixes (coach-credibility pass)

**✅ BUG-005 · Easy/aerobic zones ~1 min/mi too slow — Canova multiplier never shipped (P0).** The v2 coach email promised Easy 65% ≈ 7:16/mi via Canova `2 − pct/100`, but `pctToMult` (index.html ~3065) still used the reciprocal speed-% model `100/pct`, producing Easy ≈ **8:17/mi** for a 16:43 5K runner — over-corrected to too slow (opposite of the original 6:27 too-fast complaint). **Fix:** `pctToMult` now returns `2 − pct/100`, clamped to [0.5, 2.0]. Zone ladder for a 16:43 runner is now Recovery 7:48 / Easy 7:16 / Long 7:00 / Steady 6:27 / Tempo 6:02 / Threshold 5:45 / CV 5:36 / Race 5:23 / VO2 5:07 / Sprint 4:25. The two models converge above ~88%, so threshold/CV/rep targets barely moved. `pctToMult` is isolated to training-pace display — not in the prediction path. Benchmark assertions updated (`prediction_benchmarks.js:76`) to lock the new values; **31/31 pass.** ⚠️ Still needs browser QA + a re-check with Alex/Doug before it counts as their validated number.

**✅ BUG-006 · "6:60" rounding bug (P3).** `fmtMile` already guarded the seconds→60 carry, but its siblings did not: `displayPace` mile branch (the per-rep pace coaches see), `fmtT`, `fmtSplit`, `fmtRepTime`, `fmtOffset` all let `toFixed(1)` turn 59.96 into "60.0" or `Math.round` hit 60 with no carry. **Fix:** added a carry-safe `_mmss(sec, dec)` helper (index.html ~2718) and routed all of them through it. Unit-tested (9 cases incl. 6:59.96→7:00); inline JS parses; 31/31 engine benchmarks pass.

## 2026-07-01 — Full review + fix pass (multi-agent, 23 findings verified)

Full writeup + open decisions in `REVIEW_2026-07-01.md`. Fixed + verified (31/31 benchmarks, JS parses):

- **✅ BUG-007 · "6:60" rounding still live in 9 primary formatters (P1, coach-flagged).** The carry-safe `_mmss` existed but the split-table per-mile (4319), free-tier/builder hero mile, interval-ladder, perf-curve Y-axis, Strava `/km`, plus `fmtRepTime`/`fmtSplit`/`fmtT` sub-minute paths all re-rolled `Math.round` with no 60→00 carry. Routed all through carry-safe rounding.
- **✅ BUG-008 · Forecast table incoherent across distances (P1, coach-flagged).** Per-target `_selectBestAnchor` flipped anchors between adjacent rows → implausible pace steps. `buildPredictiveRaceTable`/`buildPreds` now pin ONE anchor (primary PR) via new `raceForecastForTarget(…, {fixedAnchor})`; multi-PR still personalizes via `personalFatigueExponent`.
- **✅ BUG-009 · Sprint rows shown for distance runners (P2, coach-flagged).** Forecast table now drops non-observed exploratory rows + all ≤400m rows for a ≥1500m primary (was only dimmed).
- **✅ BUG-010 · Short-anchor race/supra-race extrapolation (P2, coach-flagged).** New `repAllowedForAnchor` caps reps at ~1.25× a sub-1500m anchor and hides per-mile → no more sub-WR mile / VO2-faster-than-PR.
- **✅ BUG-011 · Cloud reload phantom + resurrecting PRs (P2).** `remoteAthleteToLocal` now classifies additional PRs by `source_ref` provenance (not name); `syncAthleteToSupabase` reconciles/deletes stale local-import race rows. Client-side only, no migration.
- **✅ BUG-012 · Strava callback would 401 (P1).** Added declarative `[functions.*] verify_jwt` to `config.toml` (`strava-oauth-callback`/`stripe-webhook` = false).
- **✅ BUG-013 · Annual price drift $199 vs $144 (P2).** Aligned `deploy-stripe-functions.sh` (19900¢), checkout comment, and superseded `Stripe_Setup_SOP.md`.
- **✅ BUG-014 · Dead VDOT subsystem + false "VDOT-equivalent" claim (P3).** `vToSpkm` units bug made the whole reconciliation return null for every athlete; corrected the misleading copy and labeled the split table "% of race pace".

**Open (need Anthoney / decision / deploy):** team-tier billing unpurchasable (BUG-003 family), founding-seat button doesn't charge, age-based zone recalibration, deploy + Stripe price IDs + pg_cron + Strava migration, legal review. See `REVIEW_2026-07-01.md` §NEEDS YOU.

## 2026-07-01 — Release-gate re-review (adversarial pass over the 4 local commits)

28-agent verification of the commits above found the BUG-008 fix itself regressed, plus import/privacy gaps. All fixed + verified (31/31 benchmarks, 14/14 forecast probes, 9/9 import-mapping probes, JS parses, no dup IDs):

- **✅ BUG-015 · Pinned-anchor forecasts absurd for multi-PR athletes (P1, regression of BUG-008 fix).** Pinning the PRIMARY PR table-wide extrapolated a 400m 51.4 primary into a 3:55 Mile / 8:16 3200m shown beside the athlete's own observed 18:30 5K (the `personalFatigueExponent` mitigation is inert there — sprint→distance k≈1.22 exceeds its 1.20 cap), and hid every 8K/10K/Half row because `isExploratory` was computed from the pinned anchor. **Fix:** new `nearestAnchorForTarget` — each row anchors from the athlete's nearest observed PR by pure log-distance (freshness no longer reorders anchors, which was BUG-008's actual flip cause; it still penalizes range/confidence downstream). Selection is monotone across the table → piecewise-coherent curve, no absurd cross-domain extrapolation, restored rows. Applied to `buildPredictiveRaceTable`, `buildPreds`, and `logPredictionSnapshot` (which was still logging the OLD un-pinned forecasts as "what the coach saw" — calibration data now matches the display; `PREDICTION_ENGINE_VERSION` bumped to `ensemble-2026-07-01-nearest-anchor`).
- **✅ BUG-016 · Bulk import data-loss chain (P1).** A "0:00" or junk time passed `parseTime(val) !== null`, aborted the whole `import_local_athlete` RPC on the races `time_sec > 0` check, and the athlete was then wiped locally on the next reload (`loadRemoteAthletes` replaces `DB.athletes`). Also `applyImport` saved BEFORE setting `activeAthleteId` (first anonymous import lost active-athlete state on reload), and an athlete's time at their OWN primary event was silently discarded (the exact `Name, Event, 800m, 1600m, 3200m` layout the import tips advertise imported everyone with an empty primary time). **Fix:** plausibility gate (parses AND slower than 12 m/s — also rejects Excel-decimalized "2.05" as a 2-second 800m), primary-time fallback from the matching event column, save-order fix.
- **✅ BUG-017 · Import auto-mapping collisions (P1).** Substring hints ran before exact event matches: "2 Miles" → Weekly Miles (11:05 became 11 mi/wk and the PR was lost), "800m PR" → primary PR Time for ALL athletes, and with no Age column "Mileage" → Age. **Fix:** `autoDetectColumns` now runs exact matches for ALL fields first, each column claimable once; substring fallback only for unmatched core fields over unclaimed columns. Added hint variants (plural "2 Miles", bare "800", "<event> PR", "1600/3200 meters").
- **✅ BUG-018 · Account deletion under-deleted + zombie re-sign-in (P1, privacy).** `request_account_deletion` left workouts, LIVE Strava OAuth tokens (`athlete_strava`), check-ins, predictions, prediction_log and `local_imports` intact, left the full roster (minors' PII) in localStorage (one sign-in from resurrecting "deleted" athletes), and signing back in hit a zombie state (saves into soft-deleted rows that no load returns). **Fix:** migration `20260701150000_privacy_deletion_hardening.sql` — athletes hard-deleted (FK cascades wipe all athlete-linked tables incl. Strava tokens), coach-scoped stores deleted, coach row soft-deleted (Stripe linkage), `export_coach_data` now includes workouts, `upsert_coach_profile` revives on re-accepted terms; client now clears localStorage on successful deletion; modal copy states deletion does NOT cancel an active subscription (auto-cancel deferred — needs an edge function).
- **✅ BUG-019 · Short-anchor supra-race extrapolation only 1/3 closed (P2, BUG-010 follow-through).** `repAllowedForAnchor` was wired only into the Coach Split Table; the interval builder, intensity ladder and free public calculator still extrapolated sub-1500m anchors (mile views, reps beyond the PR, supra-race pace at/beyond the race distance — faster than the athlete's own PR). **Fix:** same guards wired into `updateBuilder`, the ladder mile column, `freeTierUpdate`, and a supra-race `d >= anchor` block in `buildDanielsTable`.
- **✅ BUG-020 · `fmtT` hour-boundary carry (P3).** 3599.96s rendered "60:00.0"; now branches on the rounded value → "1:00:00".

**Refuted this pass (checked, NOT bugs):** hard-vs-soft delete inconsistency in race reconciliation (no UI reads those rows), non-atomic reconcile select+delete (no user-visible harm), silent reconcile failures (self-heals next sync), `local_imports` PII retention (table is never populated — its only writer has no live caller).

## 2026-07-01 — Coach Value Pack verification pass (31-agent adversarial review of the 8-feature build)

The 8 coach-facing features (print pace sheets, youth-guardrail banner, provenance panels, training groups, proof ledger, lineup optimizer, free Event Finder, paste-a-roster + meet results) were reviewed before commit; 24 findings confirmed → all fixed. Verified: 37/37 feature probes, 14/14 forecast probes, 31/31 benchmarks, JS parses, no dup IDs.

- **✅ BUG-021 · Meet-paste corruption family (P1).** Athletic.net/Hy-Tek rows lead with a PLACE column: "1." parsed as a 1-second race time and "1" as raceDate 2001-01-01 (via `_normDate`'s `new Date()` fallback — grades hit it too), silently overwriting real PRs / expiring PR freshness on Apply. Also no time-plausibility guard ("4.38" for 1600m → 4.38-second PR, the exact case `plausibleTime` guards in file import) and prelims/finals duplicates applied in paste order (slower prelim overwrote faster final). **Fix:** leading-place stripping, date-token shape guard, the same >12 m/s plausibility rule (flagged rows shown as skipped, never applied), fastest-per-athlete+event dedupe.
- **✅ BUG-022 · Name matching misses (P2).** "Jordan T" never matched "Jordan Torres" (no initial support) and "José" never matched "Jose" (diacritics stripped, not folded). Both fixed; ambiguous matches still refuse (never update the wrong kid).
- **✅ BUG-023 · Print pipeline (P2).** Marathon/Half pace cards printed 42/21-column split tables off the page and non-unit distances (1500m, 2 Mile, Half, Full) never tiled to the goal time — segments now cap ≤10 columns with an exact-remainder Finish column. "0:00" athlete crashed the whole batch print (null-guarded); skipped no-PR athletes now toasted; print CSS targeted wrong overlay ids; Event Finder "Save as PDF" printed dark-theme vars (invisible on paper) — dedicated clean sheet.
- **✅ BUG-024 · Free-tier print bypass + screen/paper mismatch (P2).** `printGroupSheets` clustered the FULL roster while the screen caps free coaches at 6 — printed groups didn't match the screen and the Pro upsell was bypassed. Now mirrors renderSquads exactly.
- **✅ BUG-025 · Group sheets all-dash rows + env drift (P2).** A sprint-primary athlete admitted to a group via their 1600m+ PR printed an all-dash row (splits computed off the sprint anchor) — now anchored from their nearest distance PR (`_distanceAthleteView`). Group targets also ignored temp/altitude correction that the pace card and split table apply — same-day handouts no longer contradict.
- **✅ BUG-027 · Long-forecast blowup from sub-1.0 fatigue exponents (P1, Anthoney-flagged).** An athlete with a soft short PR (2:50 800 next to a 5:09 1600 / 10:02 3200) measured personal k=0.962 — accepted by the old `k > 0.95` bound — and k<1 means "pace improves with distance," so the half-marathon forecast came out **1:07:07 (faster pace than his own mile PR)** with a 58:15 aggressive bound. **Fixes:** (1) k bound raised to (1.005, 1.20) — a measured sub-1 k is a soft-PR/event-fit signal, not a fatigue curve; (2) personal-curve weight now fades outside the athlete's measured PR span (halved per doubling beyond it — a curve fit on 800–3200m nudges a 5K, never dictates a half); (3) physical floor: no forecast (or aggressive bound) may be faster pace than a *pace-consistent* shorter observed PR (contradicted soft PRs excluded so they can't drag long forecasts slower). Screenshot athlete now: 5K 16:10 · 10K 33:43 · HM 1:15:27 (aggr 1:06:09), confidence unchanged (29%). Engine version bumped to `ensemble-2026-07-01-kfloor-spanfade`. Verified: 31/31 benchmarks, 13/13 new athlete probes, 14/14 forecast probes, 37/37 feature probes.
- **✅ BUG-026 · Honesty details (P3).** Proof ledger excluded near-duplicate self-tests (1600↔Mile predicted each other at ~0.1% error, inflating the headline); lineup no longer benches an athlete's observed PR for a near-tie forecast (confidence-discounted values); `pk.nPRs` undefined in provenance; paste header heuristic swallowed athlete #1 of name+grade rosters; dead `forecastProvenance` wired into the predictive table.

- All 4 frontend `.rpc()` names exist as migration functions; all 6 `.from()` targets exist.
- Auth wiring (`getSession` → `access_token` → `Authorization: Bearer`) is correct on every edge-function call.
- `apply_stripe_subscription` RPC signature matches the webhook's call exactly.
- No secret keys in client config. No duplicate element IDs. JS parses cleanly.
- Strava token refresh logic (60 s skew, refresh-token rotation) is correct.
- RLS policies cover coach-owns-data and athlete-self-access paths consistently.

## 2026-06-10 — Prediction accuracy audit (5 fixes shipped)

1. **P0 — VDOT unit bug** (`danielsPctVO2`): the %VO2max formula expects minutes but was fed seconds, so `pct` collapsed to 0.8 for any race >5 min. A 20:00 5K showed VDOT 59.3 instead of 50.0; every training pace (E/M/T/CV/I/R) was 10–19% too fast. Fixed by converting to minutes inside the function. (`_formulaVDOT` in the ensemble already used minutes and was unaffected.)
2. **Cameron formula was fake**: the "published constants" exponent always clamped to 1.04. Replaced with Cameron's actual 1998 model `f(x)=13.49681−0.048865x+2.438936/x^0.7905` (x in miles).
3. **Vickers-Vertosick implemented backwards**: V&V found Riegel is too *optimistic* at the marathon (real times slower), but the code used a *lower* exponent (1.04), making marathon predictions even faster. Now uses 1.065/1.075/1.10 keyed to the longer distance.
4. **OBSERVED_RATIOS were impossible**: RunRepeat population averages compare different populations per event; the ratios implied fatigue exponents <1.0 (marathon pace faster than 5K pace) and nudged long predictions absurdly fast (30% blend weight). Replaced with Daniels equivalent-performance ratios (VDOT 50 row): 2.073 / 4.591 / 9.565 / 2.215 / 4.614 / 2.083.
5. **Short-event exponents**: flat ~1.06 power laws underpredict times below 3200m. `_formulaPurdy` is now a segmented speed-endurance curve (k=1.03 at 100–200 → 1.18 at 400–800 → decaying to 1.06 past 3200m), path-consistent across bands, and sprint/hybrid ensemble weights were rebalanced toward it.

Benchmarks after fix (node, extracted inline JS): VDOT(5K 19:57)=50.0, VDOT(10K 41:21)=50.0; 5K 19:57 → 10K 41:35 / HM 1:32:43 / M 3:20:49 (between Daniels equivalence and V&V reality — intended); 400 52s → 800 1:55; 800 2:00 → 1600 4:21; 200 24.0 → 400 53.5.

## 2026-06-10 — Engine upgrades (phase 2)

- **Regression benchmarks**: `Predictive_Model/prediction_benchmarks.js` extracts the live engine from index.html and asserts 29 calibration checks (VDOT tables, equivalence charts, invariants, invalid-time rejection, speed-percentage pace math, expanded event support, and target-result leakage). Run `node Predictive_Model/prediction_benchmarks.js` before any deploy touching the engine. Currently 29/29 pass.
- **Personal fatigue curve strengthened**: blend weight now scales with evidence — 1 PR pair = 60%, 2+ pairs = 80% (was fixed 60%); applies to any ≥400m pair, surfaced in the UI banner and per-row reasons.
- **Youth adjustment**: athletes <18 get widened ranges (×1.25; ×1.5 if ≤14) and reduced confidence, with an explicit reason tag. Point estimate unchanged (no validated directional correction).
- **Volume-aware long predictions**: Vickers exponent now interpolates on weekly mileage (marathon: 1.15 @ ≤10 mi/wk → 1.07 @ ≥70; default 1.10 unknown), per V&V's actual model. Threaded via `strideEnsemble(..., { weeklyMiles })`.
- **Prediction logging (data flywheel)**: new `prediction_log` table (migration `20260610120000`, append-only, RLS, doc-verified only — apply to staging first). `logPredictionSnapshot()` fires on athlete save, deduped by input signature in localStorage. Current engine version tag: `ensemble-2026-06-20-source-excluded`.
