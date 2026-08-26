# Can We Build a More Accurate Running-Surface Formula?

**Author:** Manus AI  
**Date:** 25 August 2026  
**Status:** Research feasibility assessment; not peer reviewed

## Executive answer

**Yes, there is additional peer-reviewed evidence that improves the design of a running-surface estimator. No, the currently accessible data do not justify claiming that a newly fitted universal formula is more accurate than RE3.** The defensible advance is a **modular equation**: retain RE3 for steady-state speed × grade metabolic rate, then add separately validated corrections for calibrated speed, air drag, repeated tight turns, deformable substrate, treadmill construction, and athlete-specific response. Combining these effects into one new polynomial would hide incompatible outcomes, double-count effects, and overfit small studies.

RE3 remains the strongest general core model located. Its authors compiled original data from 62 participants, individual observations from 26 studies involving 424 participants, and group means from 12 studies involving 187 participants. In their own model comparison, RE3 had the lowest reported RMSD for level, uphill, and downhill running among the applicable equations.[1] The new evidence found in this extension shows **where RE3 needs context**, not that a replacement coefficient set can already be validated.

| Question | Finding |
|---|---|
| Is the fixed 1% treadmill rule universal? | No. A 2026 review concludes that equivalence depends on speed, environment, methods, and the individual.[2] |
| Does speed interact with downhill grade? | Yes. Lemire et al. estimated the lowest oxygen cost between −14.1% and −19.5% as speed increased from 8 to 14 km·h⁻¹.[3] |
| Does treadmill construction matter? | Yes. One compliant-versus-rigid comparison differed by 2.17 mL·kg⁻¹·min⁻¹, approximately 5.9% relative to the rigid value.[4] |
| Can level biomechanics personalize downhill economy? | Possibly. A 2025 study found that active peak vertical force explained 44% of downhill grade aptitude, but its regression coefficients and raw data were not publicly accessible.[5] |
| Is there new open validation data? | Yes, a 2026 +1% treadmill-versus-track workbook is open, but its speed-block sheet failed the integrity checks required for fitting a speed correction.[6] [7] |
| Can sand be represented by an equivalent grade? | No. Soft dry sand increased metabolic expenditure about 1.6-fold while external mechanical work increased about 1.15-fold; substrate loss is not gravitational work.[8] |

## The proposed Surface Lab modular estimator

The proposed equation is an **architecture assembled from peer-reviewed modules**, not a claim that new universal coefficients have been validated:

`Ṁ_total = Context{ Surface[Ṁ_RE3(v_cal,G)] + ΔṀ_aero + ΔṀ_turn + u_athlete }`

Here `Ṁ_total` is gross metabolic rate in W·kg⁻¹, `v_cal` is measured rather than displayed speed in m·s⁻¹, `G` is decimal rise/run, and `u_athlete` is an optional personal calibration term estimated from the runner’s own paired tests. `Context{·}` means that a directly measured treadmill-to-outdoor calibration may replace—not stack on top of—the decomposed aerodynamic, turn, and machine modules.

### 1. Core speed × grade term

The current RE3 expression is:[1]

`Ṁ_RE3 = 4.43 + 1.51v + 0.37v² + 30.43vG[1 − 1.133^(1 − 1.056^(100G + 43))]`

This predicts steady-state gross metabolic rate in W·kg⁻¹ from speed and grade. It should remain the default core because the peer-reviewed comparison reported level RMSD of 1.27 W·kg⁻¹, uphill RMSD of 1.41, and downhill RMSD of 1.45. Corresponding reported RMSDs were 1.30/1.45 for updated HTK on level/uphill, 1.44/2.18/1.57 for Minetti on level/uphill/downhill, and 1.82/2.17 for ACSM on level/uphill.[1]

### 2. Deformable-surface transformation

A surface multiplier should act on the **net locomotion component**, not on standing metabolism:

`Ṁ_surface = Ṁ_stand + k_surface(Ṁ_RE3 − Ṁ_stand)`

