# StrideOS — Moat Evidence (held-out backtest)

**Date:** 2026-06-30 · **Updated 2026-07-19** (math audit BUG-035/036 + two codex review cycles): the harness now runs TWO modes — **Mode A**, the single-anchor shipped path (ensemble + the ≥3000m equivalent-performance nudge; exactly what a single-PR athlete's coach sees), and **Mode B**, Proof-Ledger-STYLE leave-one-out through `raceForecastForTarget` with the ledger's eligibility rules applied (near-duplicate pairs skipped, all three models must produce a time) — separate code from `computeProofLedger`, so ledger-style, not verified line-for-line parity. Sample stated honestly: Mode A = 292 *ordered predictions* over ~146 unique event pairs (both directions scored) from 23 athletes / 79 athlete-seasons; Mode B = 165 eligible folds, of which only the **56-fold personal-k-active cohort (9 athletes — folds where `personalFatigueExponent` actually engages)** may back personalization claims. Units are "predictions"/"event pairs" — never "races" or "runners." · **Script:** `Predictive_Model/moat_backtest.js` (`node Predictive_Model/moat_backtest.js` — cohort counts are assertion-locked)

## Why this exists
The "superior predictor" claim had only ever been checked against **published equivalence tables** + coach eyeball — and the eyeball *failed live* (Doug rejected real outputs). That's not proof. This harness does the real test: take **real athletes** who ran ≥2 different events in the **same season**, hide one race, predict it from the other with the **live StrideOS engine** (extracted from `index.html`, same mechanism as the regression benchmarks), and compare the error to a **naive Riegel-1.06 baseline** — the commodity formula every free calculator uses.

## Method
- **Data:** `Data_Validation/hs_to_college_pipeline.csv` + `elite_career_arcs.csv` (athlete-keyed, multi-event: HS→college pipeline athletes like Katelyn Tuohy/Nico Young, plus elite arcs like Ingebrigtsen/Kipchoge).
- Grouped by **(athlete, year)** to control for fitness drift; kept the PR per distance; formed every ordered pair of distinct distances → predict one from the other.
- XC events excluded (variable course distance). **292 ordered held-out predictions (~146 unique event pairs — every unordered pair is scored in both directions, and the two directions' errors correlate r≈0.94, so the effective sample is ~146) from 23 athletes / 79 athlete-seasons.**
- Metric: absolute % error on the hidden race. Mode A: StrideOS **single-anchor shipped path** (ensemble + the ≥3000m equivalent-performance nudge) vs Riegel `t₂ = t₁·(d₂/d₁)^1.06`. Mode B: **Proof-Ledger-style leave-one-out through `raceForecastForTarget`** (ledger eligibility: near-duplicate pairs skipped, three-model validity required) vs Riegel *given the same nearest anchor* (a deliberately stronger baseline than a coach's actual single-formula use); multi-PR folds reported separately.

## Result — Mode A (re-run 2026-07-19, single-anchor shipped path, post-BUG-028..030 fixes)
| Metric | StrideOS | Riegel-1.06 |
|---|---:|---:|
| median \|%err\| | **1.2%** | 1.9% |
| mean \|%err\| | **1.6%** | 2.5% |
| within 1% | **42%** | 30% |
| within 2% | **72%** | 52% |
| within 3% | **86%** | 68% |
| **beats Riegel** | **210/292 (72%)** | — |

**By event-distance gap** (where an energy-system-aware engine should help most):

| Gap | StrideOS median | Riegel median | n (ordered) |
|---|---:|---:|---:|
| near (<2×) | 1.3% | 1.3% | 88 |
| mid (2–4×) | **1.2%** | 2.1% | 184 |
| far (≥4×) | **0.7%** | 2.2% | 20 |

**Result — Mode B (2026-07-19, Proof-Ledger-style leave-one-out through `raceForecastForTarget`, ledger eligibility applied):**
- **All 165 eligible folds** (21 athletes; personal-k inert in most): median |%err| **1.5%** vs **1.7%** for Riegel *given the same nearest anchor*, wins **111/165 (67%)**.
- **Personal-k-active cohort — the only cohort that may back personalization claims** (folds where `personalFatigueExponent` actually engages: ≥2 remaining PRs ≥400m, distance ratio ≥1.3, k within bounds, ≥400m target/anchor): **56 folds from 9 athletes** — median **1.5% vs 1.5% (tie)**, mean **1.6% vs 1.9%**, within-2% 64% vs 59%, wins **32/56 (57%)**. On THIS cohort the median advantage disappears; the edge is in the mean/tails and win rate only.
- The margins are narrower than Mode A because this Riegel baseline also benefits from nearest-anchor selection, which no free calculator actually does — and the personal-k cohort is small AND median-tied: personalization is a *hypothesis the data doesn't contradict*, not a demonstrated accuracy advantage. The at-scale re-run (roadmap C1/C3) is what can settle it.

**Verdict:** StrideOS median error is **~33% lower** than the commodity formula (Mode A), the shipped forecast path also leads an anchor-matched Riegel across all eligible folds (Mode B: 1.5% vs 1.7%, 67% wins), and the advantage **widens with event distance** — at near gaps the two tie (Riegel is fine for adjacent distances), at mid gaps StrideOS pulls clearly ahead. ⚠️ Small-cohort warnings: the far (≥4×) band is only **10 unique pairs from 6 elite athletes**, and on the personal-k-active cohort (**56 folds / 9 athletes**) the median TIES an anchor-matched Riegel (edge in mean/tails/win-rate only) — quote Mode A's mid-gap number publicly and do NOT claim a measured personalization accuracy advantage until the at-scale re-run.

## Honest caveats (don't oversell)
1. **Same-season cross-event, not true future prediction.** This proves better *cross-event equivalence* on real athletes — not "predicts next season's race." That's the multi-event differentiator, which is the right claim, but state it precisely.
2. **Sample skews elite/sub-elite** (pipeline + elite arcs), not the everyday HS roster a coach actually has. The everyday-athlete case is the one to confirm next.
3. **The honest n is ~146 unique pairs from 23 athletes** — meaningful, not definitive. Enough to say "beats the commodity formula on real data," not "validated at scale." Never say "290+ runners" — the runner count is 23.
4. **Confidence bands are still uncalibrated** (`rangeMethod: heuristic_..._uncalibrated`). Point estimates beat Riegel; the *ranges* haven't been checked against observed error yet (roadmap C2).

## Next step (roadmap C1/C3)
Rebuild ingestion to **MileSplit (HS) + TFRRS (college)** and re-run this at scale on everyday-athlete rosters + a true *next-race* holdout. That converts "beats Riegel on ~146 elite pairs" into "validated predictor for the coaches actually buying." Until then, lead the pitch with: **(a)** this ~33%-better-than-commodity result, stated with its caveats, and **(b)** the roster/lineup workflow — the moat is the in-season ritual, not just single-pair accuracy.
