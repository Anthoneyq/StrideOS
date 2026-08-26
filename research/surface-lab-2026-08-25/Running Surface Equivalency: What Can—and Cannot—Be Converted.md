# Running Surface Equivalency: What Can—and Cannot—Be Converted

**Author:** Manus AI  
**Research date:** 25 August 2026

## Executive conclusion

There is **no single scientifically defensible conversion factor** that makes flat-track running, road running, hill sprints, treadmill incline or decline, grass, sand, and trail running interchangeable. An equivalence must first name what is being held constant: **path distance, horizontal distance, vertical gain, elapsed time, metabolic energy, metabolic power, oxygen uptake, maximal sprint speed, external work, or musculoskeletal loading**. The appropriate equation then depends on that choice.

For steady-state graded running, the most useful current rate model is the 2026 **RE3 equation**, derived from a large multi-study dataset and validated for level, uphill, and downhill metabolic rate. The older **Minetti polynomial** remains useful because it transparently estimates energy cost per path metre from −45% to +45% grade. The two models answer slightly different questions and should be shown together rather than blended into one opaque score.[1] [2]

The familiar “1% treadmill equals outdoors” rule is a practical historical approximation, not a physical law. Its original study found that 1% often best matched outdoor oxygen cost within a specific speed range, but slower speeds did not clearly require it, later meta-analysis found broadly similar submaximal oxygen uptake at both 0% and 1%, and a 2026 track study found outdoor energy cost higher than 1% treadmill cost in its sample.[3] [4] [5]

> **The central rule:** two runs are “equivalent” only after the conserved outcome and model assumptions are stated.

| Comparison goal | Defensible calculation | What it does not preserve |
|---|---|---|
| Same geometry | Convert grade, angle, path, horizontal projection, and vertical change | Energy, pace, or tissue load |
| Same modelled energy | Use segment energy, then compute a flat-energy-equivalent distance | Time, speed, braking, or impact |
| Same metabolic power | Solve for speed that gives the same RE3 rate, or use `Cv` under a cost model | Distance or session duration |
| Same treadmill/road oxygen cost | Use 0–1% only as a setup- and speed-dependent approximation | Biomechanics, lactate, performance, or wind |
| Same sprint resistance | Use acceleration/equivalent-slope or narrow empirical load–velocity models | Steady-state oxygen cost |
| Same tissue loading | Compare impact, braking, contact, and joint-work measures | Calories or distance |

## 1. Geometry comes before physiology

Decimal grade is `G = rise/run`; percent grade is `100G`; surface angle is `θ = atan(G)`. For path distance `d`, horizontal projection is `x = d/√(1+G²)` and vertical change is `h = dG/√(1+G²)`. Thus, 1,000 m along a +10% surface gains 99.50 m vertically, not exactly 100 m, because the belt or hill distance is measured along the slope.

The component of gravity along the surface is `g sinθ = gG/√(1+G²)`. Gravitational potential energy is `mgh`. That mechanical work is only one component of whole-body metabolic cost; it cannot by itself predict calories, oxygen uptake, or fatigue.

## 2. Steady-state energy and effort models

### Minetti cost per path metre

The Minetti model estimates metabolic cost of transport `C` in J·kg⁻¹·m⁻¹ from decimal grade `G`:[1]

`C(G) = 155.4G⁵ − 30.4G⁴ − 43.3G³ + 46.3G² + 19.5G + 3.6`.

At level grade, the polynomial gives 3.6 J·kg⁻¹·m⁻¹. Its J-shaped curve falls to approximately half of level cost near an 18% decline, then rises again as braking demand increases. A +5% grade is about 1.30× level cost per metre, +10% about 1.66×, +20% about 2.50×, and +45% about 5.40× in the polynomial. These are metabolic **distance-cost** ratios, not pace penalties.

For route segments `i`, mass-specific energy is `Σ[C(Gᵢ)dᵢ]`. The corresponding flat-energy-equivalent distance is:

`d_flat,eq = Σ[C(Gᵢ)dᵢ] / C(0)`.

For example, 1,000 m at +5% is approximately 1,301 flat metres by this definition. It still contains only 1,000 m of path distance and about 49.94 m of ascent.

