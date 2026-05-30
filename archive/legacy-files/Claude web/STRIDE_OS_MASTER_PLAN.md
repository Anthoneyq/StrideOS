# STRIDE OS: Master Plan Document
## CoachLab Fitness System — Phase 1 Validation

---

## ONE-SENTENCE THESIS

**CoachLab is the unified fitness coaching platform; STRIDE OS is the validated pacing calculator we're shipping first to prove the methodology, calibrate our data architecture, and establish the foundation for multi-disciplinary coach integration.**

---

## WHAT THIS DOCUMENT IS FOR

This document unifies understanding across:
- **Researchers** — validation methodology, data requirements, accuracy benchmarks
- **Running Coaches** — how the calculator works, what it surfaces, how it changes practice
- **Strength & Conditioning Coaches** — how running data informs broader athlete development
- **Software Engineers** — data schema, validation logic, multi-event cross-validation
- **Program Administrators** — athlete tracking, team import, data governance
- **Investors / Stakeholders** — the long-term vision and why we're starting here

**Everyone should be able to find their role and understand how it connects to the whole.**

---

## PART 1: THE COACHLAB VISION

CoachLab is a unified athlete development platform that synthesizes data across multiple coaching domains — running, strength, power, recovery, psychology — to make better training decisions and predict athlete potential.

STRIDE OS (the pacing calculator) is **Phase 1: Validation.** We're shipping a focused, rigorous tool for running pace prescription because:

