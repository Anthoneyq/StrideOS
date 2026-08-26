# Mathematical Derivations — Running Surface Equivalency

This document defines the calculations used in the interactive website. It deliberately avoids a single “magic conversion,” because distance, metabolic energy, metabolic power, oxygen uptake, sprint speed, and tissue load are different outcomes.

## 1. Symbols and units

| Symbol | Meaning | Units |
|---|---|---|
| `G` | Decimal grade, `rise/run` | dimensionless |
| `p` | Grade shown as percent, `p = 100G` | % |
| `θ` | Surface angle, `θ = atan(G)` | radians or degrees |
| `d` | Distance along the running surface | m |
| `x` | Horizontal projection | m |
| `h` | Vertical change | m |
| `S`, `v` | Speed along the running surface | m·s⁻¹ |
| `m` | Body mass | kg |
| `C(G)` | Metabolic cost per path metre | J·kg⁻¹·m⁻¹ |
| `Ṁ` | Gross metabolic power per body mass | W·kg⁻¹ |
| `E` | Metabolic energy | J or kcal |
| `g` | Gravitational acceleration | 9.81 m·s⁻² |

## 2. Grade geometry

Percent grade is not an angle. The exact conversions are:

`G = rise/run`, `p = 100G`, and `θ = atan(G)`.

For a measured path distance `d`:

`x = d cosθ = d/√(1+G²)`

`h = d sinθ = dG/√(1+G²)`.

For a known horizontal map distance `x`, the sloped path is `d = x√(1+G²)` and vertical change is `h = xG`. Treadmill belt distance is a **path distance**; therefore vertical gain is `h = dG/√(1+G²)`, not exactly `dG`, although the difference is tiny at low grades.

The component of gravity parallel to the surface is `g∥ = g sinθ = gG/√(1+G²)`. The positive gravitational potential-energy change is `ΔPE = mgh`. This is mechanical energy, not total metabolic energy.

## 3. Grade-based metabolic cost

### 3.1 Minetti cost of transport

With decimal grade `G`, the transparent grade-only cost polynomial is:

`C_M(G) = 155.4G⁵ − 30.4G⁴ − 43.3G³ + 46.3G² + 19.5G + 3.6` J·kg⁻¹·m⁻¹.

For a constant-grade segment, mass-specific energy is `e = C_M(G)d`; total metabolic energy is `E = mC_M(G)d`. For a route divided into segments:

`E_total/m = Σ[C_M(Gᵢ)dᵢ]`.

The route’s **flat-energy-equivalent distance** is:

`d_flat,eq = Σ[C_M(Gᵢ)dᵢ] / C_M(0)`.

This conserves modelled energy only. It does not conserve elapsed time, speed, impact loading, or fatigue.

If cost per metre is assumed independent of speed and the goal is to match metabolic power to level speed `v₀`, then:

`C_M(G)v_G = C_M(0)v₀`, hence `v_G = v₀C_M(0)/C_M(G)`.

This convenient relation becomes unreliable for steep grades, non-steady efforts, and speeds outside the source conditions.

### 3.2 RE3 gross metabolic rate

With speed `S` in m·s⁻¹ and decimal grade `G`, the public manuscript equation is:

`Ṁ_RE3 = 4.43 + 1.51S + 0.37S² + 30.43SG[1 − 1.133^(1 − 1.056^(100G + 43))]` W·kg⁻¹.

For duration `t`, `E = mṀ_RE3t`. For path distance `d` at constant speed, `t = d/S`, so:

`E = mṀ_RE3d/S`.

The implied gross cost per metre is `C_RE3 = Ṁ_RE3/S`. Because the equation includes standing and nonlinear speed terms, cost is not constant with speed.

For fixed grade, define:

`B(G) = 30.43G[1 − 1.133^(1 − 1.056^(100G + 43))]`.

Then `Ṁ_RE3 = 0.37S² + [1.51+B(G)]S + 4.43`. To find a positive speed matching target metabolic rate `Ṁ*`, solve:

`0.37S² + [1.51+B(G)]S + (4.43−Ṁ*) = 0`

and retain the positive root:

`S = {−[1.51+B(G)] + √([1.51+B(G)]² − 4(0.37)(4.43−Ṁ*))} / 0.74`.

### 3.3 HTK physiology-based uphill model

For level and uphill running:

`Ṁ_HTK = 1.44 + S[2.01 + 1.74e^(−18.24sinθ) + (9.81/0.23)sinθ]`.

Use `sinθ = G/√(1+G²)`. The terms represent standing metabolism, perpendicular bouncing/limb swing, a decaying parallel-running cost, and vertical work at fitted efficiency. It is not a downhill model.

## 4. Pace, time, and energy are different equivalencies

Speed and pace convert as `pace_s/km = 1000/S`, `pace_min/mi = 1609.344/(60S)`, and `mph = 2.236936S`. For any segment, `t = d/S`.

Matching elapsed time means `d₁/S₁ = d₂/S₂`. Matching energy means `mC₁d₁ = mC₂d₂` under a cost-of-transport model. Matching average metabolic power means `C₁S₁ = C₂S₂`, or directly `Ṁ₁ = Ṁ₂` with a rate model. These equations answer different questions and generally produce different “equivalent” sessions.

