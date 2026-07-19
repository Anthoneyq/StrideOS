# StrideOS Math Audit — 2026-07-19

**Scope:** full mathematical audit of index.html (engine + display), Predictive_Model scripts, and Model_Docs claims. Four parallel auditors (prediction model · time/units · aggregation/scoring · backtest/validation), every finding proven numerically against the live engine (extracted via the same VM harness `prediction_benchmarks.js` uses; 31/31 benchmarks green before and during audit). Parent spot-verified every flagged line against source. No repo files were modified by the audit itself.

**Bottom line:** the core formulas (Riegel, Cameron 1998, Daniels-Gilbert VDOT, Vickers-Vertosick, banded Purdy, ensemble weighting, personal-k, all parsers and sort comparators) are sound, and every prior fix (BUG-005/006/007/015/020/027) is holding. But **10 new confirmed issues** exist — 3 in the prediction engine itself (one a trust-killer in the forecast table), 2 from one repeated median bug, 2 display/date issues, and 3 in the public evidence/validation story.

Ledger entries: **BUG-028 … BUG-037** in `BUGS.md` (all 📝 open).

---

## A. Prediction engine (coach-visible forecast math)

### BUG-028 · P1 · Soft short PR anchors mile-family forecasts — no pace ceiling (trust-killer)
`index.html:8401` (`nearestAnchorForTarget`) + `:5960–5971` (pace floor). The pace-floor logic correctly identifies a "soft" short PR (slower avg pace than a longer PR) and excludes it from the *floor* — but that same contradicted PR still **anchors** every log-nearer target, and there is no symmetric *ceiling* ("forecast may not be slower pace than a longer observed PR").
**Confirmed:** 5K 15:30 primary + one old 800m 2:50 → forecast table shows 1600m **6:09.8 @ 69% confidence** (should be ~4:38 from the 5K; ~92 s wrong), with a physically impossible pace inversion in the same table (1600m 231 s/km above 3000m 179 s/km) and a 1600 forecast 45 s/km slower than the athlete's own observed 5K. Personal-k rescue can't fire (raw k=0.927 < 1.005 bound → null). Mirror image of BUG-027 (floor exists, ceiling missing); residual of the BUG-008/015 anchor family.

### BUG-029 · P2 · Mile (1609m) falls out of the hybrid ensemble branch
`index.html:5697`: `d2 <= 1600` excludes the Mile → 1600m gets the Purdy-weighted hybrid branch, 1609m the flat default. Both render as adjacent forecast rows.
**Confirmed:** 400m 52.0 anchor → 1600m 4:10.8 but Mile **3:58.7** (longer race 12.1 s *faster*); 800m 2:00 → 3.9 s inversion. Also disagrees with the file's own `EVENT_DOMAINS` (middle_distance runs to 1700). Fix: `d2 <= 1609` (or 1700).

### BUG-030 · P2 · No hybrid/distance-anchor → sprint-target weight branch
`index.html:5675–5719`: 800→400, 800→200, 1500→400 all fall to the flat default (Purdy weight 0, VDOT included though invalid at sprint durations) — the segmented sprint curve the code itself documents as correct is unused downward.
**Confirmed:** 800m 2:00 → 400m ensemble 56.1 s vs the engine's own Purdy 53.0 s (NFHS ~53.5). Round-trip 400→800→400 drifts +1.95 s (3.8%) vs 0.10% on 5K→10K→5K. Benchmarks only test upward. Reachable: `buildPreds` shows the 400m card for an 800m primary.

## B. The repeated median bug (one root cause, two surfaces)

### BUG-031 · P2 · Event Fit "median" is the upper-middle prediction — inflates every strength score
`index.html:9225–9226`: `predictions[Math.floor(len/2)]` after sort = the **slower** of the two middles for even counts (any athlete with 3 or 5 PRs → even prediction count). Since `diffPct = (medianPred − pr)/medianPred`, every event's diffPct is pushed positive.
**Confirmed** with the app's own demo athlete (Hannah K., 800/1600/3200): 1600m fit +4.10% "STRONG" under the bug vs +1.45% "BALANCED" with the true median — the evidence-table verdict flips. Blast radius: Event Fit card, the free viral Event Finder, Multi-Event screen. The correct `_med` helper exists at `:6513` unused.

