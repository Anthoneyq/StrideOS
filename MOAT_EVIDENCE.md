# StrideOS — Moat Evidence (held-out backtest)

**Date:** 2026-06-30 · **Script:** `Predictive_Model/moat_backtest.js` (`node Predictive_Model/moat_backtest.js`)

## Why this exists
The "superior predictor" claim had only ever been checked against **published equivalence tables** + coach eyeball — and the eyeball *failed live* (Doug rejected real outputs). That's not proof. This harness does the real test: take **real athletes** who ran ≥2 different events in the **same season**, hide one race, predict it from the other with the **live StrideOS engine** (extracted from `index.html`, same mechanism as the regression benchmarks), and compare the error to a **naive Riegel-1.06 baseline** — the commodity formula every free calculator uses.

## Method
- **Data:** `Data_Validation/hs_to_college_pipeline.csv` + `elite_career_arcs.csv` (athlete-keyed, multi-event: HS→college pipeline athletes like Katelyn Tuohy/Nico Young, plus elite arcs like Ingebrigtsen/Kipchoge).
- Grouped by **(athlete, year)** to control for fitness drift; kept the PR per distance; formed every ordered pair of distinct distances → predict one from the other.
- XC events excluded (variable course distance). **292 held-out pairs.**
- Metric: absolute % error on the hidden race. StrideOS `strideEnsemble` vs Riegel `t₂ = t₁·(d₂/d₁)^1.06`.

## Result (2026-06-30)
| Metric | StrideOS | Riegel-1.06 |
|---|---:|---:|
| median \|%err\| | **1.2%** | 1.9% |
| mean \|%err\| | **1.7%** | 2.5% |
| within 1% | **42%** | 30% |
| within 2% | **72%** | 52% |
| within 3% | **85%** | 68% |
| **beats Riegel** | **213/292 (73%)** | — |

**By event-distance gap** (where an energy-system-aware engine should help most):

| Gap | StrideOS median | Riegel median | n |
|---|---:|---:|---:|
| near (<2×) | 1.3% | 1.3% | 88 |
| mid (2–4×) | **1.2%** | 2.1% | 184 |
| far (≥4×) | **0.5%** | 2.2% | 20 |

**Verdict:** StrideOS median error is **35% lower** than Riegel, and the advantage **widens with event distance** — at near gaps the two tie (Riegel is fine for adjacent distances), but at mid/far gaps StrideOS pulls clearly ahead. That is *exactly* the differentiated claim: it reasons across an athlete's event range instead of applying one fixed exponent. This is genuine, defensible evidence for a founding-coach pitch.

## Honest caveats (don't oversell)
1. **Same-season cross-event, not true future prediction.** This proves better *cross-event equivalence* on real athletes — not "predicts next season's race." That's the multi-event differentiator, which is the right claim, but state it precisely.
2. **Sample skews elite/sub-elite** (pipeline + elite arcs), not the everyday HS roster a coach actually has. The everyday-athlete case is the one to confirm next.
3. **n=292 is meaningful, not definitive.** Enough to say "beats the commodity formula on real data," not "validated at scale."
4. **Confidence bands are still uncalibrated** (`rangeMethod: heuristic_..._uncalibrated`). Point estimates beat Riegel; the *ranges* haven't been checked against observed error yet (roadmap C2).

## Next step (roadmap C1/C3)
Rebuild ingestion to **MileSplit (HS) + TFRRS (college)** and re-run this at scale on everyday-athlete rosters + a true *next-race* holdout. That converts "beats Riegel on 292 elite pairs" into "validated predictor for the coaches actually buying." Until then, lead the pitch with: **(a)** this 35%-better-than-commodity result, stated with its caveats, and **(b)** the roster/lineup workflow — the moat is the in-season ritual, not just single-pair accuracy.