For a multi-segment route with segment energy `Eᵢ` and time `tᵢ`, `Ṁ_avg = ΣEᵢ/(mΣtᵢ)`. Averaging grades first and then evaluating a nonlinear cost model is generally wrong: `C(mean G) ≠ mean C(G)`.

## 5. Treadmill versus overground

A treadmill at the same displayed speed and grade is a controlled approximation, not a physical identity. The Jones–Doust 1% rule is a speed- and setup-dependent oxygen-cost approximation; later meta-analysis found broadly similar submaximal oxygen uptake at both 0% and 1%, and a 2026 controlled study found track cost higher than 1% treadmill cost in its sample.

### 5.1 Air drag

Let `w` be positive headwind, `ρ` air density, and `CdA` effective drag area. Relative air speed is `v_rel = v+w`. Signed drag is:

`F_drag = ½ρCdA · v_rel|v_rel|`.

Runner-opposing mechanical power is `P_drag = F_dragv`. In calm air it scales as `v³`. Translating drag mechanical power to metabolic cost is empirical. A tested approximation from da Silva et al. is:

`ΔṀ% ≈ 6.13 × [100F_drag/(mg)]`,

with individual slopes of 4.17–8.14% per 1% body-weight impeding force in that experiment. This should be a sensitivity tool, not an exact correction.

### 5.2 Belt calibration

If belt length is `L`, and `N` revolutions occur in measured time `t`, measured speed is `v_true = NL/t`. For console speed `v_set`, calibration factor is `k = v_true/v_set`; true distance over duration `T` is `d_true = kv_setT`. A ±3% speed error means a nominal 10.00 km belt session may represent about 9.70–10.30 km of belt travel.

## 6. Surface deformation

Sand loss is not gravitational grade. In the Lejeune experiment, `E_sand ≈ 1.6E_hard` and external mechanical work was about `1.15×` hard ground at matched speed. A study-specific hard-ground energy-equivalent distance is therefore `d_hard,eq ≈ 1.6d_sand`. The multiplier should not be applied to all sand, trails, grass, asphalt, or track surfaces.

For track, asphalt, grass, and treadmill, current wearable evidence supports differences in impact acceleration and foot motion, but not a universal metabolic multiplier. The correct mathematical representation is “no validated scalar available,” accompanied by measured biomechanical outcomes.

## 7. Flat-track geometry and curves

For a standard path with two straights of length `L` and two semicircles of running-line radius `r`, lap distance is `D = 2L + 2πr`. World Athletics’ lane-1 measurement line gives approximately 400 m. If a runner completes a full unstaggered lap in an outer lane, the extra distance is the official 400 m stagger for that lane.

On a flat curve, required centripetal acceleration is `a_c = v²/r`, inward force is `F_c = mv²/r`, and idealized inward lean is `φ = atan(v²/(rg))`. These are mechanical requirements, not metabolic-calorie equations.

## 8. Sprint models

### 8.1 Acceleration as equivalent slope

For forward acceleration `a_f`, di Prampero’s equivalent slope is `ES = a_f/g`; effective gravity multiplier is `EM = √(1+(a_f/g)²)`. The mapped sprint cost is `C_sr = C_M(ES)EM` and instantaneous mapped power is `P_met = C_srv`.

The fitted velocity model is `v(t)=v_max(1−e^(−t/τ))`, acceleration is `a(t)=(v_max/τ)e^(−t/τ)`, and distance is `d(t)=v_max[t−τ(1−e^(−t/τ))]`. This maps transient acceleration to steady uphill cost and can require extrapolation beyond the measured +45% grade range.

### 8.2 Empirical uphill maximal-speed relation

Within the Delaney cohort and tested 5.2–17.6% grades, maximal sprint velocity fell about 1.7% per additional **degree** of hill angle. A narrow-range estimate is `v_max,G/v_max,flat ≈ 1−0.017θ_deg`. It must not be extrapolated to steep hills or endurance running.

### 8.3 Downhill overspeed

Ebben et al. observed the best acute outcome near −5.8° (about −10.2% grade), with mean maximal speed `+7.09%` and acceleration `+6.54%` versus flat. This is an observed cohort result, not a continuous downhill formula. Downhill impact and braking rise while oxygen cost may fall.

## 9. Worked examples

At 3.0 m·s⁻¹, 1,000 m at +5% takes 333.3 s, gains 49.94 m vertically, and projects 998.75 m horizontally. The Minetti polynomial gives a flat-energy-equivalent distance of approximately 1,301 m. RE3 estimates gross rate near 15.92 W·kg⁻¹; for 70 kg, gross energy is about 88.8 kcal. These are model outputs, not predicted race performance.

A 10,000 m treadmill belt session at +1% corresponds geometrically to about 99.995 m of vertical gain and 9,999.5 m horizontal projection.

Ten unstaggered full laps in lane 8 cover about 4,530.32 m, not 4,000 m. Race staggers remove that extra distance for properly marked starts.

## 10. Guardrails

The calculators will label **steady-state** models separately from **sprint** models. They will not infer injury risk from metabolic cost, claim treadmill and outdoor identity, assign a calorie multiplier to surfaces without metabolic data, or treat lower downhill oxygen cost as lower tissue load. Inputs outside measured ranges will trigger warnings rather than silent extrapolation.
