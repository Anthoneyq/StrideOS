# StrideOS — Master Launch Roadmap (everything to make it the highest-quality coaching tool, then sell)

**Date:** 2026-06-30 · **Updated:** 2026-07-02 · **Author:** Claude (Opus 4.8) · **Status of product:** ~85% built, launch app shell deployed, billing functions redeployed, billing smoke-tested, **0 paid.**

## The honest headline
StrideOS is *not* a "needs more features" problem. The engine and squad analytics are genuinely built and above-commodity. What stands between it and a sellable, high-quality product is four things, in this order:

1. **Trust/correctness bugs the two coaches who love it already caught** — they rejected the actual prediction numbers on real athletes. Nothing else matters until the numbers are coach-credible.
2. **Operator-gated launch actions** — the launch build is live and Supabase migrations/functions are current; Stripe monthly/annual checkout is verified; founding coupon creation and the first paid ask are still operator-gated.
3. **Roster intelligence is the category wedge** — a 2026-07-02 Manus competitive scan reinforced that calculators own individual paces, result sites own data, and coach platforms own logs; StrideOS should own the missing team-decision layer.
4. **The lineup product is still early** — the current app now has a heuristic lineup assignment and print flow, but not the full opponent-aware team-points optimizer that justifies Team/Program pricing.
5. **The predictor moat is partially proven, not finished** — first held-out backtest evidence exists, but confidence bands are still uncalibrated and everyday-HS validation is still needed.

Legend: **P0** = blocks a credible paid launch · **P1** = needed for "highest quality" / the moat · **P2** = scale & polish.

---

## A. TRUST & CORRECTNESS — the coaches already said the numbers are wrong (P0)
*Source: Alex Muntefering + Doug Framke critiques. These are the make-or-break items: the two coaches love the concept but pushed back hard on outputs, and nobody has paid.*

> **Wave 1 progress — 2026-06-30 (code-verified):**
> - **A1 ✅ fixed** (Canova multiplier — the promised easy-pace fix had never shipped; now live in code, 31/31 benchmarks). **Needs browser QA + Alex/Doug re-check.**
> - **A7 ✅ fixed** (rounding/`6:60`).
> - **A5: multi-PR feeding is already wired** (form → `additionalPRs` → `collectAllPRs` → engine). Remaining A5 = *exposing* blended extrapolation in free tier (feature).
> - **A2/A3: likely already present** — `STRIDE_ZONES` (index.html:3210) defines all 11 zones incl. CV 96% + VO2 105%, and presets render at :4058. **Verify in browser** they're all surfaced on the front page; if so, A2/A3 are done.
> - **A4 (multi-distance consistency) is blocked on C1** — can't be fixed by code inspection; needs held-out validation. This is the deepest remaining trust item.
> - **A6/A8 partial** — guardrail + Daniels-named coach-language zones exist (:3226); need surfacing/QA.
> - **Next safe unblocker before deeper engine edits: build F1 (headless test loop).**

- **A1 · ✅ FIXED 2026-06-30 (needs browser QA + coach re-check).** The Canova `2 − pct/100` multiplier promised in the v2 email never actually shipped — `pctToMult` still used the reciprocal `100/pct`, making Easy ≈ 8:17/mi (over-corrected to too slow). Now switched to Canova; zone ladder is coach-sensible (Easy 7:16). Locked with benchmarks (31/31). See BUG-005. *Original finding below.* Zone calibration was shifted up by ~one whole category: Easy pace came out far too hot (6:27/mi for a 16:43 5K runner; both coaches want ~65% ≈ 7:15/mi). Tempo/threshold also too fast. *The v2 email claims this was fixed (Canova `2 − pct/100`, recovery exposed, slider floor 60→50%) — **verify it actually shipped into `index.html` and re-confirm with Alex/Doug.*** Don't assume the email == the code.
- **A2 · Surface the full 9-zone spectrum on the front page** (Recovery, Easy, Steady, Tempo, Threshold, CV, Race, VO2, Speed), one click each, % labeled. Alex's main usability ask; Tinman did this then paywalled it — this is the free wedge.
- **A3 · Add CV (Critical Velocity) and VO2max as explicit zones.** Both coaches use CV; it's Tinman's whole niche. Parity requirement.
- **A4 · Multi-distance predictions are internally inconsistent and not credible.** Doug rejected them on a real athlete: 3200 "way too fast," 800 faster than she could run, half-marathon vs marathon "don't even match." This is the engine's core trust problem — fix internal consistency across the event ladder before selling on prediction.
- **A5 · Multi-PR data isn't actually feeding the model.** Secondary-event times weren't pulled into predictions (Anthoney caught this live). Wire it, then **expose blended multi-PR prediction** — this is the killer feature (see B-block) and currently broken silently.
- **A6 · Age / training-age zone calibration.** Doug's #1 ask: zones must shift by developmental level (MS vs HS vs college; chronological ≠ training age). A guardrail reportedly exists under Advanced Settings — **surface it and default it**, don't hide it.
- **A7 · ✅ FIXED 2026-06-30.** `6:59.5/mi` → `6:60` carry bug. `fmtMile` was already guarded but `displayPace`/`fmtT`/`fmtSplit`/`fmtRepTime`/`fmtOffset` weren't; added carry-safe `_mmss()` helper and routed all through it. Unit-tested; 31/31 benchmarks pass. See BUG-006.
- **A8 · Tooltip/translation layer for zone names** ("fast rep ≈ VO2max," "cruise interval = broken tempo," steady vs easy). Both coaches asked; lets less-expert coaches trust the labels.