### BUG-032 · P2 · Training-group "median fitness" = upper-middle member
`index.html:7023–7024`: same pattern. Every even-sized group anchors rep targets to the slower middle member.
**Confirmed** end-to-end through `computeTrainingGroups`: 2-member group 18:00/20:00 5K → targets from 20:00 (true median 19:00) — all zone targets ~5% too slow; with the free-tier 6-athlete cap → 3 pairs, **every** group pins to its slower member. Flows into `groupSessionZones`, `renderSquads`, `printGroupSheets`. Fix both with `_med(...)`.

## C. Display / date math

### BUG-033 · P2 · Coach Split Table shows two adjacent "1km" columns
`index.html:4956–4961`: `repLabel(1200)` = `(1.2).toFixed(0)+'km'` = "1km", colliding with the real 1km rep on Tempo/Threshold/CV/Race/VO2 rows. Print-card path labels correctly; only `buildDanielsTable` affected.

### BUG-034 · P2 · UTC/local date mixing — evening off-by-one, two surfaces
(a) `index.html:3824–3837` (`prFreshness`): race dates parse as UTC midnight, "now" is local → from ~6–7 pm CDT a race dated today reads "1 days old" and the 90/365-day freshness boundaries flip an evening early; east of UTC a today-dated race reads **"future / INVALID"** and takes the 2.0× freshness penalty.
(b) `index.html:2142`: workout form default date = `toISOString()` → **tomorrow** every evening US time; an evening run can bucket into next week's mileage (the weekly grouping itself is consistently UTC and fine).

## D. Evidence / validation story (public-claim risk)

### BUG-035 · P1 · Home page claims "290+ real runners" — it's 23 runners
`index.html:8024`. The backtest is **292 ordered pairs from 23 distinct runners** (79 athlete-seasons). Every other doc says "pairs"; only shipped copy says "runners" (~12.7× inflation of the athlete count). Additionally the 292 double-counts: every unordered pair scored in both directions (forward/backward |%err| correlate r=0.941) → effective n ≈ **146 unique pairs**. Headline conclusion survives (≈106/146 wins vs Riegel, p<1e-6), but MOAT_EVIDENCE's "n=292" caveat reasons from the inflated n, and the "advantage widens ≥4× distance" claim (0.5% vs 2.2%) rests on **10 unique pairs from 6 elite athletes** (disclosed as n=20 in the table, leaned on in SUPERIORITY / FOUNDING-COACH-OUTREACH).

### BUG-036 · P2 · Backtest validates a different engine than coaches see
`moat_backtest.js:49` scores bare `strideEnsemble`; the shipped forecast (`raceForecastForTarget`, `index.html:5947–5951`) additionally applies the 30% OBSERVED_RATIOS nudge (≥3000m), up to 80% personal-k blend, and the pace floor. Replaying all 292 pairs with the nudge active: **58 predictions change; their median |%err| worsens 1.011% → 1.082%** (overall 1.220 → 1.247). The site's accuracy numbers describe a component, not the product — and the nudge measures net-negative on the validation data. Decide: backtest the full path, or drop/retune the nudge.

### BUG-037 · P3 · Latent reciprocal-model trap under the dead VDOT zone path
`index.html:3893` (`vdotPctForZone`) inverts with the reciprocal speed-% model that BUG-005 explicitly removed from `pctToMult` (Canova `2 − pct/100`). Currently masked because BUG-014's units bug (`vToSpkm` returns min/km, `:3444`) keeps the whole path dead for every athlete/zone. **If anyone fixes the units alone, Easy pace jumps ~29 s/mi too fast.** The self-consistent inverse is `pct = 100·(2 − target/race)`. Fix both together or neither.

## E. Minor (grouped, no ledger numbers)
- `fmtT` floors seconds above 1 h but rounds below (`:3344`): 3659.94 → "1:00:59" vs nearest 1:01:00; ≤1 s.
- `fmt400(149.9)` → "60.0/400" (`:3388`) — seconds-count formatter missed by the BUG-006/007 carry sweep; cosmetic.
- `parseDurationToSec` (`:2229`) accepts "1:75"→135 s and "1a:30"→90 s (parseTime rejects both) → lenient values feed avg pace. Validation asymmetry.
- `_normDate` fallback (`:8189`) local-parse → UTC-print shifts dates a day east of UTC only; US unaffected; BUG-021 shape guard limits exposure.
- Chart hover snaps 1609 → "1600m" label (within designed 2.5% tolerance).
- `collectAllPRs` hard-codes `raceDate:null` for additional PRs → all additional-PR anchors score freshness "unknown" (−7.5 conf pts). Data-model limitation.
- Proof-ledger tie handling: `<=` counts exact ties as STRIDE wins; display-only star asymmetry. Negligible.
- `altitudeCorrection` mixes a 1500-ft guard with a 500-m band — the 457–500 m gap returns 0 either way; dead check only.

