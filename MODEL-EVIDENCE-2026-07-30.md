# STRIDE prediction engine — evidence pass, 2026-07-30

**Trigger.** The in-app Proof Ledger showed Riegel (1977) at 10.7% mean error vs STRIDE's
13.3% on a coach's roster. Verdict: the complaint was correct, the cause was real, and the
screenshot was *also* a statistics bug. Both are fixed. One gap is NOT fixed and is flagged
at the bottom — read that section before making any public accuracy claim.

Oracle for everything below: `node Predictive_Model/moat_backtest.js`
(292 held-out single-anchor predictions + 165 leave-one-out ledger-style folds, 21–23 real
athletes, `Data_Validation/`). Re-run it before changing any weight in this document.

---

## 1. What was actually wrong

**(a) The screenshot was noise presented as a verdict.** Three hold-out tests on one athlete.
A 2.6-point gap on n=3 is not separable from zero in either direction. The ledger printed it
as a scoreboard with a ★ next to Riegel.

**(b) The ensemble's weights were hand-set and pointed the wrong way.** The distance-family
prior put **50% of its weight on Riegel + Vickers — the two worst members on the corpus**
(median error 1.72% and 1.90%), and **zero** on Purdy (1.27%). A fixed convex blend that
overweights its worst members can be beaten by any single member, on any roster. Nothing in
the engine had ever measured which formula fits which athlete.

**(c) The shipped forecast was overriding its own ensemble.** `raceForecastForTarget` blended
the athlete's personal fatigue exponent in at up to **80% weight**, unconditionally. On the
corpus personal-k is the second-worst model available (median 1.94%). Measured effect: the
bare ensemble scored 1.53% median, the shipped path 1.62% — the "personalization" was making
forecasts worse, and coaches were seeing the worse number.

## 2. What changed

| Change | Why |
|---|---|
| Distance-family prior re-derived from measured error | Inverse median-error⁴ over the 165-fold corpus, rule selected under leave-one-**athlete**-out CV. Reproduced on every oracle run (§3b) and locked: if the shipped weights drift >0.08 from their derivation the backtest **fails**. Applies to the **1500m–10K branch only** — the 10K+ and sprint branches are judgment calls, not derived (§3c). |
| Per-athlete adaptive stacking (`_adaptiveEnsembleWeights`) | Members are scored leave-one-out on the athlete's *own* PRs and re-weighted by inverse squared error, shrunk toward the prior (τ = 3 pseudo-folds). **A tested heuristic, not a theorem** — see §3a for its measured (currently near-zero) effect. |
| Personal-k demoted from override → ensemble member | It now competes on measured accuracy instead of taking 80% by assumption. |
| Critical-velocity family added (`cv`, `tinman`) | Answers "how do we compare to Tinman" — see §4. |
| Abstention renormalization in `strideEnsemble` | A model that abstains (CV at sprint distances, Cameron below 400m) is dropped and remaining weights renormalized, instead of silently shrinking the prediction. |
| Ledger statistical honesty layer | Paired bootstrap **clustered by athlete** (tests from one runner are not independent observations — resampling them individually is pseudoreplication and manufactures confidence), plus hard floors of 8 tests **and 3 independent athletes** before *any* verdict, ★, "best model" badge or winner highlight appears — in either direction. |
| `PREDICTION_ENGINE_VERSION` bumped | `ensemble-2026-07-30-stacking-cv-tinman`. Forecasts changed, so the calibration key must move with them. |

**Leakage rule.** The PR being predicted is never in the fitting set. The ledger already hands
the engine an athlete with that PR removed, so ledger scoring is *nested* leave-one-out: the
weights that produced a held-out prediction never saw it. Probed in `tests/engine-probes.mjs`.
Widening that set would improve the scoreboard and improve nothing on race day.

## 3. Measured result

| | before | after |
|---|---|---|
| Mode A median \|%err\| | 1.2% | **1.1%** |
| Mode A mean | 1.6% | **1.5%** |
| Mode A within 1% | 42.1% | **46.6%** |
| Mode A within 2% | 72.3% | **73.3%** |
| Mode A within 3% | 86.3% | **87.7%** |
| Mode B (ledger path) median | 1.5% | **1.3%** |
| Mode B mean | 1.8% | **1.7%** |
| Mode B within 2% | 64.2% | **70.3%** |
| vs Riegel, relative | 33% better | **41% better** |

Tests: 69 benchmarks + 93 engine probes + 38 coach-brief + 25 navigation — all passing.

### 3a. Ablation — adaptive stacking is implemented, but currently near-inert

`moat_backtest.js` now runs the shipped path with `ADAPTIVE_STACKING_ENABLED` forced false:

| | median | mean |
|---|---|---|
| stacking ON | 1.3% | 1.7% |
| population prior only | 1.3% | 1.7% |
| **effect** | **+0.02pp** | **+0.01pp** |

