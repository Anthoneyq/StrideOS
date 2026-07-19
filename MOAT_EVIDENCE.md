# StrideOS — Moat Evidence (held-out backtest)

**Date:** 2026-06-30 · **Updated 2026-07-19** (math audit BUG-035/036: harness now scores the FULL shipped forecast path — ensemble + the ≥3000m equivalent-performance nudge — not the bare component, and the sample is stated honestly: 292 *ordered* pairs = ~146 unique pairs scored in both directions, from **23 athletes** / 79 athlete-seasons) · **Script:** `Predictive_Model/moat_backtest.js` (`node Predictive_Model/moat_backtest.js`)

## Why this exists
The "superior predictor" claim had only ever been checked against **published equivalence tables** + coach eyeball — and the eyeball *failed live* (Doug rejected real outputs). That's not proof. This harness does the real test: take **real athletes** who ran ≥2 different events in the **same season**, hide one race, predict it from the other with the **live StrideOS engine** (extracted from `index.html`, same mechanism as the regression benchmarks), and compare the error to a **naive Riegel-1.06 baseline** — the commodity formula every free calculator uses.

## Method
- **Data:** `Data_Validation/hs_to_college_pipeline.csv` + `elite_career_arcs.csv` (athlete-keyed, multi-event: HS→college pipeline athletes like Katelyn Tuohy/Nico Young, plus elite arcs like Ingebrigtsen/Kipchoge).
- Grouped by **(athlete, year)** to control for fitness drift; kept the PR per distance; formed every ordered pair of distinct distances → predict one from the other.
- XC events excluded (variable course distance). **292 ordered held-out pairs (~146 unique — every unordered pair is scored in both directions, and the two directions' errors correlate r≈0.94, so the effective sample is ~146) from 23 athletes / 79 athlete-seasons.**
- Metric: absolute % error on the hidden race. StrideOS **full shipped forecast path** (ensemble + the ≥3000m equivalent-performance nudge, exactly what a single-PR athlete's coach sees) vs Riegel `t₂ = t₁·(d₂/d₁)^1.06`.

## Result (re-run 2026-07-19, full shipped path, post-BUG-028..030 fixes)
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

**Verdict:** StrideOS median error is **~33% lower** than Riegel, and the advantage **widens with event distance** — at near gaps the two tie (Riegel is fine for adjacent distances), at mid gaps StrideOS pulls clearly ahead. ⚠️ The far (≥4×) band is only **10 unique pairs from 6 elite athletes** — quote the mid-gap number publicly, not the far-gap one. This reasons across an athlete's event range instead of applying one fixed exponent, and it is what the product actually ships, not a component of it.

## Honest caveats (don't oversell)
1. **Same-season cross-event, not true future prediction.** This proves better *cross-event equivalence* on real athletes — not "predicts next season's race." That's the multi-event differentiator, which is the right claim, but state it precisely.
2. **Sample skews elite/sub-elite** (pipeline + elite arcs), not the everyday HS roster a coach actually has. The everyday-athlete case is the one to confirm next.
3. **The honest n is ~146 unique pairs from 23 athletes** — meaningful, not definitive. Enough to say "beats the commodity formula on real data," not "validated at scale." Never say "290+ runners" — the runner count is 23.
4. **Confidence bands are still uncalibrated** (`rangeMethod: heuristic_..._uncalibrated`). Point estimates beat Riegel; the *ranges* haven't been checked against observed error yet (roadmap C2).

## Next step (roadmap C1/C3)
Rebuild ingestion to **MileSplit (HS) + TFRRS (college)** and re-run this at scale on everyday-athlete rosters + a true *next-race* holdout. That converts "beats Riegel on ~146 elite pairs" into "validated predictor for the coaches actually buying." Until then, lead the pitch with: **(a)** this ~33%-better-than-commodity result, stated with its caveats, and **(b)** the roster/lineup workflow — the moat is the in-season ritual, not just single-pair accuracy.
