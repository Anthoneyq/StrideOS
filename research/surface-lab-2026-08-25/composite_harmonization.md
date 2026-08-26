# Harmonized Evidence for a Composite Running Formula

## Common target and conversions

The primary target remains **gross steady-state metabolic rate** `Ṁ` in W·kg⁻¹. Oxygen uptake may be converted when respiratory exchange ratio is available using the study’s caloric equivalent. When only oxygen uptake is available, the conversion carries uncertainty because the energetic equivalent varies with substrate use. A practical approximation is `Ṁ ≈ V̇O₂ × 20.1 / 60`, where `V̇O₂` is in mL·kg⁻¹·min⁻¹ and 20.1 J·mL⁻¹ is an assumed oxygen equivalent. Energy cost of transport is then `C = Ṁ / v`, with speed `v` in m·s⁻¹.

Gross and net outcomes are not interchangeable. A surface multiplier reported for net locomotion cost should be applied to the net component, after which standing metabolism may be restored. Turn cost in mL·kg⁻¹ per turn becomes an oxygen-rate increment only after multiplication by turn frequency in turns per minute.

## Evidence matrix

| Evidence source | Quantitative contribution | Public individual data | Independent of RE3 fit | Defensible use now |
|---|---:|---:|---:|---|
| RE3, Looney et al. 2026 | Core speed × grade metabolic-rate surface | No public observation table located | No | Baseline equation and benchmark |
| Lemire et al. 2021 | Speed-specific grade curves; downhill optimum shifts from −14.1% to −19.5% | Available from authors on request | No; group means entered RE3 | Mechanistic support for speed × grade interaction, not external validation |
| Pinnington and Dawson 2001 | Soft dry sand net-cost ratio ≈1.5–1.6 versus grass | No | Likely outside RE3 substrate scope | Categorical deformable-sand scenario with wide uncertainty |
| Gidley et al. 2020 | 34.69 versus 36.86 mL·kg⁻¹·min⁻¹ on two treadmill constructions | No | Outside core RE3 inputs | Machine-specific calibration warning; not a continuous stiffness coefficient |
| Hatamoto et al. 2014 | `C_turn = −0.012 + 0.066v + 0.008v²` mL·kg⁻¹ per 180° turn, `v` in km·h⁻¹ | Group values in article | Outside core RE3 inputs | Low-speed, 180° shuttle-turn module only |
| Shahidi et al. 2026 | +1% treadmill versus 400 m track at 8–15 km·h⁻¹ | Open Zenodo workbook | Yes; published after RE3 data collection | External context evidence, but workbook speed blocks fail integrity checks for direct fitting |
| Taylor/Hunter group 2025 | Level peak vertical force explains 44% of downhill grade aptitude | Not public; article restricted | Yes | Candidate individualized downhill covariate requiring author-shared data |
| Bottura and Fletcher 2026 | Review rejects universal 1% equivalence | No primary dataset | Yes | Supports context-specific calibration architecture |

## Shahidi workbook decision

The open workbook was audited before use. All speed columns in the “Running economy” sheet are blank, so speeds can only be inferred from article order. The block mapped to 12 km·h⁻¹ gives a mean field-minus-lab difference of 2.544 mL·kg⁻¹·min⁻¹ with SD 0.062, whereas the peer-reviewed article reports +1.7 ± 1.9 at 12 km·h⁻¹. Across all inferred speed blocks, participant differences are nearly deterministic, with SDs only 0.03–0.11 mL·kg⁻¹·min⁻¹. No Excel formula cells explain the transformation.

> The quadratic correction fitted to those speed blocks is rejected. Its leave-one-participant-out RMSD of 0.148 mL·kg⁻¹·min⁻¹ is not evidence of predictive accuracy because the underlying blocks do not reproduce the article’s published paired statistic and likely represent processed curve values rather than raw observations.

The workbook’s “whole data” sheet contains participant-level values grouped into three VT2 intensity bands and can reproduce condition summaries, but it lacks exact speed per observation. It is suitable for confirming a context effect across relative intensity, not for fitting a universal speed-based outdoor correction.

## Implication for model structure

The evidence supports a **modular estimator** rather than a new universal polynomial:

`Ṁ_total = Ṁ_RE3(v_calibrated, grade) + ΔṀ_context + ΔṀ_turn + ΔṀ_surface`

Each correction must be optional, separately labeled, and used only inside its measured domain. `ΔṀ_context` cannot yet be expressed as a validated universal function of speed, wind, deck stiffness, and curve radius because no multi-study public dataset jointly measures those variables. `ΔṀ_surface` is categorical for soft dry sand because the literature does not report enough physical substrate parameters to derive a transferable continuum. `ΔṀ_turn` applies to repeated 180-degree turns at 3–8 km·h⁻¹, not standard track curves.

## Modeling gate

A new universal coefficient set will not be fitted from incompatible group means or reconstructed curves. The next phase may only test transparent modular scenarios and benchmark existing equations on published observations. A genuinely more accurate formula requires additional author-shared raw data or a new prospective multi-surface experiment with grouped study-level validation.