For the soft dry sand conditions tested by Lejeune et al., an exploratory value is `k_surface ≈ 1.6`.[8] A second grass-versus-soft-sand study reported an approximately 1.5-fold net oxygen-cost ratio over 8–11 km·h⁻¹, supporting the magnitude but not a universal coefficient.[9] This term must remain categorical until studies report transferable substrate variables such as penetration resistance, moisture, compaction, and shear loss.

### 3. Aerodynamic module

For air density `ρ`, effective drag area `CdA`, ground speed `v`, and headwind `w`, the physical drag force is:

`F_drag = ½ρCdA(v + w)|v + w|`

Da Silva et al. found that gross metabolic power increased by 6.13% for each impeding force equal to 1% of body weight, with individual slopes from 4.17% to 8.14%.[10] A study-specific metabolic increment is therefore:

`ΔṀ_aero ≈ Ṁ_base · 6.13 · F_drag/(mg)`

This is preferable to assigning a fixed treadmill grade, but it is still conditional on the tested force and speed ranges. The individual spread should be propagated as uncertainty rather than hidden in a single deterministic result.

### 4. Repeated-turn module

For repeated 180-degree turns at 3–8 km·h⁻¹, Hatamoto et al. reported oxygen per turn as:[11]

`C_turn = −0.012 + 0.066V + 0.008V²`

where `V` is in km·h⁻¹ and `C_turn` is mL O₂·kg⁻¹·turn⁻¹. If turn frequency is `f_turn` turns·min⁻¹ and `e_O₂` is the measured energetic equivalent in J·mL⁻¹:

`ΔṀ_turn = f_turn · C_turn · e_O₂ / 60`

This is a tight-shuttle correction. It must not be used as a standard 400 m track-curve penalty because continuous bends and complete deceleration/reacceleration turns are different tasks.

### 5. Machine and athlete calibration

Common treadmills can differ materially even at nominally matched settings. Gidley et al. measured 34.69 versus 36.86 mL·kg⁻¹·min⁻¹ on compliant and rigid constructions.[4] Willwacher et al. found average belt speeds from approximately 98% to 103% of displayed target across machines and conditions, with within-stance reductions exceeding 5% on three of four treadmills.[12] The estimator should therefore use measured belt speed and grade and allow a **machine calibration offset** obtained from a short standardized comparison.

The strongest path to individualization is not another population constant. It is a runner-specific random intercept and, when enough measurements exist, runner-specific grade and downhill slopes. The 2025 grade-aptitude study supports this direction but does not yet provide public coefficients for implementation.[5]

## Why the attempted new speed correction was rejected

The 2026 PLOS ONE study supplies a valuable open workbook and reports that overground running was more costly than +1% treadmill running in twelve highly trained men. At the common 12 km·h⁻¹ point, the peer-reviewed article reports a field-minus-treadmill oxygen difference of `+1.7 ± 1.9 mL·kg⁻¹·min⁻¹`.[6]

The workbook’s “Running economy” sheet contains eight repeated blocks but no populated speed cells. Assigning 8–15 km·h⁻¹ by article order produced a mapped 12 km·h⁻¹ difference of `+2.544 ± 0.062`, not the published value. All inferred speed blocks had extremely small between-participant SDs of only 0.03–0.11. A quadratic fit achieved leave-one-participant-out RMSE of 0.148 mL·kg⁻¹·min⁻¹, but that apparent accuracy is rejected because the block values do not reproduce the article’s paired statistic and may be processed curve values rather than raw observations.[6] [7]

