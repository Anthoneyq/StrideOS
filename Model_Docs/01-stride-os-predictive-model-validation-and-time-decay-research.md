# STRIDE OS Predictive Model Validation + Time Decay Research

## Executive Summary

Recommended STRIDE OS direction:

1. Weight **recent performances** heavily.
2. Preserve **older PRs** as a slower-decaying **capability anchor**, not as equal evidence of current fitness.
3. Use **event-distance correlation weighting**.
4. Adjust by **athlete archetype**.
5. Add **trend modeling**.
6. Add **confidence / uncertainty scoring**.

Core principle:

> Do not let a 3-year-old PR act like current fitness.
> But do not throw it away either; treat it as evidence of long-term capability.

---

## 1. Time-Decay Models for Athletic Performances

### A. Exponential Decay

**Formula**

`w_recency = exp(-λΔt) = 2^(-Δt / h)`

Where:
- `Δt` = time since performance
- `λ` = decay rate
- `h` = half-life

**Why it works**
- Standard forecasting approach
- Easy to tune
- Easy to explain to coaches
- Handles irregular race spacing well

**Coaching interpretation**
- “A mark from 90 days ago counts about half as much as a mark from today.”

**Recommendation**
- Use as the **core recency layer**.

---

### B. Rolling Weighted Average

**Formula**

`ŷ = Σ(w_i y_i) / Σw_i`

with hand-set weights like `5,4,3,2,1`

**Pros**
- Very coach-friendly
- Simple to explain

**Cons**
- Arbitrary cutoffs
- Weak for sparse race histories

**Recommendation**
- Good baseline, not ideal as the sole engine.

---

### C. Bayesian Updating / Shrinkage

**Formula**

`E[θ|data] = (μ0/τ0² + Σ(w_i y_i / σ_i²)) / (1/τ0² + Σ(w_i / σ_i²))`

Where:
- `μ0` = prior ability / long-term anchor
- `τ0²` = prior uncertainty
- `σ_i²` = observation noise
- `w_i` = recency/context weight

**Why it matters**
- Recent races drive current prediction
- Old PRs still matter
- Confidence tightens as evidence improves

**Recommendation**
- Best main engine for STRIDE OS.

---

### D. State-Space / Kalman-Style Forecasting

**Simple form**

State:
`x_t = x_(t-1) + b_(t-1) + η_t`

Observation:
`y_t = x_t + ε_t`

Where:
- `x_t` = latent current ability
- `b_t` = trend
- `η_t`, `ε_t` = process and observation noise

**Why it’s useful**
- Formalizes current shape, trend, and uncertainty

**Recommendation**
- Excellent v2/v3 model behind the scenes.

---

### E. Elo / Glicko-Style Systems

**Best use**
- Competitive ranking and uncertainty from inactivity

**Weakness**
- Less natural for actual race-time prediction

**Recommendation**
- Secondary feature only.

---

### F. Banister Impulse-Response / Fitness-Fatigue

**Formula**

`P_t = P0 + k1 Σ(u_s exp(-(t-s)/τ1)) - k2 Σ(u_s exp(-(t-s)/τ2))`

Where:
- training creates both fitness and fatigue
- fatigue decays faster

**Recommendation**
- Great overlay if STRIDE OS has training-load data.

---

## 2. Physiological Retention Curves

### Core Finding
Different qualities decay at different rates.

### General pattern from detraining research
- **VO2max / aerobic fitness:** declines relatively quickly with detraining
- **Blood volume / cardiac output:** often drop early
- **Mitochondrial enzyme activity:** declines with training cessation
- **Running economy:** somewhat stickier, but may lag in return after layoffs
- **Max force / sprint traits:** often retained better than aerobic capacity
- **Repeated sprint ability / sharpness:** can decline quickly without exposure

### Practical implication
A 3-year-old PR should not have one universal weight.

It should retain different value depending on:
- athlete type
- event family
- age
- training continuity
- return-from-injury status

---

### Split old PR influence into 2 pieces

#### A. Direct current-fitness evidence
“How much should this old mark influence what we think the athlete can race right now?”

This should decay **fast**.

