# STRIDE OS Coach-Facing Explanation

## What STRIDE OS is doing
STRIDE OS predicts race performances by combining:
- recent races
- older PR history
- nearby event relationships
- athlete bias toward speed or endurance
- overall confidence in the available data

It does not treat all PRs equally.

## Simple explanation for coaches

### 1. Recent races matter most
If an athlete raced recently, that result should influence current predictions more than a race from years ago.

### 2. Older PRs still matter
Older PRs still tell us what the athlete has historically been capable of. They do not disappear completely.

### 3. Similar events predict better
An 800m is more useful for predicting a mile than a 100m is. A mile is more useful for predicting a 5K than a 400m is.

### 4. Athlete type matters
Two athletes with the same 800m PR can have very different projections if:
- one is more speed-based
- the other is more aerobic

### 5. Confidence matters
Predictions are more trustworthy when they are based on:
- recent marks
- multiple performances
- nearby events
- verified races
- consistent profile data

## Athlete-facing language
Use this directly in UI/help text.

### Recency
"Recent performances are weighted more heavily than older PRs."

### Historical retention
"Older PRs still contribute because long-term adaptations and demonstrated capability still matter."

### Confidence
"Predictions are most reliable when based on recent races in similar events."

### Low-confidence cases
"When your profile relies on older, estimated, or distant-event marks, predictions become more exploratory."

### Returning athletes
"If you’re returning from injury or a long gap, STRIDE OS preserves some historical capability but lowers confidence until recent race evidence returns."

## Coaching rules by athlete type

### Speed-biased athlete
- shorter-event marks get more trust
- sprint-to-middle predictions stay stronger than distance projections
- endurance projections need more caution unless supported by recent aerobic evidence

### Aerobic-biased athlete
- longer-event marks get more trust
- mile/3K/5K relationships strengthen
- sprint projections stay more conservative

### Balanced middle-distance athlete
- 400/800/1500 relationships are strong
- adjacent-event predictions can be relatively trusted

### Masters athlete
- recent data matters more
- old endurance PRs should decay more aggressively
- confidence bands should widen with staleness

### Returning/post-injury athlete
- old PRs remain a ceiling clue, not a current guarantee
- confidence should be visibly reduced
- recent race/workout evidence should quickly reclaim importance

## Practical coaching examples

### Example 1
Athlete inputs:
- 400m in 54.8 from 2 weeks ago
- 5K in 18:20 from 3 years ago

Better STRIDE OS behavior:
- 400m strongly influences current 400/800 estimates
- old 5K still lightly informs aerobic capacity
- 5K-based influence is reduced because it is stale
- confidence for long predictions is moderate or low unless recent aerobic support exists

### Example 2
Athlete inputs:
- 5K: 22:00 → 21:10 → 20:15 over 3 years

Interpretation:
- trend indicates development
- recent evidence should outweigh oldest result
- old mark matters mainly as progression context

### Example 3
Athlete inputs:
- 20:00 → 20:45 → 21:20

Interpretation:
- likely decline or detraining
- model should reduce trust in historical peak
- recent marks should dominate

## Suggested UI copy

### Prediction card
- Predicted 1500m: 4:36
- Confidence: 72% — High
- Why: Driven mainly by recent 800m and mile results. Older 5K retained as long-term aerobic anchor.

### Exploratory card
- Predicted 5K: 18:58
- Confidence: 38% — Exploratory
- Why: Estimate relies on a recent 400m plus an older 1500m. No recent aerobic race available.
