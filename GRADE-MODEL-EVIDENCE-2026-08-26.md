# STRIDE grade & surface model — evidence pass, 2026-08-26

**Scope.** This document covers the *grade/surface* model only — the Hills & Treadmill tool
and the Race Command grade signal. It does not cover the race-prediction engine; that
evidence lives in `MOAT_EVIDENCE.md` and `MODEL-EVIDENCE-2026-07-30.md`. Do not quote numbers
across the two.

**Source.** Harvested from an independent research build (the "Running Surface Equivalency
Lab") archived verbatim at `research/surface-lab-2026-08-25/`. That build ran its own
literature sweep and attempted to fit a *new* universal surface formula. It failed, on
purpose, and the failure is the most useful thing in it.

Oracle for everything below: `node tests/grade-model-probes.mjs` (151 probes) and
`node tests/pace-ui-probes.mjs` (27 probes).

---

## 1. Why RE3 is the core model — head-to-head numbers

Four published graded-running equations, scored against Lemire et al.'s speed-specific grade
polynomials on identical observations. Lower is better; units are W·kg⁻¹.

| Domain | n | **RE3** | Minetti | HTK | ACSM |
|---|---:|---:|---:|---:|---:|
| Uphill RMSE | 10 | **0.299** | 0.918 | 1.095 | 2.118 |
| Uphill bias | 10 | **+0.016** | −0.902 | +0.594 | −1.639 |
| Downhill RMSE | 11 | **1.122** | 1.455 | — | — |
| Level RMSE | 4 | 0.830 | 1.041 | 0.597 | **0.291** |

Raw: `research/surface-lab-2026-08-25/lemire_model_benchmark_scores.csv`.

**What this licenses us to say:** on uphill running — the case the tool is actually used for —
RE3 is roughly 3× closer than Minetti, 3.7× closer than HTK, and 7× closer than ACSM, and it
is the only one of the four that is not systematically biased (+0.016 W·kg⁻¹ against Minetti's
−0.90 and ACSM's −1.64). ACSM's large negative bias uphill is the same direction Foreman
(2022) warns about for chart-type conversions at ≥6%, and it is why STRIDE does not use it.

**What this does NOT license:**

1. **It is not independent.** Lemire group means fed the RE3 authors' own assembled database.
   Some of RE3's advantage here is a model being scored against data it has seen.
2. **n is 4–11 observations per domain.** That is a consistency check, not a validation.
3. **Converting Lemire's net oxygen cost to gross W·kg⁻¹ required an assumed oxygen-energy
   equivalent.** The level row in particular (ACSM "winning" on four speed points) is an
   artifact of that conversion and must not be read as ACSM being generally better.
4. **The larger, real benchmark is the RE3 authors' own**, over their assembled database
   (62 original participants + 424 from 26 studies + 187 from 12 studies): reported RMSD
   1.27/1.41/1.45 W·kg⁻¹ level/uphill/downhill, lowest of the applicable equations. Quote
   *that* publicly. Use the table above internally, as the reason the choice was re-checked.

**Verdict:** RE3 stays the core. The choice is now checked rather than assumed.

## 2. The formula we did NOT build

The research build's stated goal was a new, more accurate universal surface formula. It
concluded one is not currently defensible, and rejected its own best candidate:

- A quadratic speed-correction fitted to the open Shahidi 2026 workbook achieved
  leave-one-participant-out RMSE of 0.148 mL·kg⁻¹·min⁻¹ — and was **thrown out anyway**,
  because the workbook's speed blocks do not reproduce the article's own published statistic
  (mapped +2.544 ± 0.062 at 12 km·h⁻¹ vs the paper's +1.7 ± 1.9), and its between-participant
  SDs of 0.03–0.11 are implausible for raw observations.
- **This does not touch our live citation.** STRIDE cites Shahidi's *article* values (204.2 vs
  197.1 mL·kg⁻¹·km⁻¹), not the Zenodo workbook. That citation stands. Do not build anything on
  the dataset.

The defensible architecture is RE3 as core, plus separately validated, domain-limited
corrections that are never stacked on top of each other. That is what STRIDE already does, and
§3 keeps it that way.

## 3. What shipped from this pass — and what did not

**Shipped:**

| Addition | Basis | Why it is safe |
|---|---|---|
| Headwind | Pugh 1971 / Jones & Doust 1996 | Reuses the *existing* calibrated drag term by swapping ground speed for relative air speed. There is no second aerodynamic model to double-count against. Charged to the session, never to the flat anchor. |
| Belt calibration | Willwacher et al. 2021 | Pure unit conversion at the UI boundary (measured belt travel ÷ displayed speed), clamped to 90–110%. The metabolic model never sees it. Default 100% is the identity. |
| Track lane geometry | World Athletics | Geometry, not physiology. No grade, no metabolism, no model. |
| Energy-equivalent distance | RE3 itself | Equal metabolic power for equal duration *is* equal energy, so the flat distance covered in the same time is the answer. No cost-of-transport table, no second model. Reported per segment only. |

**Deliberately not shipped:**

- **Sand / soft-surface multiplier (≈1.6×).** Study-specific to Lejeune's soft dry sand.
  There is no transferable substrate variable in the literature, so it cannot be generalized
  to trail, grass, or track. The honest representation is "no validated scalar available."
- **Repeated-turn cost (Hatamoto).** Measured on tight 180° shuttles at 3–8 km·h⁻¹. That is a
  different task from a continuous track bend and must not be used as a curve penalty.
- **Treadmill construction (compliant vs rigid, ~5.9%).** Real, but it is a two-machine
  comparison. A coach cannot measure their treadmill's stiffness; they *can* measure its belt
  speed, which is why calibration shipped and stiffness did not.
- **Downhill grade aptitude from level biomechanics.** The 2025 study's coefficients and raw
  data are not public. Nothing to implement.
- **A new fitted formula.** See §2.
- **The Surface Lab site itself.** A second running-science brand is a maintenance cost with
  no distribution. The science was harvested; the shell was not rebuilt.

## 4. Regression pin

`grade_equivalency_table.csv` in the archive was computed by a **separate implementation**
from the RE3 paper's *rounded* coefficients (30.43 / 1.133 / 1.056 / 43). The app carries the
unrounded ones (30.4269 / 1.1334 / 1.0563 / 43.4446). Across the shipped ±15% band the two
agree to within 0.19 W·kg⁻¹ and are *exactly* equal at 0% grade — the difference is entirely
coefficient rounding.

`tests/grade-model-probes.mjs` now pins the live model against that table row by row at
0.2 W·kg⁻¹ tolerance, with an exact check at level. If anyone edits an RE3 coefficient, this
breaks. That is the point: it is an outside check on our own arithmetic, not a self-test.

## 5. Standing limits (unchanged)

±15% grade. Steady state only — below 90s the tool prints a bracket, not a number. Metabolic
cost is not tissue load, and lower downhill oxygen cost is not lower impact. Equivalent
distance is energy, not mileage and not pounding. Surface, turns, technical terrain, drafting,
tactics, and downhill muscle damage remain unmodeled and are stated as such in the tool.