1. Running metrics are objective and measurable (times don't lie)
2. Running has established peer-reviewed prediction formulas (Riegel, Daniels, Cameron, Vickers)
3. Running data reveals physiological patterns that inform broader athlete development
4. Success here proves our multi-formula validation logic works before expanding to strength, power, psychology

**STRIDE OS is not the final product. It's the proof of concept.**

---

## PART 2: STRIDE OS SCOPE & PURPOSE

### What STRIDE OS Does

STRIDE OS is a pacing calculator for running coaches that:

1. **Prescribes training paces** for distances the coach specifies (80% pace, tempo pace, threshold pace, race pace, etc.)
2. **Forecasts race times** across multiple distances by cross-validating multiple published formulas
3. **Identifies event mismatch** by analyzing an athlete's performance profile across distances
4. **Corrects for environment** (heat, altitude) using published sport science
5. **Tracks athlete development** over time to validate whether formulas predict accurately
6. **Accumulates validation data** that will eventually retrain our ensemble approach

### What STRIDE OS Does NOT Do (in v1)

- Prescribe strength training or conditioning
- Analyze movement quality or biomechanics
- Make psychology-based recommendations
- Handle field events (jumping, throwing)
- Manage meets or results directly (integrates with UIL data, doesn't replace meet management)
- Create periodization or macrocycle planning

**Why this scope:** We need to ship something that coaches can validate in 4-8 weeks with their own athletes. Once we have 100+ coaches using STRIDE OS and feeding back validation data, we understand the error patterns and can expand to strength, power, and psychology integration.

---

## PART 3: THE PACING PROBLEM STRIDE OS SOLVES

### The Core Issue

Running coaches currently use **multiple disconnected tools** because no single tool handles all distances well:

| Tool | Strength | Weakness |
|---|---|---|
| VDOT (Daniels) | 1500m–10K | Systematically overestimates marathon; poor for 400m |
| Riegel | All distances | Exponent (1.06) is fixed; doesn't adapt to individual |
| McMillan / Strava | Easy to use | Black box; no methodology transparency |
| V.O2 | Familiar to coaches | Limited cross-validation; doesn't surface event mismatch |
| Spreadsheets | Customizable | Labor-intensive, inconsistent, unmaintainable |

**STRIDE OS consolidates these.** One tool that:
- Uses **multiple formulas** (Riegel, Daniels, Cameron, Vickers, Purdy)
- **Cross-validates** them (if 9 formulas agree and 1 disagrees, the disagreement is flagged as data)
- **Adapts per athlete** (ensemble weights shift based on event distance, athlete age, training age)
- **Transparently cites** all sources (researchers can evaluate the methodology)
- **Accumulates validation data** (we see what predictions were wrong and why)

---

## PART 4: DATA ARCHITECTURE & VALIDATION LOGIC

### The Core Insight: Formula Cross-Validation

The ensemble approach is based on a simple principle: **no single formula is universally accurate.** Instead, we use formula disagreement as information.

#### Example: Your Wife's 400m Plateau

Your wife ran 60.09 – 60.39 seconds in the 400m for a full year with no improvement. Why? STRIDE OS would surface this:

**What the formulas tell us:**

- **Riegel prediction** (from her 800m time): 59.2 seconds
- **Daniels VDOT** (from her 800m): 59.8 seconds
- **Cameron formula** (distance-variant): 60.1 seconds
- **Actual performance**: 60.09 – 60.39 seconds consistently

**The insight:** The formulas predict she *should* be faster. The plateau isn't a formula error — it's a coaching signal.

Possible explanations STRIDE OS helps surface:
- She's at her aerobic ceiling; needs anaerobic (speed) work to improve the 400m
- She's fatigued or under-recovered (formulas assume peak fitness)
- She needs a different training stimulus (time under tension, not just intensity)
- She's psychologically suited to 800m–1500m (good aerobic, less anaerobic drive)

**STRIDE OS doesn't answer "why" directly.** But by showing formula disagreement patterns over time, it tells the coach where to look.

#### How This Works Algorithmically

For any athlete:

```
Input: Race distance D1, time T1, target distance D2
Process:
  1. Calculate prediction for D2 using Riegel, Daniels, Cameron, Vickers, Purdy
  2. Check each formula against athlete's historical PRs
  3. Weight each formula based on "how accurate was this for this athlete in past"
  4. Return weighted ensemble prediction + 95% confidence interval
  5. Flag if any formula deviates >5% from ensemble (data point)
```

**The validation layer:**

```
Over time:
  - Coach logs athlete's actual race at D2
  - Compare predicted time vs actual time
  - Update formula weights: "Riegel was off by 2%; Daniels was off by 0.5%"
  - Use that to improve next prediction for similar athlete (Daniels > Riegel for distance runners)
```

### Multi-Event Validation: The Core Advantage

This is where STRIDE OS becomes more than a calculator.

**Traditional approach:** Coach logs 800m PR, uses it to predict 1600m, coaches the 1600m, sees the race result. One data point.

**STRIDE OS approach:**

```
Athlete PRs logged:
  - 400m: 58.2
  - 800m: 2:04.5
  - 1600m: 4:32.1
  - 5K: 15:47.3

STRIDE OS cross-validates:
  - Use 400m to predict 800m, 1600m, 5K → compare to actual
  - Use 800m to predict 400m, 1600m, 5K → compare to actual
  - Use 1600m to predict 800m, 5K → compare to actual
  - Use 5K to predict 1600m → compare to actual
  
Result: Four independent validation points for one athlete from one data set
```

**Why this matters for accuracy:** If Daniels predicts the 1600m within 1% but the 5K prediction is off by 5%, we learn that Daniels is distance-distance-dependent. That becomes data we use to improve predictions for the next athlete with a similar profile.

---

## PART 5: EVENT MISMATCH & ATHLETE POTENTIAL

### The Problem STRIDE OS Surfaces

Many young athletes are assigned to events based on **current performance**, not physiological aptitude. Examples:

**Example 1: The 5K runner who loves 400m**

- 12-year-old girl: ran 2:24 in 800m, 5:45 in 1600m (distance profile), but wants to run 400m
- Current 400m time: 65 seconds (slow for her fitness)
- Coach thinks: "She's not a 400m runner, keep her in distance"
- STRIDE OS perspective: "Her 800m suggests she has aerobic strength. With speed work, her 400m potential is ~62 sec. She may have high motivation in the 400m because she has untapped anaerobic potential. Try it."

**Example 2: The cross-country kid who hates it**

- 14-year-old boy: runs 5K XC in 16:20 (slow for his fitness)
- 800m PR: 1:54 (fast, indicates strong anaerobic)
- Cross-country times flatline for two years
- Coach thinks: "He's not a distance runner, drop him"
- STRIDE OS perspective: "High 800m vs weak 5K suggests he's anaerobic-dominant, not aerobic-dominant. He may be misclassified. Try middle-distance (800m–1600m) and see if motivation improves."

**This is Event Fit Review** — analyzing whether an athlete's PRs across distances make physiological sense, and identifying potential in events they haven't tried.

### Tracking Potential: Multi-Year Validation

STRIDE OS accumulates historical data:

```
Athlete: Marcus (age 12 in 2024)
2024:
  - 800m: 2:18
  - 1600m: 4:55
  - 5K: 16:40
  Prediction for age 15: 1600m could be 4:30–4:35 (aerobic dominant)

2025 (age 13):
  - 800m: 2:12
  - 1600m: 4:48
  - 5K: 16:15
  Updated prediction for age 15: still tracking to 4:30–4:35

2026 (age 14):
  - 800m: 2:06
  - 1600m: 4:40
  - 5K: 15:50
  Updated prediction for age 15: On track. High confidence 4:28–4:32

(Age 15 comes): Actual 1600m: 4:29
Validation: Formula was right. Marcus IS aerobic-dominant.
```

**This is the long-term ROI:** After 3–4 years of data, we can tell a 12-year-old girl with high confidence: "Based on your current times and how athletes like you develop, you have the physiology to run 4:45 in the 1600m by college. Here's what that requires." That's powerful information for recruitment, motivation, and coaching.

---

## PART 6: THE VALIDATION DATA PIPELINE

### Where Data Comes From

**Tier 1: UIL State Meet Results (Texas)**
- 1,299 verified state meet records (2023–2025)
- All distances: 100m, 200m, 400m, 800m, 1600m, 3200m, 5K XC
- Classification: 1A–6A, both boys and girls
- Usage: Benchmark accuracy, compare to national norms, surface state-level talent

**Tier 2: Coach-Submitted Data (Multi-State)**
- Individual coach records from integrated programs
- Youth (7–12 grade) through college-bound (HS)
- Multi-event PRs over time, training notes, race conditions
- Usage: Validate ensemble across broader population, surface patterns

**Tier 3: Voluntary Research Participation**
- Coaches who agree to structured data sharing
- Full training logs, not just race results
- Recovery metrics, feedback on whether predictions matched experience
- Usage: Calibrate ensemble weights, identify error patterns

### What Data Is Tracked

**Per Athlete:**
```
- Name (masked for privacy research)
- Age / Grade
- School (masked for privacy research)
- Sex
- Training age (years of competitive running)
- Primary event & secondary events
- All PRs by distance (100m through 10K)
- Historical PRs (2–3 year lookback when available)
- Race conditions (temperature, altitude, humidity when available)
- Coach notes (optional: "recovering from illness," "first time at distance," etc.)
```

**Per Race:**
```
- Date
- Event
- Time
- Location
- Weather (if available)
- Placement / competition level
- Notes on execution ("ran conservative," "kicked hard," "mechanical issue")
```

**Per Prediction:**
```
- Input race (distance, time)
- Target distance
- Formula predictions (Riegel, Daniels, Cameron, Vickers, Purdy)
- Ensemble prediction (weighted)
- Confidence interval
- Actual race result (when it comes in)
- Prediction error
```

### The Accuracy Benchmark

STRIDE OS will be considered successful when:

1. **Overall prediction error < 3%** (across all distances for 100+ athletes)
   - Example: Predicting 4:45 for a 1600m, actual is 4:39–4:51
   - Current state-of-art: VDOT ~4%, Riegel ~5%, McMillan varies

2. **Distance-specific calibration** (each event distance has its own accuracy floor)
   - Example: 1600m predictions < 2% error, 400m < 4% error (anaerobic is harder to predict)

3. **Multi-event consistency** (if we predict from 800m, 1600m, and 5K, ensemble agrees within 1%)
   - Disagreement > 1% means data quality issue or athlete variation

4. **Age/grade adjusted** (predictions for 12-year-olds are validated separately from college-bound athletes)

---

## PART 7: HOW RESEARCHERS USE STRIDE OS DATA

### What Researchers Can Extract

**For Exercise Physiology Research:**

```
Question: "How does aerobic-anaerobic balance predict 400m vs 5K potential?"
Data available:
  - 500+ athletes with 400m and 5K PRs
  - Historical progression data (how 400m time correlates with future 5K time)
  - Formula error rates by distance
  - Environmental corrections (heat/altitude impact by event type)

Output: Regression model showing predictive power of 400m for 5K, adjusted by age/sex
```

**For Training Adaptation Research:**

```
Question: "Do coaches who use predicted paces improve more than those who don't?"
Data available:
  - Year-1: Control coaches (no pacing guidance)
  - Year-2: Intervention coaches (using STRIDE OS paces)
  - Measure: Season-over-season improvement rates, injury rates, dropout rates

Output: Evidence whether data-driven pacing improves outcomes
```

**For Recruitment & Scholarship Research:**

```
Question: "Can we predict college 1600m from HS times in specific grade windows?"
Data available:
  - Juniors (grade 11) with 1600m times: X
  - Same athletes as college freshmen: Y
  - Formula accuracy: Does prediction made in grade 11 match college performance?

Output: Validation of predictability windows (when can we confidently project college performance?)
```

### Researcher Access & Privacy

**Data is shared in three tiers:**

**Public Tier:**
- Aggregate benchmarks only (e.g., "average HS girl's 1600m time by state/class")
- No individual athlete names or schools
- Formulas and methodologies
- Open for citation

**Institutional Tier** (with signed agreement):
- De-identified athlete data (age, grade, performance, no names/schools)
- Multi-year progressions
- Formula errors per distance
- For academic research only

**Proprietary Tier** (STRIDE team only):
- Identified data with school/coach
- Used to retrain ensemble weights
- Not shared externally
- Kept separate from research data

---

## PART 8: HOW COACHES USE STRIDE OS

### The Daily Workflow

**Monday Planning:**
1. Coach logs athletes (one-time import from spreadsheet or manual entry)
2. For each athlete, enters best PRs across distances they've raced
3. STRIDE OS shows Event Fit Review (is this athlete well-matched to their primary event?)
4. Coach selects the race they're training for (e.g., "1600m at State in April")
5. STRIDE OS shows target paces for the next 12 weeks

**During Week:**
1. Coach pulls STRIDE OS on phone before practice
2. Types in today's workout distance and duration
3. STRIDE OS calculates target pace for the group
4. Coach prints splits or reads them aloud

**After Race:**
1. Coach logs the result
2. STRIDE OS recalibrates predictions for that athlete
3. Coach sees whether predictions were accurate

### What STRIDE OS Shows Coaches

**Event Fit Review:**
- "This athlete's 800m and 1600m times are consistent with a distance runner, but 400m is weak. Recommend focusing on 1600m–5K for college recruitment."
- "This athlete shows anaerobic strength (fast 400m) but weak 1600m. Try interval training, not long steady runs."
- "This athlete's times across distances are inconsistent with their reported training. Check: is the athlete recovering? Is the coach overtraining?"

**Race Forecasts:**
- "If she runs the 1600m this April, expect 4:42–4:52 (95% confidence) based on current 800m and 5K times."
- "Confidence is low because she hasn't raced the 1600m yet. Once she runs it, prediction improves."

**Pacing Prescriptions:**
- "For threshold work (90% race pace): 6:30/mile (or 4:02/km)"
- "For tempo (85% race pace): 6:55/mile"
- "For easy (70% race pace): 8:15/mile"

**Environmental Corrections:**
- "Normal 5K pace: 6:15/mile. Today's race is at 5,000 ft elevation and 85°F. Adjusted pace: 6:35/mile. Coach decision: run conservative or push?"

---

## PART 9: HOW STRENGTH COACHES INTEGRATE WITH STRIDE OS

### In v1 (Running Calculator Only)

Strength coaches don't use STRIDE OS directly. But they **read the Event Fit Review** to understand athlete strengths/weaknesses:

```
Example:
Running coach reports (via STRIDE OS): "Hannah is anaerobic-dominant (fast 400m, weak 5K)"
Strength coach thinks: "She needs lactate buffering and aerobic base, not just pure power.
  Recommend: 3×/week threshold intervals + 1×/week power-endurance work"
```

### In v2+ (Integrated CoachLab)

STRIDE OS becomes the **running module** of CoachLab. Strength coaches see:

```
Hannah's profile:
  - Running: anaerobic-dominant, needs aerobic base
  - Strength: Lower body power weak (vertical jump 18", should be 20"+)
  - Recovery: Sleep 6–7 hrs (should be 8–9)

Coaching decision: "Add power work + better sleep before aerobic training will help"
```

**This is the long-term vision.** For now, strength coaches just read the reports.

---

## PART 10: VALIDATION TIMELINE & SUCCESS METRICS

### Phase 1: Launch to 10 Coaches (April 2024 – May 2024)

**Goal:** Find the bugs, understand user behavior, collect first validation data

**Success metrics:**
- 10 coaches use daily
- At least 100 athlete records
- At least 50 races logged after launch
- No critical bugs
- Coaches complete feedback survey

**Data collected:**
- Which features coaches use most (calculator, forecasts, event fit)
- Where they drop off (onboarding, athlete import, etc.)
- What feedback they give ("This prediction was way off")

### Phase 2: Expand to 100 Coaches (June 2024 – September 2024)

**Goal:** Validate core formulas, identify distance-specific error patterns, prove formula cross-validation

**Success metrics:**
- 100 coaches, 2,000+ athlete records
- 500+ races logged with predictions
- Formula error < 4% (current state-of-art: 4–5%)
- Event Fit Review matches coach intuition (measure via survey: "Did this match your coaching experience?")
- Retention: 80%+ of cohort still using

**Data collected:**
- Full ensemble validation (which formulas predict which distances best?)
- Age/grade-specific calibration (do 12-year-olds predict differently than 16-year-olds?)
- Environmental correction validation (do heat/altitude adjustments work?)

### Phase 3: National Expansion (October 2024 – )

**Goal:** Prove the model across US demographics, establish STRIDE OS as the standard

**Success metrics:**
- 500+ coaches, 10,000+ athlete records
- Formula error < 3% (better than any standalone tool)
- Multi-event consistency validated
- Recruitment scouts using STRIDE OS to evaluate prospects
- Tier 2 research institutions requesting data for studies

---

## PART 11: ROADMAP FOR COACHLAB INTEGRATION

### Year 1: STRIDE OS (Pacing)
- Running paces across all distances
- Multi-event cross-validation
- Environmental correction
- Event Fit Review
- Race Forecasts

### Year 2: Strength Integration
- Track vertical jump, broad jump, 1RM estimates
- Cross-validate running potential with strength potential
- "Athlete is aerobic-strong but power-weak" insights
- Recommend strength interventions to improve running

### Year 3: Recovery & Psychology
- Sleep tracking, soreness, perceived exertion integration
- Fatigue state vs training intensity match
- Psychological profile vs event choice (why does he hate the 400m even though he's good at it?)
- Detect overtraining, burnout risk

### Year 4: Recruitment & Eligibility
- College coach recruiting tools
- Scholarship eligibility prediction
- "At current trajectory, you can get recruited to D1/D2/D3" insights
- Compliance with NCAA rules (reporting limitations, privacy)

---

## PART 12: PRIVACY & DATA GOVERNANCE

### What Coaches Own

**Coach owns:**
- Athlete names, schools, grades
- All race results and training data
- Export their own data anytime
- Delete their account and all associated data

**STRIDE OS owns:**
- De-identified prediction accuracy data (used to retrain formulas)
- Aggregate benchmarks (e.g., "average 1600m time by state")
- Right to use anonymized data for research

### Data Storage & Security

- All athlete data stored locally in coach's browser (no cloud dependency for core functionality)
- Optional cloud backup requires explicit opt-in
- No third-party vendor access
- Encryption in transit (HTTPS only)
- No data sold or shared with third parties

### Research Data Separation

- Coaches choose to participate in research (opt-in, not default)
- Research data stored separately from operational data
- De-identification happens before research use
- Coaches can see exactly what data was shared

---

## PART 13: SUCCESS DEFINITION

STRIDE OS is successful when:

1. **Coaches consolidate tools** — at least 50% of users report canceling another running app because STRIDE OS replaced it

2. **Predictions are accurate** — formula error < 3% across 500+ validated athletes

3. **Coaches trust the methodology** — > 80% of coaches read at least one source paper

4. **Research community engages** — at least 3 peer-reviewed studies cite STRIDE OS validation data

5. **Event Fit Review prevents mistakes** — coaches report changing athlete event assignments based on STRIDE OS insights

6. **CoachLab integration is evident** — strength coaches are reading running reports and adjusting programming

7. **Recruitment changes** — college coaches use STRIDE OS to evaluate HS talent

8. **Retention is high** — 80%+ of cohort remains active after 6 months

---

## PART 14: FOR EACH STAKEHOLDER — THE KEY QUESTION TO ASK

**Researchers:** "Can I trust this data for my study? What are the limitations?"
- Answer: Yes, with caveats. See Part 7 for tier structure and accuracy benchmarks.

**Running Coaches:** "Will this save me time and make my athletes faster?"
- Answer: Yes. See Part 8 for the daily workflow and how predictions surface coaching signals.

**Strength Coaches:** "How does this affect my program?"
- Answer: Not directly in v1. See Part 9 for how to use Event Fit Review, and the roadmap for where it goes.

**Coders:** "What's the architecture and how do I contribute?"
- Answer: See Part 4 for the validation logic and data pipeline.

**Athletes / Parents:** "How is my data used?"
- Answer: See Part 12 for privacy and data governance.

**Program Administrators:** "How do I get my whole team in the system?"
- Answer: Import via CSV (names, schools, grades, PRs). See Part 5 for data schema. One admin can populate entire team.

**Investors:** "What's the business case?"
- Answer: See Part 1 (CoachLab vision), Part 10 (validation timeline), and Part 11 (5-year roadmap).

---

## APPENDIX: THE EXAMPLE THAT TIES IT TOGETHER

### Your Wife's 400m Plateau: What STRIDE OS Would Show

**Year 1 (age 35):**
- 800m PR: 2:08.4
- 400m PR: 60.09
- Training: 4×/week, mostly aerobic base

Predictions:
- Riegel → 400m should be 59.1
- Daniels VDOT → 400m should be 59.8
- Cameron → 400m should be 60.2
- Ensemble → 400m should be 59.8 ± 1.2 sec

Actual: 60.09 (matches ensemble, slightly high end)

**Month 2 (age 35):**
- 800m still 2:08.4
- 400m: 60.14, 60.23, 60.39 (three races, no improvement)

Signal: "Formula says 59.8, actual is 60.2. This athlete is 0.4 sec off where she should be. Either: (a) formulas are wrong for her, or (b) something in training/recovery/physiology changed."

Coach thinks: "Last month she was at the top of ensemble range. Now she's drifting slower. Why?"

**Options the data surfaces:**
1. She's fatigued (aerobic base work isn't enough; needs threshold to improve)
2. She's psychologically more suited to 800m (which she runs faster than formula predicts)
3. She needs anaerobic speed work (fast repeats, not just threshold pace)
4. She's at her genetic ceiling for 400m and should focus on 800m

**Year 2 (age 36):**
- Coach adjusts training: adds speed work, maintains 800m
- 400m improves to 59.8 (matches formula)
- 800m stays 2:08 (plateau)

New insight: "She responded to speed work. Formula was right. The 400m limiting factor was speed, not aerobic base."

**This is what STRIDE OS enables:**
- Transparent tracking of why formulas were right or wrong
- Data-driven coaching adjustments instead of guessing
- Long-term validation that accumulates understanding

---

## CLOSING: WHY THIS MATTERS

CoachLab's long-term vision is to give coaches **superpowers:** the ability to see athlete potential clearly, make evidence-based decisions, and integrate feedback from running, strength, recovery, and psychology into one coherent coaching plan.

STRIDE OS is the first step. It proves that:
1. Multi-formula validation works
2. Coaches will trust transparent methodology
3. Data accumulation enables long-term improvement
4. Running metrics surface broader coaching signals

From here, we add strength integration, then recovery, then psychology. Each module gets validated with real coaches and real athletes before the next one ships.

This is not a running app. **This is the infrastructure for the next generation of coaching.**

---

**Document Version:** 1.0  
**Last Updated:** May 20, 2026  
**Owner:** CoachLab  
**Audience:** All stakeholders, researchers, engineers, coaches, administrators  
**Status:** Foundation document for STRIDE OS v1 launch