#### B. Historical capability anchor
“What does this old mark tell us about what this athlete has proven possible?”

This should decay **slowly**.

---

### Suggested formulas

**Direct evidence weight**

`w_direct = exp(-Δt / τ_direct)`

**Capability-anchor weight**

`w_anchor = floor + (1 - floor) * exp(-Δt / τ_anchor)`

Where:
- `τ_direct < τ_anchor`
- `floor > 0` so proven history never fully disappears

---

### Suggested starting parameters

#### Sprint / speed events
- direct half-life: **60–120 days**
- anchor half-life: **12–24 months**
- floor: **0.15–0.25**

#### Middle distance
- direct half-life: **75–120 days**
- anchor half-life: **12–18 months**
- floor: **0.10–0.20**

#### Aerobic / distance
- direct half-life: **90–150 days**
- anchor half-life: **9–18 months**
- floor: **0.08–0.18**

---

### 3-year-old PR guidance

As **current-performance evidence**:
- usually **5–20%** depending on continuity

As **long-term capability anchor**:
- often **15–35%**
- more for mature trained sprinters / returning athletes
- less for youth athletes and clear detraining

Product rule:
- A 3-year-old PR should rarely drive prediction directly.
- It should mostly influence the **prior / ceiling / archetype inference**.

---

## 3. Multi-PR Confidence Scoring

Recommended confidence formula:

`C = R × G × V × S × N × M`

Where:
- `R` = recency factor
- `G` = event-gap factor
- `V` = verification/context factor
- `S` = consistency factor
- `N` = sample-depth factor
- `M` = model-agreement factor

Clamp to `[0,1]`.

---

### A. Recency factor

`R = exp(-Δt / τ_conf)`

Example starting values:
- sprint/track: `τ_conf = 90 days`
- road/endurance: `τ_conf = 120–150 days`

---

### B. Event-gap factor

`G = exp(-|ln(D_target / D_source)| / λ_gap)`

Suggested:
- `λ_gap ≈ 0.7`

---

### C. Verification/context factor

Suggested:
- official FAT/chip race: `1.00`
- official hand-timed/manual: `0.92`
- certified road result: `0.90`
- track time trial: `0.80`
- GPS solo effort: `0.68`
- treadmill/manual estimate: `0.55`

Then apply small penalties for heat, altitude, wind, tactical races, etc.

---

### D. Consistency factor

Convert recent marks into equivalent score space and reduce confidence when they disagree.

Formula idea:

`S = exp(-RMSE_equiv / σ_ref)`

---

### E. Sample-depth factor

Example:
- 1 verified recent mark: `0.70`
- 2 marks: `0.82`
- 3 marks: `0.90`
- 4+ marks spanning nearby events: `1.00`

---

### F. Model-agreement factor
If internal models agree, raise confidence. If they diverge, widen the band.

---

### User-facing labels
- `85–100%` → High confidence
- `70–84%` → Moderate confidence
- `50–69%` → Low confidence
- `<50%` → Exploratory

---

## 4. Longitudinal Athlete Trend Modeling

### Why it matters
Athletes with the same recent PR may be moving in opposite directions.

### Recommended approach
Fit a weighted trend in normalized performance score.

**Formula**

`score_t = β0 + β1*time + ε`

Better:
- Use standardized score space where **higher is better**.

**Trend factor**

`T = clamp(1 + k * slope_z, Tmin, Tmax)`

Where:
- `slope_z = slope / SE(slope)`
- use modest caps so trend nudges, not dominates

### Age-aware trend
- **Youth:** faster improvement, old marks stale quickly
- **Prime-age adults:** more stable and predictive
- **Masters:** apply age adjustment before comparing old and new marks

---

## 5. Event Correlation Strength

### Core conclusion
Do not treat all event conversions equally.

Nearby events should be weighted stronger; distant events weaker; archetype modifies strength.

### Recommended event graph
- 100 ↔ 200
- 200 ↔ 400
- 400 ↔ 800
- 800 ↔ 1500/1600
- 1600 ↔ 3200
- 3200 ↔ 5K
- 5K ↔ 10K
- 10K ↔ Half
- Half ↔ Marathon