**Honest reading: on this corpus the stacking layer does essentially nothing.** It needs an
athlete with 3+ *remaining* PRs to engage, and only 15 of 165 folds qualify. The measured gains
in §3 come almost entirely from the re-derived prior and removing the personal-k override — not
from adaptation. The layer is leakage-safe and probed, and it is the only mechanism that could
ever make STRIDE track the best model *per kid*, but **it must not be marketed as a working
differentiator until a corpus with deeper per-athlete PR histories shows it paying.** If it
never pays, turn it off at `ADAPTIVE_STACKING_ENABLED` rather than defending it.

### 3b. Reproducibility

Every claim about the prior is re-derived on each `moat_backtest.js` run: per-member errors,
the competing weighting rules scored under leave-one-athlete-out, the resulting weight vector,
and an automatic comparison against what `_ensembleWeights` actually ships. Hand-editing the
prior without re-deriving it fails the run.

### 3c. What is NOT derived

The **sprint** (≤400m), **hybrid** (400–1500m), **long-distance** (10K+) and **ultra** branches
of `_ensembleWeights` were not touched and are not evidence-derived — the corpus has no sprint
folds and almost nothing above 10K. They remain hand-set judgment calls from the BUG-029/030
work. Do not describe the ensemble as "measured" without this caveat.

**Rejected on evidence, recorded so nobody re-tries it:** an IRLS soft-trim robust combiner
looked better in isolation (p90 error 3.79% → 3.28%) but was *worse* through the shipped path
(within-2% 73.3% → 71.6%, cross-family median 1.2% → 1.6%). Binned priors (domain × distance
ratio) overfit — LOO median 1.36% → 1.45%. Isolated-member experiments are not the oracle.

## 4. Tinman / critical velocity — the honest answer

Tom Schwartz has **never published his calculator's coefficients**; the competitive analysis
on file confirms the formula is proprietary. So StrideOS does not claim to reimplement it.
What is published is the critical-speed model his method rests on — `d = CV·t + D′`
(Hill 1993; Jones & Vanhatalo 2017) — and both forms now ship and are scored in the ledger:

- **`CV-fit`** — CV and D′ fitted by OLS to the athlete's own PRs (genuinely 2-parameter).
- **`CV-anchor`** — single-anchor version with population D′ = 200 m, labeled
  *"after Schwartz / Tinman"*, never as his calculator.

**Corpus result (165 folds):** CV-anchor median **1.72%**, CV-fit **2.38%** (n=55) — versus
STRIDE's 1.32%. **The CV/Tinman branch is not better than STRIDE; it ties plain Riegel.**
It stays in as a ledger competitor and a stacking member so the comparison is on the record
and can be re-run any time, not because it wins.

## 5. ⚠️ OPEN — the claim that is NOT yet supported

On this corpus, **STRIDE does not dominate every model on every metric**, and no honest
weighting made it:

| model | median | mean | p90 | p95 | ≤2% |
|---|---|---|---|---|---|
| **STRIDE** | 1.32% | **1.67%** | **3.79%** | **4.84%** | 70% |
| Daniels VDOT alone | **1.19%** | 1.85% | 4.63% | 6.71% | **73%** |
| Cameron alone | 1.24% | 1.68% | 3.99% | 5.12% | **73%** |
| Purdy-style alone | 1.27% | 1.65% | 3.37% | 4.64% | 71% |
| Riegel | 1.72% | 2.50% | 5.75% | 7.92% | 55% |
| CV / Tinman | 1.72% | 2.37% | 4.39% | 7.70% | 56% |

Read plainly: **for single-anchor 1500m–10K predictions, plain Daniels VDOT is already about
as accurate as anything, and blending cannot beat it by much on typical error.** Where STRIDE
is legitimately and measurably ahead is:

1. **Blow-ups.** p95 error 4.84% vs VDOT's 6.71% and Riegel's 7.92% — ~30–40% better worst
   case. Coaches lose trust on the bad miss, not the median.
2. **Coverage.** VDOT and Cameron are invalid or abstain outside their domains; STRIDE covers
   100m → marathon and cross-domain, which is what a track & XC roster actually needs.
3. **Per-athlete adaptation** — as *architecture*, not yet as a measured win. See §3a: the
   layer exists, is leakage-safe, and is currently near-inert on this corpus. Do not sell it.

Getting a defensible "beats every model on every metric" claim needs **more data, not more
math** — the corpus is 21–23 athletes, skewed elite, and only 15 folds have enough PRs for the
stacking layer to engage at all. Anthoney's own roster errors (~13%) are ~10× the corpus
median, which strongly suggests the validation set does not represent real HS rosters.

**Marketing copy must not claim STRIDE beats VDOT on accuracy.** The supportable claims today
are the tail-risk, coverage, and per-athlete-adaptation ones above, plus "41% more accurate
than the Riegel formula every free calculator uses" (292 held-out predictions, 23 athletes).