## B. THE REAL DIFFERENTIATOR — make roster intelligence the paid habit (P1, the moat)
*The 2026-07-02 market scan confirms the open category: race calculators are individual and single-input, results platforms hold data without coaching intelligence, and training platforms are logs/plans first. StrideOS should turn roster data into decisions. Current code includes a heuristic lineup screen; the remaining moat is a full, coach-trusted scoring workflow.*

- **B1 · Cross-roster lineup / team-points optimizer.** Build beyond the current heuristic assignment: aggregate `buildEventFit` across the roster + district/region rankings → surface scoring moves ("this athlete is slow-for-district at 800 but would *score* in the mile"). Add opponent/team-points context only after the first paid rosters show the needed meet formats. This is the per-meet, in-season ritual and the cleanest B2B bridge ($399 team tier is the natural buyer).
- **B2 · Roster of clickable athlete profiles** from spreadsheet drag-drop import (Doug's "folder of profiles"). Squad import exists; turn it into navigable per-athlete cards.
- **B3 · Competitive/performance curve** with the athlete's own marks + district/conference/national comparison lines (Alex: "competitive is relative to who you're competing against" — also surfaces mis-event-assigned athletes).

## C. VALIDATION & DATA — make the moat claim true (P1)
*The "superior predictor" claim currently rests on published equivalence tables + coach intuition, and the coaches' intuition rejected it. Confidence bands are self-labeled `uncalibrated`.*

- **C1 · ✅ FIRST PASS DONE 2026-06-30.** Built `Predictive_Model/moat_backtest.js` — held-out backtest on **292 real-athlete pairs**: StrideOS median error **1.2% vs Riegel 1.9% (35% better)**, beats Riegel on **73%** of pairs, advantage widest at far event gaps (0.5% vs 2.2%). **Real, defensible moat evidence.** See `MOAT_EVIDENCE.md`. Caveats: same-season cross-event (not next-race), elite-skewed sample, n=292. *Full C1 = scale it via C3 on everyday rosters.*
- **C2 · Calibrate the confidence intervals** against observed accuracy (currently `rangeMethod: heuristic_..._uncalibrated`). Honest, well-calibrated bands are themselves a differentiator — no competitor signals uncertainty.
- **C3 · Rebuild data ingestion to MileSplit (HS) + TFRRS (college).** Current data is thin and state-PR-only; Doug flagged it inaccurate and pointed to MileSplit as the accurate HS source. This data is also what *enables* C1.

## D. LAUNCH OPERATIONS — operator-gated, not code (P0, fast)
- **D1 · Keep the launch build deployed and source synced.** Live `index.html` matched local on 2026-07-02; Supabase migrations are current through `20260702121000`; billing Edge Functions were redeployed. Remaining local changes are docs/config comments/deploy-script hardening until pushed.
- **D2 · Confirm live Stripe Price IDs/coupon before charging.** Verified 2026-07-02: signed-in checkout opens Stripe Checkout for $19.99/mo and $199/yr. Founding checkout still needs `STRIPE_FOUNDING_COUPON` set; otherwise it intentionally stays closed.
- **D3 · ✅ CONFIRMED 2026-07-02.** Supabase `pg_cron` is installed (`1.6.4`) and `expire-trials-daily` is active at `0 8 * * *`, running `select public.expire_trials();`.
- **D4 · Smoke-test the Strava P0 migration** (`20260529173000`, workouts unique index) on staging/prod → connect Strava → Sync Now → re-sync imports 0. The migration is applied; the live behavior still needs an authenticated Strava test.

## E. LEGAL & COMPLIANCE — biggest pre-sale gap (P0 for paid)
- **E1 · Lawyer-review ToS + Privacy Policy.** Drafts exist, explicitly "not yet lawyer-reviewed." You handle **minors' PII** — this is non-negotiable before charging.
- **E2 · Link ToS/Privacy in-app.** Acceptance is recorded (`terms_accepted: true`) but the documents aren't surfaced — coaches are accepting unseen terms.
- **E3 · Build account-deletion + data-export UI.** The RPCs (`request_account_deletion`, `export_coach_data`) exist; there's **no UI**. GDPR/CCPA gap, sharpened by minors' data.
- **E4 · "No ads, never sell athlete data" + minors'-data privacy line on the front door.** Cheap trust signal that closes a hard HS-program objection.

## F. QUALITY, INFRA & POLISH (P1–P2)
- **F1 · Stand up a headless E2E test loop (Playwright).** Today: only Node engine benchmarks + a manual checklist. This is the **unblocker for safe frontend change** — do it before any structural work.
- **F2 · Pre-launch performance pass:** minify, cache headers, lazy-load `xlsx`/`papaparse`, SRI-pin CDN deps. (398 KB unminified single file.)
- **F3 · Onboarding empty-states** for a zero-athlete coach + a visible "trial days remaining" surface (data already in `my_subscription.trial_seconds_remaining`).
- **F4 · Finish the design/motion brief** (Inter body + Fraunces display, count-ups, reduced-motion guard, View Transitions). Builds 1–5 shipped much of this — verify against `DESIGN_AND_FREE_TIER_BRIEF.md` P1/P2 items.
- **F5 · Model the team tier** (`team_annual` currently records as ordinary annual `pro` — BUG-003) before selling team broadly.
- **F6 · Refactor monolithic `index.html`** into modules (auth/billing/predictions/render) — **only after F1 exists.**
- **F7 · Doc/copy sync:** keep price/trial strings aligned across `stride-config.js`, edge-function comments, `Stripe_Setup_SOP.md` (historical Payment Link path is superseded), and `TESTING_PLAN.md`.

## G. GO-TO-MARKET (P0 — runs in parallel with A/D/E)
- **G1 · THE GATE: ask Alex + Doug for a card now** (Founding Coach, annual, lifetime-locked). Per the roast: love ≠ demand, and nobody has been asked to pay. An annual "yes" is the only real WTP proof and should dictate what gets built next.
- **G2 · Keep the pricing ladder clean.** Current decision is $199 standard annual with $149 Founding Coach as lifetime-locked early access; verify the live Stripe IDs match before any paid ask.
- **G3 · Cold-coach onboarding / sample-squad front door.** Mostly built (demo squad + home screen, builds 3–5) — verify it lands value before any ask.
- **G4 · Keep public copy on roster intelligence.** Do not lead with "AI coach" or "pace calculator." The launch line is: race marks + roster data → training groups, event-fit, forecasts, printable sheets, and lineup guidance. See `docs/planning/MARKET_POSITIONING_BRIEF_2026-07-02.md`.

---

## Suggested sequencing (3 waves)

- **Wave 1 — "Earn the right to charge" (1–2 wks):** A1–A8 (trust bugs) → D1–D4 (deploy) → E1–E3 (legal) → G1 (ask the 2 coaches). *Outcome: a deployed, legally-safe build with coach-credible numbers, and a real WTP signal.*
- **Wave 2 — "Build the moat" (2–4 wks):** B1–B3 (lineup/team-points + roster profiles) + C1–C2 (validate + calibrate) + F1 (test loop). *Outcome: the roster-intelligence ritual + a defensible accuracy claim. Let paying rosters dictate scope.*
- **Wave 3 — "Scale & polish":** C3 (MileSplit/TFRRS data), F2–F7, E4. *Outcome: ready for wide launch.*

## Decisions — status (2026-06-30)
1. **Start point: Wave 1 trust bugs (A)** — DECIDED. In progress.
2. **Lineup scope (B1): FULL optimizer** — DECIDED. Cross-roster event-fit + district/region rankings + lineup assignment, built up front in Wave 2 (not the thin slice).
3. **Pricing (G2): decided in `PRICING_STRATEGY.md`** — $19.99 monthly and $199 annual are live-checkout verified; $149 founding remains a coupon-gated offer until Anthoney creates/sets the Stripe coupon.
4. **Validation/data investment** (C1/C3): still open — backtest now vs after first revenue.
5. **Legal spend** (E1): still open — lawyer review before or right after first founding charge.