Predict through the graph instead of a single global curve.

---

## 6. Athlete Archetype Detection

### Recommended archetypes
- speed-biased
- balanced
- endurance-biased

Optional secondary labels:
- sprint-endurance specialist
- middle-distance specialist
- road-endurance specialist

### A. Individual slope
Fit:

`log(T) = a + α log(D)`

Interpretation:
- lower `α` = endurance-biased
- higher `α` = speed-biased

### B. Residual profile
Convert marks to a common score system and compare:
- short-event score average
- middle-event score average
- long-event score average

If short-event scores are systematically better → speed-biased.
If long-event scores are systematically better → endurance-biased.
If 800/1600 cluster is strongest → middle-distance specialist.

---

## 7. Environmental + Context Weighting

Recommended factors:
- altitude
- heat/humidity
- wind
- indoor vs outdoor
- track surface if meaningful
- tactical race vs paced race
- solo time trial vs official competition

Recommendation:
- Use these mostly as **quality modifiers** rather than huge raw-time conversion factors.

---

## 8. Existing Models and How to Use Them

### Riegel
`T2 = T1 × (D2/D1)^α`

**Role:** baseline only; personalize exponent if 2+ marks exist.

### Daniels VDOT
**Role:** one useful baseline / feature; not the whole engine.

### Purdy / World Athletics Scoring Tables
**Role:** excellent normalization backbone.

### Critical Speed / Critical Velocity
**Role:** useful physiological feature; not the universal master model.

### Banister Fitness-Fatigue
**Role:** readiness overlay if training data exist.

---

## 9. Recommended STRIDE OS Architecture

### High-level flow

```text
Raw performances
   ↓
Standardize / clean / verify
   ↓
Context tagging
(recency, event type, verification, weather, indoor/outdoor)
   ↓
Convert each mark into normalized equivalent-score space
(WA points + event graph + athlete-specific slope model)
   ↓
Apply weighting engine
(recency × event proximity × verification × consistency × archetype fit)
   ↓
Estimate latent current ability
(Bayesian shrinkage / state-space model)
   ↓
Apply trend adjustment
(improving / flat / declining)
   ↓
Generate target-event predictions
   ↓
Compute confidence / range / labels
   ↓
UI output:
Actual | Predicted | Confidence | Why
```

---

### Core pipeline details

#### Step 1 — Mark classification
Tag every performance with:
- event
- date
- official vs estimated
- indoor/outdoor
- context quality
- age at performance
- season block

#### Step 2 — Two-value interpretation of every mark
Every mark contributes as:
- **current-state evidence**
- **capability anchor**

#### Step 3 — Event graph conversion
Use event graph pathing, not one global extrapolation.

#### Step 4 — Latent ability estimation

`θ_target = posterior_mean(prior_anchor, weighted_recent_evidence)`

Practical form:

`θ = (μ_anchor / τ0² + Σ(w_i y_i / σ_i²)) / (1/τ0² + Σ(w_i / σ_i²))`

#### Step 5 — Combined weight formula
For performance `i` predicting target event `j`:

`w_ij = w_recency × w_gap × w_verify × w_context × w_consistency × w_archetype`

Suggested subcomponents:
- `w_recency = exp(-Δt / τ_domain)`
- `w_gap = exp(-|ln(D_j / D_i)| / λ_archetype)`
- rule-based `w_verify`
- context penalty/bonus
- consistency modifier
- archetype-fit modifier

#### Step 6 — Trend layer
Apply small trend adjustment:

`θ_final = θ + k * trend_score`

#### Step 7 — Confidence pipeline

`C = R × G × V × S × N × M`

Then build likely / aggressive / conservative ranges.

---

## 10. Pseudocode

