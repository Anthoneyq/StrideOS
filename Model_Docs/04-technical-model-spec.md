# STRIDE OS Technical Model Spec

## System overview
Use 5 engines:
1. Normalization Engine
2. Recency Engine
3. Event Correlation Engine
4. Archetype Engine
5. Confidence Engine

Optional later:
6. Readiness / State Engine

## 1. Normalization Engine
Convert performances across events into a common comparison scale before weighting them.

Recommended approach:
- World Athletics scoring tables as a baseline normalization layer
- or an internal equivalent-performance score aligned to event-specific conversion logic

## 2. Recency Engine
Use two recency streams.

### Recent Form
Short half-life:
```text
R_short = 2^(-age_days / h_short)
```

Suggested starting values:
- sprint: 120 days
- middle-distance: 90 days
- endurance: 75 days

### Long-Term Capability
Long half-life:
```text
R_long = 2^(-age_days / h_long)
```

Suggested starting values:
- sprint: 900 days
- middle-distance: 720 days
- endurance: 540 days

## 3. Composite Evidence Weight
For each performance `i` predicting target event `j`:

```text
W_ij = R_ij * P_ij * Q_i * T_i * C_i * A_ij
```

Where:
- `R_ij` = recency weight
- `P_ij` = event proximity weight
- `Q_i` = data quality weight
- `T_i` = trend modifier
- `C_i` = context comparability modifier
- `A_ij` = archetype compatibility modifier

## 4. Event Proximity Engine
Use an event graph:

```text
100 ↔ 200 ↔ 400 ↔ 800 ↔ 1500/mile ↔ 3K/3200 ↔ 5K ↔ 10K ↔ HM ↔ Marathon
```

Base proximity rule:
```text
P_ij = exp(-γ * d(i,j))
```

Where `d(i,j)` is graph hops.

Suggested default:
```text
γ = 0.35 to 0.60
```

Interpretation:
- same event: 1.00
- adjacent event: 0.70–0.85
- two hops: 0.45–0.65
- distant jump: 0.15–0.40

## 5. Long-Term Capability Anchor
Build an athlete-specific anchor from older results.

```text
μ0_j = weighted mean of normalized historical equivalents for target event j
```

Using:
```text
w_long_i = R_long_i * Q_i * C_i
```

This anchor answers:
> What has this athlete historically shown they are capable of?

## 6. Bayesian Update Core
For target event `j`, let latent current ability be `θ_j`.

### Prior
```text
θ_j ~ N(μ0_j, τ0_j²)
```

### Observations
Each source performance becomes a target-equivalent observation:
```text
y_ij ~ N(θ_j, σ_ij² / W_ij)
```

### Posterior mean
```text
θ̂_j = (μ0_j/τ0_j² + Σ(W_ij * y_ij / σ_ij²)) / (1/τ0_j² + Σ(W_ij / σ_ij²))
```

### Posterior variance
```text
Var(θ_j) = 1 / (1/τ0_j² + Σ(W_ij / σ_ij²))
```

This yields:
- prediction estimate
- uncertainty estimate
- natural handling of sparse data

## 7. Data Quality Weight `Q_i`
Suggested structure:
```text
Q_i = verification * source_quality * consistency
```

Suggested defaults:
- verified official race: 1.00
- likely accurate race result, not verified: 0.90
- hand-timed or questionable: 0.70
- estimated mark: 0.50
- self-projected guess: 0.30

## 8. Trend Modifier `T_i`
Estimate recent direction of development.

Suggested method:
```text
trend_slope = slope(score ~ date)
```

Convert to bounded weight:
```text
T_i = clamp(1 + k * trend_slope, 0.85, 1.15)
```

## 9. Archetype Engine `A_ij`
Classify athlete phenotype:
- speed-biased
- balanced
- aerobic-biased
- masters maintenance
- returning/post-injury

Suggested base score:
```text
ArchetypeScore = speed_side_residual - endurance_side_residual
```

Suggested modifier range:
```text
A_ij ∈ [0.80, 1.20]
```

Use cases:
- 400→800 stronger for balanced or speed-endurance athletes
- mile→5K stronger for aerobic-biased athletes
- 100→400 weakened if no speed-endurance evidence exists

## 10. Context Weight `C_i`
Keep it light and bounded.

Suggested factors:
- altitude
- heat
- humidity
- wind
- indoor/outdoor
- banked/flat track
- tactical/championship vs paced race

Default bounds:
```text
C_i ∈ [0.85, 1.05]
```

Use context mainly to:
- reduce confidence
- modestly adjust trust in a mark
- avoid fake precision

## 11. Confidence Engine
Effective evidence size:
```text
n_eff = (ΣW)^2 / Σ(W²)
```

Confidence score:
```text
Conf = sigmoid(
  a
  + b*log(n_eff)
  - c*sqrt(Var(θ_j))
  - d*event_gap_penalty
  - e*staleness_penalty
  - f*injury_return_penalty
  - g*context_missing_penalty
)
```

Suggested labels:
- 85–100: Very High
- 70–84: High
- 55–69: Moderate
- 40–54: Low
- <40: Exploratory

## 12. Special athlete logic

### Masters
- stronger age-sensitive downgrading of stale endurance anchors
- slightly wider uncertainty
- more reliance on recent evidence

### Youth / developing athletes
- higher trend sensitivity
- lower authority for old PRs
- greater uncertainty if recent development is steep

### Returning / post-injury athletes
- retain historical anchor
- aggressively widen uncertainty
- reduce trust in old marks without recent run-specific support

## 13. Prediction flow
```text
Athlete performances
    ↓
Normalize to common score
    ↓
Compute recency, quality, context, event proximity
    ↓
Infer archetype
    ↓
Estimate development trend
    ↓
Build long-term capability anchor
    ↓
Convert source marks into target-equivalent observations
    ↓
Bayesian posterior update
    ↓
Apply confidence engine
    ↓
Return prediction, confidence, reasons, actual-result override if applicable
```

## 14. MVP pseudocode
```python
def stride_predict(target_event, marks, athlete):
    normalized = normalize_marks(marks)
    archetype = infer_archetype(normalized, athlete)
    trend = compute_trend(normalized)

    anchor_weights = []
    anchor_values = []
    for m in normalized:
        w = long_decay(m) * quality_weight(m) * context_weight(m)
        anchor_weights.append(w)
        anchor_values.append(convert_to_target_equivalent(m, target_event, archetype))

    mu0 = weighted_mean(anchor_values, anchor_weights)
    tau0 = estimate_anchor_uncertainty(normalized, athlete)

    obs = []
    for m in normalized:
        R = short_decay(m)
        P = event_proximity(m.event, target_event)
        Q = quality_weight(m)
        T = trend_modifier(m, trend)
        C = context_weight(m)
        A = archetype_modifier(m.event, target_event, archetype)
        W = R * P * Q * T * C * A

        y = convert_to_target_equivalent(m, target_event, archetype)
        sigma = observation_noise(m, athlete)
        obs.append((W, y, sigma))

    theta, var = bayesian_update(mu0, tau0, obs)
    conf, label, reasons = confidence_engine(obs, var, athlete, target_event)

    return {
        "prediction": denormalize_to_time(theta, target_event),
        "variance": var,
        "confidence": conf,
        "label": label,
        "reasons": reasons
    }
```