### RE3 metabolic rate

The RE3 model estimates gross metabolic rate `Ṁ` in W·kg⁻¹ using speed `S` in m·s⁻¹ and decimal grade `G`:[2]

`Ṁ = 4.43 + 1.51S + 0.37S² + 30.43SG[1 − 1.133^(1 − 1.056^(100G + 43))]`.

It uses both speed and grade, so it is better suited to “same effort rate” questions. At 3.0 m·s⁻¹, its modelled rate is approximately 12.29 W·kg⁻¹ on level ground, 15.92 at +5%, 20.32 at +10%, and 30.11 at +20%. Its downhill minimum at that speed is near −17% in the derived curve.

To compare energy, use `E = mṀt`; for constant-speed distance `d`, `t = d/S`. A 70 kg runner covering 1,000 m at 3.0 m·s⁻¹ and +5% has a modelled gross energy near 88.8 kcal. This is a population estimate, not a personal calorie measurement.

The 2026 paper reported lower root-mean-square error for RE3 and the updated HTK model than the ACSM and Minetti equations on uphill data, and slightly lower downhill error for RE3 than Minetti.[2] The journal record notes a 2026 correction; the site identifies the coefficients as those verified in the public manuscript and exposes the citation.

### HTK uphill decomposition

The updated HTK equation is:[2]

`Ṁ = 1.44 + S[2.01 + 1.74e^(−18.24sinθ) + (9.81/0.23)sinθ]`.

It separates standing metabolism, perpendicular bouncing and limb swing, parallel force production, and vertical work. It is a level/uphill model, not a downhill calculator.

## 3. Treadmill, track, and road are similar—not identical

Jones and Doust tested nine trained men from 2.92 to 5.00 m·s⁻¹. At the two slowest speeds, road oxygen uptake was not significantly different from either 0% or 1% treadmill. At 3.75 m·s⁻¹, 1% was the closest tested match; at 4.17 and 4.58 m·s⁻¹, both 1% and 2% were statistically compatible with road values.[3]

Across 34 crossover studies, treadmill and overground submaximal oxygen uptake was similar at both 0% and 1%, while lactate, perceived exertion, heart rate, and endurance performance did not follow one universal pattern.[5] A separate biomechanical meta-analysis found the modes largely comparable but reported pooled differences in foot-ground angle, knee-flexion range, vertical centre-of-mass displacement, propulsive force, and contact time.[6]

In a 2026 controlled study of twelve trained male runners from 8–15 km·h⁻¹, outdoor track energy cost exceeded treadmill running at 1% across the reported range. Outdoor oxygen cost of transport was 204.2 versus 197.1 mL·kg⁻¹·km⁻¹.[4] This does not invalidate the earlier rule; it demonstrates that machine, airflow, surface, environment, and sample can change the result.

Treadmill displays also have measurement uncertainty. Across four treadmills, average belt speeds ranged from about 98% to 103% of target, and three machines showed within-stance reductions greater than 5% of target speed.[10] A nominally small incline correction can therefore be overshadowed by machine-specific speed and deck behavior.

| Setting | Best interpretation |
|---|---|
| 0% treadmill | Often close to level overground oxygen cost at slower/moderate speeds, but no wind and machine mechanics differ |
| 1% treadmill | Historical practical approximation for some faster level outdoor running, not universally required or sufficient |
| Positive treadmill grade | Geometrically comparable to the same grade; metabolic similarity still depends on machine, speed, and runner |
| Negative treadmill grade | Can estimate downhill metabolic rate, but braking and impact must be reported separately |

## 4. Aerodynamic cost explains part of the treadmill gap

With air density `ρ`, drag area `CdA`, ground speed `v`, and positive headwind `w`, relative air speed is `v_rel = v+w`. Signed drag is `F = ½ρCdA·v_rel|v_rel|`, and mechanical drag power is `P = Fv`. In calm air, it rises with `v³`.

Pugh estimated that air resistance represented about 8% of total cost at 6.0 m·s⁻¹ and 16% for a 10-second 100 m sprint.[7] Davies estimated lower values: 4% at 6 m·s⁻¹, 2% at 5 m·s⁻¹, and 7.8% at 10 m·s⁻¹.[8] The disagreement reflects very small early samples and conversion uncertainty.