```python
def predict_event(target_event, athlete_marks, athlete_profile):
    marks = preprocess_and_tag(athlete_marks)

    actual_recent = best_recent_actual_for_target(marks, target_event, days=180)
    if actual_recent:
        return actual_output(actual_recent)

    archetype = infer_archetype(marks, athlete_profile)

    prior_anchor = build_capability_anchor(
        marks=marks,
        target_event=target_event,
        archetype=archetype
    )

    evidence = []
    for mark in marks:
        eq_score = convert_mark_to_target_equivalent(
            source_mark=mark,
            target_event=target_event,
            archetype=archetype
        )

        w = (
            recency_weight(mark, target_event, archetype)
            * event_gap_weight(mark.event, target_event, archetype)
            * verification_weight(mark)
            * context_weight(mark)
            * consistency_weight(mark, marks)
            * archetype_fit_weight(mark.event, target_event, archetype)
        )

        evidence.append((eq_score, w, mark.variance))

    theta = bayesian_update(prior_anchor, evidence)

    trend = compute_weighted_trend(marks, target_event, archetype)
    theta_final = apply_small_trend_adjustment(theta, trend)

    confidence = compute_confidence(evidence, marks, target_event, archetype)
    interval = compute_prediction_interval(theta_final, confidence, evidence)

    return predicted_output(theta_final, interval, confidence, explanation=evidence)
```

---

## 11. Recommended Implementation Priority

### Priority 1 — Ship first
1. actual recent PR override
2. exponential recency weighting
3. event-gap weighting
4. verification/context weighting
5. confidence labels

### Priority 2
6. historical capability anchor
7. athlete archetype detection
8. trend adjustment

### Priority 3
9. Bayesian latent-state model
10. training-load / readiness overlay
11. advanced state-space forecasting

---

## 12. Practical Coaching Rules

### Core rules
- Recent performances matter most.
- Older PRs still matter, but mostly as evidence of long-term capability.
- Nearby events predict each other better than distant events.
- The model adapts to whether an athlete is speed-biased, balanced, or endurance-biased.
- Confidence decreases when results are old, inconsistent, estimated, or far from the target event.

### Athlete-facing explanations
- “Recent race results are weighted more heavily because they reflect current fitness best.”
- “Older PRs still contribute because they show proven long-term ability, but they count less than recent performances.”
- “This prediction is exploratory because the available results are old and come from distant event types.”
- “This athlete’s shorter-event performances are stronger than their longer-event performances, so sprint and middle-distance predictions are weighted more heavily.”
- “This athlete appears to be improving based on recent results, so the prediction leans slightly faster than historical average.”

---

## 13. Recommended STRIDE OS Defaults

### Recency interpretation tiers for UI
- `0–3 months`: Current evidence
- `3–6 months`: Strong evidence
- `6–12 months`: Moderate evidence
- `1–2 years`: Historical support
- `2+ years`: Long-term capability only

Implement continuously using:

`w = exp(-Δt / τ)`

Use the tiers only for explanation.

---

## 14. Strongest Recommendation in One Sentence

Use recent performances to estimate **current form**, use old PRs as a slower-decaying **capability prior**, and personalize everything with **event proximity + athlete archetype + confidence scoring**.

---

## Key References / Source Anchors

### Forecasting / weighting
- Hyndman, R.J. et al. *Forecasting with Exponential Smoothing* / ETS state-space methods  
  https://robjhyndman.com/expsmooth/  
  https://otexts.com/fpp2/ets.html
- Bayesian MARCEL / weighted-history projection analogy  
  https://www.pymc-labs.com/blog-posts/bayesian-marcel

### Running performance modeling
- Blythe, D.A.J. & Király, F.J. (2016). *Prediction and Quantification of Individual Athletic Performance of Runners.* PLOS One.  
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0157257
- World Athletics Scoring Tables 2025  
  https://worldathletics.org/news/news/scoring-tables-2025

### Physiology / detraining
- Mujika, I. & Padilla, S. review lineage; PubMed detraining review  
  https://pubmed.ncbi.nlm.nih.gov/2692122/
- Review on short- and long-term detraining and VO2max  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9398774/

### Energy systems / event physiology
- Spencer, M.R. & Gastin, P.B. (2001). *Energy system contribution during 200- to 1500-m running in highly trained athletes.*  
  https://pubmed.ncbi.nlm.nih.gov/11194103/

### Peak age / masters
- *Age at Peak Performance of Successful Track & Field Athletes*  
  https://journals.sagepub.com/doi/10.1260/1747-9541.9.4.651
- Masters endurance decline review  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC2375571/
