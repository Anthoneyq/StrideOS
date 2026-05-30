# STRIDE OS Product Spec / PRD

## Product goal
Build a race prediction engine that is:
- more accurate than static equivalency calculators
- adaptive to recency, athlete type, and development trend
- physiologically plausible
- interpretable to coaches
- confidence-aware rather than falsely precise

## Core problem
Current STRIDE OS overweights stale historical PRs.

Example:
- 400m PR from 2 weeks ago
- 5K PR from 3 years ago

Desired behavior:
- the 400m strongly informs current short/mid predictions
- the 3-year-old 5K still contributes as historical capability
- but with reduced authority and wider uncertainty

## Primary users
- performance coaches
- self-coached athletes
- long-term development systems
- multi-event athletes
- return-to-run / return-to-race planning contexts

## Product principles
1. Recent evidence should dominate current prediction.
2. Older PRs should remain as capability anchors.
3. Same-family or adjacent events should influence more than distant events.
4. Athlete phenotype matters.
5. Prediction confidence should be explicit.
6. The model should stay understandable to a coach.
7. Context should matter, but not overcomplicate UX.

## Functional requirements

### Inputs
STRIDE OS should accept:
- event
- mark/time
- date
- verified vs estimated
- indoor/outdoor
- wind if relevant
- altitude if available
- heat/humidity if available
- race type: paced / normal / tactical / championship / time trial
- optional injury-return flag
- optional training continuity flag

### Outputs
For each target event:
- predicted time
- confidence %
- confidence label
- explanation string
- contributing source performances
- actual-result override when recent real mark exists in that event

### Confidence labels
- Very High
- High
- Moderate
- Low
- Exploratory

### Explanations
Each prediction should generate plain language like:
- "Driven mostly by your recent 800m and mile performances."
- "Older 5K PR retained as long-term capability anchor."
- "Confidence reduced because your longest relevant race is over 18 months old."
- "Prediction adjusted toward endurance because your profile is aerobic-biased."

## Non-functional requirements
- fast enough for real-time UI updates
- deterministic and explainable
- modular enough to tune later
- usable with sparse athlete histories
- robust to outlier marks
- able to improve via calibration later

## MVP scope
Implement:
1. normalized cross-event scoring layer
2. dual-timescale recency engine
3. event graph proximity weighting
4. quality/confidence weighting
5. basic athlete archetype classifier
6. Bayesian update core
7. coach-facing explanation layer

Do not include in MVP:
- full HRV integration
- full training-load modeling
- advanced black-box ML models
- dense weather modeling beyond bounded adjustments

## Recommended implementation priority

### Phase 1
- normalization layer
- event graph
- recent vs long-term decay streams
- quality weighting
- confidence labels
- actual-result override

### Phase 2
- Bayesian posterior core
- archetype inference
- trend engine
- reason codes
- masters/youth/returning logic

### Phase 3
- context adjustment refinement
- readiness/training-load integration
- calibration tooling
- coach dashboard diagnostics

## Success criteria
The system should feel:
- intelligent
- adaptive
- coach-aware
- physiologically plausible
- statistically defensible
- superior to static calculators