In a modern study of twelve competitive runners, gross metabolic power rose by 6.13% per horizontal impeding force equal to 1% of body weight, with individual slopes from 4.17% to 8.14%.[9] This supports an interactive drag sensitivity range, but not a universal conversion from mechanical watts to metabolic watts.

## 5. Uphill and downhill running redistribute load

At a fixed 3 m·s⁻¹, Gottschall and Kram tested level and ±3°, ±6°, and ±9°. At −9°, normal impact-force peaks were 54% greater and parallel braking-force peaks 73% greater than level. At +9°, the normal impact peak disappeared while parallel propulsive peaks were 75% greater.[13] A current review reaches the same qualitative conclusion: uphill raises positive work and propulsive demand, while downhill emphasizes eccentric braking and impact.[14]

This explains the apparent paradox: a moderate decline can be metabolically cheaper per metre while imposing greater braking and tissue load. “Lower oxygen cost” is not synonymous with “easier recovery” or “lower injury risk.”

## 6. Hill sprints require sprint-specific models

Steady-state equations should not be used as literal predictors for 6–15 second maximal sprints. Di Prampero’s sprint model maps forward acceleration `a_f` to an equivalent grade `ES = a_f/g` and effective-gravity multiplier `EM = √(1+(a_f/g)²)`. It then applies uphill cost as `C_sr = C(ES)EM` and mapped instantaneous power as `C_srv`.[15] At the observed mean peak starting acceleration of 6.42 m·s⁻², equivalent grade is about 65.4%, beyond Minetti’s measured +45% range. The result is an informative energetic analogy, not measured sprint oxygen use.

In twenty-four collegiate athletes sprinting on 5.2%, 8.8%, and 17.6% hills, maximal speed fell approximately 1.7% per additional **degree** of hill angle, and individual load–velocity relations were highly linear across that tested range.[16] The per-degree coefficient is not per grade percentage and should not be extrapolated to steep hills or endurance pace.

For downhill sprinting, forty-four athletes achieved the best acute overspeed near −5.8° (about −10.2% grade), where maximal speed increased by 7.09% on average. Steeper slopes were not automatically faster.[17] Because braking and impact increase downhill, this observed result belongs in a separate sprint panel with explicit safety and scope warnings.

## 7. Track geometry changes distance and curve demand

World Athletics specifies a 36.8 m lane-1 running-line radius and 84.390 m straights for the standard 400 m track. Outer lanes use official staggers; a full unstaggered lap in lane 8 is about 453.032 m, so ten such laps cover about 4,530.32 m.[18]

Curve mechanics depend on speed and radius: centripetal acceleration is `v²/r`, inward force is `mv²/r`, and idealized lean angle is `atan(v²/(rg))`. Outer lanes have larger radii and slightly lower centripetal demand at a given speed, but no accepted universal metabolic “curve penalty” converts this directly to calories.

## 8. Surface material: where scalar conversions stop

Sand is the strongest supported surface multiplier in this evidence set. At matched speed, Lejeune et al. found about 1.15× external mechanical work and 1.6× metabolic expenditure on sand versus a hard surface.[11] Under those study conditions, 1,000 m of sand was roughly the metabolic-energy equivalent of 1,600 m on hard ground. Sand depth, moisture, compaction, footwear, and technique limit transferability.

For asphalt, synthetic track, grass, and treadmill, Moon et al. measured biomechanics rather than metabolism. Peak tibial acceleration was 11.0 g on asphalt, 10.7 on grass, 10.6 on track, and 7.9 on treadmill, while rearfoot eversion velocity and stride frequency also differed.[12] These results justify a **loading comparison**, not invented calorie multipliers.

Trail running cannot be represented by one surface constant. A defensible route model divides the route into grade-and-distance segments, applies a metabolic grade model, and separately reports technicality, substrate deformation, turns, altitude, heat, and wind when measured. Without matched metabolic data, a universal trail/road multiplier would be fabricated.

