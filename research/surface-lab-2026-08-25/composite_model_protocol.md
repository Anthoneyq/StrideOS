# Protocol for an Exploratory Composite Running-Economy Formula

## Primary target

The primary dependent variable will be **steady-state gross metabolic rate in W·kg⁻¹** for healthy adult running. This preserves a measurable physiological outcome and allows direct benchmarking against RE3, HTK, and ACSM. Energy per path metre may be derived afterward as `C = Ṁ/S`, but it will not be mixed into the fitted target.

Sprint performance, acceleration, impact loading, braking force, muscle damage, perceived effort, and race time will remain separate outputs. A formula that combines these unlike outcomes into one “difficulty” value will be rejected as uninterpretable.

## Candidate predictors

The required core predictors are speed in m·s⁻¹ and decimal grade. Optional predictors will be added only when enough independent studies report them: relative air speed or drag force, measured treadmill belt-speed calibration, treadmill versus overground mode, substrate class or deformability, turn radius, altitude or air density, sex, body mass, and training status.

The likely defensible architecture is **modular**, not one unrestricted polynomial. A base speed × grade equation would predict gross metabolic rate. Empirical correction modules would then adjust for aerodynamic resistance, calibrated speed, or a validated substrate effect. Sprint and tissue-loading modules would remain outside the metabolic equation.

## Inclusion criteria

| Criterion | Inclusion rule |
|---|---|
| Publication status | Peer-reviewed full article, plus corrected author manuscript when equation coefficients are otherwise inaccessible |
| Participants | Apparently healthy adults; population descriptors must be available |
| Locomotion | Running rather than walking; mixed-gait data require separable running observations |
| Outcome | Indirect calorimetry or another validated metabolic measurement convertible to W·kg⁻¹ |
| State | Steady-state or a protocol with a justified steady-state averaging window |
| Inputs | Speed and grade must be reported or recoverable; optional covariates require explicit measurement |
| Data access | Individual data, numeric supplementary tables, repository data, article tables, or figures that can be reproducibly digitized |
| Independence | Training and test splits must separate whole studies, not random rows from the same study |

## Exclusion and stratification rules

Walking, loaded carriage, exoskeletons, poles, extreme heat stress, hypoxia, pathological populations, non-steady maximal tests, and nonmotorized curved treadmills will not enter the primary fit. They may be retained as external challenge sets when their variables are sufficiently documented.

Gross and net metabolic rates will not be pooled without conversion based on measured standing/resting values. Oxygen uptake values will be converted with the study’s reported caloric equivalent when available; otherwise the uncertainty from an assumed equivalent will be retained. Distances are path distances unless explicitly stated otherwise.

## Candidate model families

The analysis will compare a regularized polynomial or spline surface, a physiology-constrained additive model, and a hierarchical nonlinear model with study-level random effects. Complexity will be limited by the number of independent studies, not the number of rows. Coefficients must preserve physically plausible behavior across the declared range.

## Validation standard

Performance will be measured with leave-one-study-out or grouped K-fold validation. Primary metrics are RMSD in W·kg⁻¹, mean signed error, calibration slope and intercept, and error by grade band. The candidate must be compared on identical held-out observations against RE3, Minetti-derived rate, HTK where applicable, and ACSM.

> A new equation will be rejected if its held-out RMSD is not meaningfully lower, if calibration worsens, if gains rely on data leakage, or if the result requires unsupported predictors.

## Reporting standard

Any retained model will be labeled **exploratory and not peer-reviewed**. The deliverable must include coefficients, units, validity range, source-level sample counts, preprocessing decisions, code, held-out predictions, uncertainty, failure modes, and a clear distinction between measured and digitized observations.
