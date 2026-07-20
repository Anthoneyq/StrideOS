# OBSERVED_RATIOS Nudge — Evidence & Decision File (BUG-036 follow-up, 2026-07-19)

**Decision needed (Anthoney):** keep or drop the equivalent-performance nudge.
**The flip is one line:** `index.html:5821` — `const OBSERVED_RATIO_NUDGE_ENABLED = true;` → `false` drops it.
Default is **true = current shipped behavior** (nothing changes until you flip). Same gate pattern as
`VDOT_ZONE_RECONCILIATION_ENABLED` (index.html:3908). The benchmark suite stays green in **both** states
(verified: 67/67 with true, 67/67 with false; moat backtest cohort asserts pass in both).

## What the nudge is
`raceForecastForTarget` (index.html:6022–6028): when anchor AND target are ≥3000m and the pair
standardizes to one of 5K/10K/HM/M, the forecast is blended 30% toward `anchor_time × Daniels
equivalent-performance ratio` (`OBSERVED_RATIOS`, VDOT-50 row) and 70% toward the ensemble/personal-k
value. Its purpose was table consistency with Daniels equivalence on long events.

## Harness
Replay of `Predictive_Model/moat_backtest.js` (292 Mode-A ordered held-out predictions; 165 Mode-B
ledger-eligible leave-one-out folds through `raceForecastForTarget`, same eligibility rules) with the
nudge weight swept 0.3 (shipped) → 0 (dropped). Sweep script preserved at the session scratchpad
(`nudge_sweep.js`); it reproduced the audit numbers exactly before any code was touched.

## Mode A — single-anchor shipped path (n=292; nudge touches 58)
All 58 nudge-affected predictions are **5K↔10K pairs** (29 unique pairs, both directions) from
**11 athletes** — every one an elite (Wolfe, Mantz, Monson, Valby, Bosley, Bekele, Farah, Cheptegei,
Hassan, Chebet, Tsegay). No HM or marathon pair in the validation data survives the same-season rule,
so the 21097/42195 ratios are **completely untested**.

| weight w | med \|%err\| changed | mean changed | med all | mean all | W/L vs w=0.3 (changed) | wins vs Riegel (all) |
|---|---|---|---|---|---|---|
| **0.3 (shipped)** | 1.082 | 1.156 | 1.247 | 1.617 | — | 210/292 |
| 0.2 | 1.019 | 1.152 | 1.232 | 1.616 | 31/27 | 211/292 |
| 0.15 | 0.998 | 1.151 | 1.229 | 1.616 | 31/27 | 212/292 |
| 0.1 | 0.999 | 1.152 | 1.220 | 1.616 | 30/28 | 214/292 |
| 0.05 | 1.013 | 1.153 | 1.220 | 1.616 | 29/29 | 206/292 |
| **0 (dropped)** | 1.011 | 1.154 | 1.220 | 1.616 | 29/29 | 212/292 |

(Riegel med all = 1.871. With the nudge dropped, headline stays 1.2% vs 1.9%; wins tick 210→212,
within-2% 72.3%→72.6%.)

## Mode B — leave-one-out through raceForecastForTarget (n=165; nudge touches 56)
| weight w | med \|%err\| changed | mean changed | med all | mean all | W/L vs w=0.3 (changed) |
|---|---|---|---|---|---|
| **0.3 (shipped)** | 1.219 | 1.171 | 1.531 | 1.822 | — |
| 0.2 | 1.212 | 1.168 | 1.507 | 1.821 | 29/27 |
| 0.15 | 1.198 | 1.169 | 1.538 | 1.821 | 29/27 |
| 0.1 | 1.168 | 1.170 | 1.570 | 1.821 | 28/28 |
| 0.05 | 1.138 | 1.171 | 1.580 | 1.822 | 27/29 |
| **0 (dropped)** | 1.108 | 1.174 | 1.556 | 1.823 | 27/29 |

## Recommendation: DROP (flip to false), not retune
- Dropping improves the changed-subset median in both modes (A: 1.082→1.011; B: 1.219→1.108) and the
  Mode-A overall median (1.247→1.220); means are flat everywhere (Δ<0.01pp).
- Retuning to w≈0.15 wins the Mode-A changed median (0.998) with 31W/27L — but Mode B favors 0
  monotonically, and every difference here is inside the noise floor. A retained-but-shrunk weight
  keeps an unvalidated mechanism (HM/M ratios never tested) for no measurable gain over dropping.
- Head-to-head at w=0 is a dead-even 29W/29L: the honest claim is "the nudge does not help," not
  "the nudge is harmful." What dropping buys is one less unvalidated component in the shipped path.
- Cost of dropping: the long-event table no longer leans toward Daniels equivalence (the nudge's
  table-consistency value). If that consistency matters to you more than a ~0.07–0.11pp median tick
  on 58 predictions, keeping it is defensible — that is why this is your call, not a bug fix.

## Honest caveats
- The changed cohort is small and narrow: 58 ordered predictions ≈ 29 unique pairs, 11 athletes,
  **100% elite, 100% 5K↔10K**. Nothing here says what the nudge does for a HS athlete or for HM/M.
- 292/165 totals double-count directions (BUG-035 accounting); treat all W/L splits as directional.
- Medians over small n jump discretely (Mode-B "med all" is non-monotonic in w for exactly this
  reason); the means are the stability check and they are flat.

## What is already wired (no further code needed after the flip)
- `index.html:5821` — the flag (default true = shipped).
- `index.html:6022–6028, 6113` — nudge + its reasons line both keyed to `nudgeApplied`.
- `Predictive_Model/moat_backtest.js` — Mode A reads the flag from index.html (ship parity tracks
  whatever you decide); Mode B goes through `raceForecastForTarget` and follows automatically.
- `Predictive_Model/prediction_benchmarks.js` §9 — 8 probes pin BOTH flag states against fixtures
  (off = bare ensemble, on = exact 30% blend incl. marathon wiring, sub-3000m untouched, reasons
  line present/absent) plus a live-engine parity probe, so the suite is green before and after the
  flip and any drift in either behavior fails loudly.