| Surface | Metabolic scalar supported here? | What can be compared |
|---|---:|---|
| Synthetic track | No universal scalar | Exact distance, curve radius, impact measures |
| Asphalt/road | No universal scalar | Grade geometry, wind drag, measured biomechanics |
| Concrete | No universal scalar | Grade geometry; surface-specific mechanics require direct data |
| Grass | No universal scalar | Measured impact and foot-motion outcomes |
| Motorized treadmill | No universal scalar | Speed/grade models plus machine-specific calibration |
| Sand | Study-specific `≈1.6×` energy | Energy sensitivity under comparable sand conditions |
| Trail | No universal scalar | Segment grade energy plus separately measured terrain effects |

## 9. How to use the interactive calculations

Use the **Grade Lab** when the question is steady-state energy, metabolic rate, vertical gain, or modelled same-power speed. Use the **Treadmill Lens** when the question is a 0%/1% outdoor approximation, belt calibration, or aerodynamic sensitivity. Use the **Sprint Lens** only for short maximal efforts and remain within the empirical range. Use the **Track Lens** for lane distance and curve mechanics. Use the **Surface Matrix** to see where evidence supports a number and where it supports only a qualitative or biomechanical comparison.

All calculators are estimates. They do not diagnose fitness, prescribe training, predict injury, or replace measured oxygen uptake, lactate, power, heart rate, or athlete-specific calibration.

## References

[1]: https://doi.org/10.1152/japplphysiol.01177.2001 "Minetti et al. (2002), Energy cost of walking and running at extreme uphill and downhill slopes"
[2]: https://doi.org/10.1007/s00421-025-05999-5 "Looney, Hoogkamer & Kram (2026), Metabolic energy expenditure during level, uphill, and downhill running"
[3]: https://doi.org/10.1080/02640419608727717 "Jones & Doust (1996), A 1% treadmill grade most accurately reflects the energetic cost of outdoor running"
[4]: https://doi.org/10.1371/journal.pone.0355988 "Shahidi et al. (2026), Overground running incurs a higher energetic cost than treadmill running at a 1% grade"
[5]: https://doi.org/10.1007/s40279-019-01087-9 "Miller et al. (2019), Treadmill versus overground physiology, perception and performance meta-analysis"
[6]: https://doi.org/10.1007/s40279-019-01237-z "Van Hooren et al. (2020), Treadmill versus overground biomechanics meta-analysis"
[7]: https://doi.org/10.1113/jphysiol.1970.sp009097 "Pugh (1970), Oxygen intake in track and treadmill running and air resistance"
[8]: https://doi.org/10.1152/jappl.1980.48.4.702 "Davies (1980), Effects of wind assistance and resistance on a runner"
[9]: https://doi.org/10.1152/japplphysiol.00086.2022 "da Silva, Kram & Hoogkamer (2022), Metabolic cost of emulated aerodynamic drag"
[10]: https://doi.org/10.1038/s41598-021-81951-9 "Willwacher et al. (2021), Treadmill belt velocity fluctuations"
[11]: https://doi.org/10.1242/jeb.201.13.2071 "Lejeune, Willems & Heglund (1998), Mechanics and energetics of locomotion on sand"
[12]: https://doi.org/10.1080/14763141.2025.2511766 "Moon et al. (2025), Track, asphalt, grass and treadmill biomechanics"
[13]: https://doi.org/10.1016/j.jbiomech.2004.04.023 "Gottschall & Kram (2005), Ground reaction forces during downhill and uphill running"
[14]: https://doi.org/10.3389/fbioe.2025.1690023 "Lu et al. (2025), Review of uphill and downhill running"
[15]: https://doi.org/10.1242/jeb.01700 "di Prampero et al. (2005), Sprint running: a new energetic approach"
[16]: https://doi.org/10.1080/02640414.2021.1992868 "Delaney et al. (2022), Uphill sprinting load- and force-velocity profiling"
[17]: https://doi.org/10.1519/JSC.0b013e31816a4149 "Ebben, Davies & Clewien (2008), Downhill slope and acute sprint velocity"
[18]: https://worldathletics.org/about-iaaf/documents/technical-information "World Athletics technical information and 400 m standard-track marking plan"