![Comparison of the workbook speed blocks with the article’s published 12 km/h result](https://private-us-east-1.manuscdn.com/sessionFile/UrbnlCo4TF8p47okV72Qa9/sandbox/nYBreJfPQNIVPFpywL3nsO-images_1787690555409_na1fn_L2hvbWUvdWJ1bnR1L3J1bm5pbmctc3VyZmFjZS1lcXVpdmFsZW5jeS1sYWIvcmVzZWFyY2gvY29tcG9zaXRlX291dHB1dHMvc2hhaGlkaV9kYXRhc2V0X2Rpc2NyZXBhbmN5.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVXJibmxDbzRURjhwNDdva1Y3MlFhOS9zYW5kYm94L25ZQnJlSmZQUU5JVlBGcHl3TDNuc08taW1hZ2VzXzE3ODc2OTA1NTU0MDlfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwzSjFibTVwYm1jdGMzVnlabUZqWlMxbGNYVnBkbUZzWlc1amVTMXNZV0l2Y21WelpXRnlZMmd2WTI5dGNHOXphWFJsWDI5MWRIQjFkSE12YzJoaGFHbGthVjlrWVhSaGMyVjBYMlJwYzJOeVpYQmhibU41LnBuZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc4OTQzMDQwMH19fV19&Key-Pair-Id=K2QY5QTL8JSY6C&Signature=MEYCIQCwzpMuvYZ30VhE8ZeHBNTusKHMqIS883dvPcOk9pYIpwIhAJ3jLNWpFwS23FsSnx-P6wlP0S2B-sRI8OsxiGHKkeiL)

> **Decision:** Do not publish the fitted quadratic as a running equation. Ask the study authors to clarify the workbook’s speed blocks or provide the original stage-level records.

The workbook’s “whole data” sheet does provide participant values grouped into three VT2 intensity bands. Those values can confirm a condition effect, but they do not identify exact speed per row and therefore cannot estimate a universal speed-based outdoor correction.

## Benchmark findings

The official RE3 comparison remains the most credible benchmark because it evaluates the equations over the authors’ assembled database.[1] A secondary diagnostic in this project compared the four equations against Lemire et al.’s published speed-specific grade polynomials.[3] That exercise is **not independent** because Lemire group means contributed to the RE3 database, and converting net oxygen cost to gross W·kg⁻¹ required an assumed oxygen-energy equivalent.

Within that restricted diagnostic, RE3 had the lowest error on uphill and downhill subsets. ACSM happened to have the lowest level error across the four Lemire speed points, a result that should not override the much larger RE3 benchmark. The discrepancy illustrates why model selection must use a broad study-level hold-out rather than a small overlapping subset.

![Existing models compared with the Lemire speed-grade curves](https://private-us-east-1.manuscdn.com/sessionFile/UrbnlCo4TF8p47okV72Qa9/sandbox/nYBreJfPQNIVPFpywL3nsO-images_1787690555409_na1fn_L2hvbWUvdWJ1bnR1L3J1bm5pbmctc3VyZmFjZS1lcXVpdmFsZW5jeS1sYWIvcmVzZWFyY2gvY29tcG9zaXRlX291dHB1dHMvbGVtaXJlX21vZGVsX2JlbmNobWFyaw.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVXJibmxDbzRURjhwNDdva1Y3MlFhOS9zYW5kYm94L25ZQnJlSmZQUU5JVlBGcHl3TDNuc08taW1hZ2VzXzE3ODc2OTA1NTU0MDlfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwzSjFibTVwYm1jdGMzVnlabUZqWlMxbGNYVnBkbUZzWlc1amVTMXNZV0l2Y21WelpXRnlZMmd2WTI5dGNHOXphWFJsWDI5MWRIQjFkSE12YkdWdGFYSmxYMjF2WkdWc1gySmxibU5vYldGeWF3LnBuZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc4OTQzMDQwMH19fV19&Key-Pair-Id=K2QY5QTL8JSY6C&Signature=MEYCIQDnKm2Y43CifPUaVfSLZ~aGZD19JtFfK8uZi5jzPeE5iQIhAKw5OBk8LfTmuMJrT8zoDDTMyJRc3aZ830NVRtJ7HgUo)

| Diagnostic subset | Best model in this restricted proxy | RMSE (W·kg⁻¹) | Interpretation |
|---|---:|---:|---|
| Uphill | RE3 | 0.299 | Consistent with the larger RE3 benchmark, but source overlap remains |
| Downhill | RE3 | 1.122 | Better than Minetti in this proxy; still not external validation |
| Level | ACSM | 0.291 | Four-speed artifact under conversion assumptions; not evidence ACSM is generally superior |

## What would make a genuinely more accurate formula possible

A defensible next-generation fit requires participant-level observations from **multiple independent laboratories** with the same target definition. The highest-value additions are the original RE3 study database, the 40-runner grade-aptitude records, clarified stage-level Shahidi data, and experiments that measure treadmill stiffness and belt dynamics continuously rather than comparing only two machines.[1] [5] [6]

The preferred design is a hierarchical nonlinear model or constrained generalized additive model. Runner and study should enter as grouped effects, while calibrated speed, grade, speed × grade, air density, relative wind, `CdA`, turn radius/frequency, treadmill stiffness, belt-speed fluctuation, and measured substrate resistance enter as explicit predictors. Validation must hold out **entire studies or sites**, not random rows from the same participants. Performance should be reported with RMSE, MAE, bias by grade and speed, calibration slope, prediction intervals, and subgroup errors.

| Required element | Minimum defensible standard |
|---|---|
| Outcome | Gross steady-state W·kg⁻¹, with net/gross and caloric-equivalent rules recorded |
| Speed and grade | Independently measured; console settings alone are insufficient |
| Environment | Air density, wind vector, temperature, humidity, airflow/fan |
| Surface | Named construction plus measurable compliance/deformation variables |
| Curvature | Radius and turn type; continuous bends separated from stop-and-go turns |
| Population | Sex, body mass, training level, treadmill familiarity, downhill experience |
| Validation | Leave-one-study/site-out plus a prospective external test set |
| Acceptance | Pre-registered improvement over RE3 in held-out error and calibration without harmful subgroup bias |

## Conclusion

The research supports a **better estimator design**, but not yet a new universally more accurate coefficient set. The most scientifically defensible product today is **RE3 plus optional, domain-limited modules with uncertainty and no double-counting**. The next breakthrough depends less on inventing another polynomial and more on obtaining harmonized participant-level data across machines, surfaces, winds, turns, and runners.

## References

[1]: https://pubmed.ncbi.nlm.nih.gov/41057734/ "Looney, Hoogkamer, and Kram — Metabolic energy expenditure during level, uphill, and downhill running"
[2]: https://doi.org/10.1139/apnm-2026-0109 "Bottura and Fletcher — Beyond the 1% Treadmill Rule"
[3]: https://doi.org/10.3389/fphys.2021.697315 "Lemire et al. — Level, Uphill, and Downhill Running Economy Values Are Correlated Except on Steep Slopes"
[4]: https://pubmed.ncbi.nlm.nih.gov/32552333/ "Gidley, Lankford, and Bailey — The construction of common treadmills significantly affects biomechanical and metabolic variables"
[5]: https://doi.org/10.1123/jab.2024-0212 "Can Level Ground Biomechanics Predict Uphill and Downhill Running Economy?"
[6]: https://doi.org/10.1371/journal.pone.0355988 "Shahidi et al. — Overground running incurs a higher energetic cost than treadmill running at a 1% grade"
[7]: https://doi.org/10.5281/zenodo.17671648 "Shahidi — Field Running Incurs Higher Physiological Cost of Energy than Treadmill Running Despite Matched Speeds: Dataset"
[8]: https://pubmed.ncbi.nlm.nih.gov/9622579/ "Lejeune, Willems, and Heglund — Mechanics and energetics of human locomotion on sand"
[9]: https://pubmed.ncbi.nlm.nih.gov/11905936/ "Pinnington and Dawson — The energy cost of running on grass compared to soft dry beach sand"
[10]: https://doi.org/10.1152/japplphysiol.00086.2022 "Da Silva, Kram, and Hoogkamer — The metabolic cost of emulated aerodynamic drag forces in marathon running"
[11]: https://doi.org/10.1371/journal.pone.0081850 "Hatamoto et al. — The oxygen cost of running while turning increases with turning frequency"
[12]: https://doi.org/10.1038/s41598-021-81951-9 "Willwacher et al. — A new method for measuring treadmill belt velocity fluctuations"
