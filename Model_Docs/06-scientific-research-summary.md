# STRIDE OS Scientific Research Summary

## Executive recommendation
Build STRIDE OS around a **Bayesian recency-weighted latent ability model** anchored by **long-term capability**, adjusted by **event proximity**, **athlete archetype**, **trend**, **data quality**, and **bounded context modifiers**, with explicit **confidence scoring**.

## 1. Time decay models for athletic performances

### Exponential decay / EWMA
Formula:
```text
w_i = exp(-λ * age_i)
```
or with half-life:
```text
w_i = 2^(-age_i / h)
```

Why it works:
- widely used in forecasting, finance, and workload/readiness systems
- smooth discounting of stale performances
- highly interpretable for coaches

Pros:
- simple
- stable
- computationally cheap
- easy to explain

Cons:
- one curve alone is too crude
- does not separate current form from career capability

### Dual-timescale decay
Use two streams:
```text
RecentForm = EWMA(h_short)
LongTermCapability = EWMA(h_long)
Ability = a * RecentForm + (1-a) * LongTermCapability
```

Recommended conceptual half-lives:
- short: ~45–90 days
- long: ~12–36 months

### Bayesian updating
Treat long-term capability as a prior and recent races as noisy evidence.

Model:
```text
θ ~ N(μ0, τ0²)
y_i ~ N(θ, σ_i² / w_i)
```

Posterior mean:
```text
E[θ|data] = (μ0/τ0² + Σ(w_i * y_i / σ_i²)) / (1/τ0² + Σ(w_i / σ_i²))
```

Why this is strong:
- old PRs become anchors, not dictators
- recent races update that anchor
- uncertainty is explicit
- one odd race is less likely to hijack the prediction

### State-space / Kalman models
Useful for later phases.

Model:
```text
θ_t = θ_(t-1) + η_t
y_t = θ_t + ε_t
```

Best use cases:
- when STRIDE OS later ingests training load, HRV, injury status, and readiness data

### Elo/Glicko-style concepts
Useful mainly for:
- inactivity increases uncertainty
- recent results tighten confidence

Not ideal as the main prediction engine because race performance is continuous, not just win/loss.

## 2. Physiological retention curves

### Core evidence pattern
Aerobic qualities decay faster with detraining than sprint/neuromuscular qualities.

Common research themes:
- VO2max can decline meaningfully within 2–4 weeks of cessation
- blood/plasma volume drops early
- oxidative/mitochondrial adaptations regress within weeks
- strength/speed qualities are often more durable short-term

### Practical implication
A stale endurance PR should usually lose predictive value faster than a stale sprint PR if training continuity is poor.

### Running economy
Running economy is relatively durable, but race-specific economy and target-pace familiarity can fade with inactivity.

## 3. How much should a 3-year-old PR count?
It depends on:
- training continuity
- event type
- athlete age
- injury history
- recent trend

Practical starting guidance for a 3-year-old PR:
- sprint/power event: retain roughly 50–70%
- middle-distance event: retain roughly 35–60%
- aerobic/endurance event: retain roughly 20–45%

These values should be lower when there is:
- repeated layoff
- major injury
- clear decline
- older masters age

## 4. Multi-PR confidence scoring
Prediction should include:
- point estimate
- confidence %
- label
- explanation

Confidence should depend on:
- recency
- event proximity
- number of performances
- consistency across performances
- verified vs estimated marks
- contextual comparability

Suggested labels:
- Very High
- High
- Moderate
- Low
- Exploratory

## 5. Longitudinal athlete trend modeling
Trend matters.

Recommended features:
- trend slope over last 6–24 months
- progression velocity
- curvature: improving, plateauing, declining
- age-adjusted interpretation

Examples:
- 22:00 → 21:10 → 20:15 suggests development
- 20:00 → 20:45 → 21:20 suggests decline/detraining

## 6. Event correlation strength
Conclusion:
**event relationships should be pair-specific and athlete-type-specific.**

General rules:
- 100 ↔ 200: strong
- 200 ↔ 400: strong
- 400 ↔ 800: meaningful but archetype-sensitive
- 800 ↔ 1500: strong
- mile ↔ 5K: strong
- 100 ↔ 400: noisier
- 400 ↔ 5K: weak without other anchors

Important middle-distance insight:
800m performance depends on both:
- aerobic capacity
- anaerobic/speed reserve

That supports multi-input modeling rather than single-source conversion.

## 7. Athlete archetype detection
Suggested archetypes:
- speed-biased
- balanced middle-distance
- aerobic-biased
- masters maintenance
- returning/post-injury

Inference ideas:
- residuals across normalized event performances
- anaerobic speed reserve
- critical speed / threshold markers
- fatigue index / pace loss

## 8. Environmental + context weighting
Context should matter, but lightly.

Most practical adjustments:
- altitude
- heat
- humidity
- wind for sprint events
- indoor vs outdoor
- banked vs flat indoor
- tactical/championship vs paced race

Recommendation:
Use bounded corrections rather than major model rewrites.

## 9. Existing models: strengths and weaknesses

### Riegel
Strengths:
- simple
- useful baseline for endurance-range predictions

Weaknesses:
- too one-dimensional
- poor across very different event families
- not personalized enough

### VDOT
Strengths:
- familiar
- practical for endurance equivalence

Weaknesses:
- compresses athlete into one scalar
- weak for atypical speed/endurance profiles

### Purdy / World Athletics scoring tables
Strengths:
- strong normalization layer
- useful as cross-event comparison currency

Weaknesses:
- population-based, not individualized

### Critical speed
Strengths:
- physiologically meaningful
- useful for 1500m+ modeling

Weaknesses:
- not a full all-events model

### Banister / fitness-fatigue / WKO-style ideas
Strengths:
- useful for readiness/form overlay

Weaknesses:
- should not replace performance history modeling

## 10. Final scientific recommendation
Best overall design:
```text
Prediction =
Bayesian update of current latent ability
using:
  long-term capability anchor
  + recency-weighted recent evidence
  + event proximity weighting
  + quality/confidence weighting
  + archetype adjustment
  + bounded context modifiers
```

## Key citations

### Time decay / uncertainty / forecasting
- https://bjsm.bmj.com/content/51/3/209
- https://www.tandfonline.com/doi/full/10.2147/OAJSM.S231405
- https://glicko.net/glicko/glicko.pdf
- https://journals.sagepub.com/doi/full/10.1177/17479541221100311
- https://cran.r-project.org/web/packages/kalmanfilter/vignettes/kalmanfilter_vignette.html

### Detraining / retention / physiology
- https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1334766/full
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9398774/
- https://pubmed.ncbi.nlm.nih.gov/10966148/

### Event modeling / performance models
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10858092/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8505327/
- https://worldathletics.org/news/news/scoring-tables-2025
- https://pubmed.ncbi.nlm.nih.gov/5527258/
- https://vdoto2.com/calculator

### Cross-event / archetype / middle-distance physiology
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8176219/
- https://journals.humankinetics.com/abstract/journals/ijspp/14/4/article-p501.xml
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8363530/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12181339/

### Environment / context
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4602249/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6422510/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5504588/
- https://ncaaorg.s3.amazonaws.com/championships/sports/crosstrack/common/XTF_FacilityIndexingConversionSummary.pdf