## F. Docs / legacy hygiene
- **`diagnosis.py` is legacy and internally broken** — mark superseded, never cite: hard-coded "KEY FINDING" exponent ranges contradict its own computed table (e.g. 200→400 computed 1.173 vs claimed 1.10–1.13); its "coach validated" reference data is physically impossible (3K slower pace than 5K, k=0.990<1 — violating the invariant the shipped engine enforces); its Section-5 "validation" is circular (scores the model against the hand-authored dictionary it was fit to); its zone-exponent transfer has +15 s discontinuities at 1-meter boundaries (the exact flaw shipped `_formulaPurdy` fixed).
- Model_Docs/04 §11 confidence labels (85/70/55/40) ≠ shipped thresholds (90/75/55/35/15) — cosmetic.
- Model_Docs/04 vs 01 contradict each other on decay-half-life ordering, and neither is shipped (product uses categorical 90/365-day freshness, no exponential decay). 04 §correlation bands are inconsistent with its own stated γ range.
- Backtest data: one meet label misattributed (no numeric effect); 1 duplicate row absorbed by dedupe; `parseTimeSec` in the harness is laxer than shipped `parseTime` but no offending rows exist in the CSVs.

## Verified sound (what coaches can trust)
Riegel/Cameron/VDOT/Vickers/Purdy implementations (incl. bisection direction, minutes-unit fix, band integration, inverse symmetry); all 6 ensemble weight branches sum to 1.0; ensemble averages times (not paces); personal-k formula + (1.005,1.20) bounds + span-fade + pace floor (BUG-027 athlete reproduces recorded post-fix values); freshness affects only range/confidence, never the central estimate; confidence clamps; no NaN/div-zero on any reachable pair tested; scenario compounding `(1−m)^t`; lineup optimizer comparator precedence, benchmark normalization, caps, and the BUG-026 confidence discount; proof-ledger hold-out MAPE math incl. near-duplicate exclusion; every `.sort` on times/distances is numeric (no string-time sorts anywhere); `parseTime` rejects negatives/"1:75"/"0" (DNF can never win a PR); `plausibleTime` 12 m/s guard; meet-results improvement math + dedupe; weekly-mileage aggregation + UTC-consistent Monday bucketing; `_avg`/`_med` themselves; env-correction direction/application; per-mile 1609.34 everywhere with 1600≠Mile≠3200≠2-Mile kept distinct; **MOAT_EVIDENCE numbers all reproduce exactly from the script today** (1.2 vs 1.9 median, 73%, 35% ≡ 34.8%, all bands); no strict target leakage; no near-duplicate self-test pairs in the backtest; benchmark harness tests shipped code by construction.

## Recommended fix order
1. **BUG-035 copy** ("290+ real runners" → "292 held-out race pairs" or "23 elite careers, 292 predictions") — public factual claim, one line, pre-outreach.
2. **BUG-028 pace ceiling** — the forecast-table trust-killer; add the symmetric ceiling + exclude contradicted PRs from anchoring (or fade them like span-fade does).
3. **BUG-031/032** — two one-line `_med()` swaps.
4. **BUG-029** — one-character boundary fix (`<= 1609`).
5. **BUG-033** — label 1200 as "1200m".
6. **BUG-034** — pick one clock (UTC) for freshness day-math; local date for the workout default.
7. **BUG-030** — add the downward weight branch + a reverse-direction benchmark.
8. **BUG-036** — decide: backtest full forecast path vs drop/retune the ratio nudge; then restate n honestly (146 unique pairs, 23 athletes) in MOAT_EVIDENCE + copy.
9. **BUG-037** — comment/ledger guard so a future "fix" of the dead VDOT path doesn't ship the reciprocal model.

Any engine change must re-run `node Predictive_Model/prediction_benchmarks.js` (31/31) + `moat_backtest.js`, and add: a ceiling probe (BUG-028 athlete), a Mile/1600 adjacency probe, a downward 800→400 probe, and even-count median probes.
