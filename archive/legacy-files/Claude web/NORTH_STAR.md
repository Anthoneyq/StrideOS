# CoachLab: North Star
## The Long-Term Vision

---

## STATUS NOTE

**This is a vision document.** It describes where CoachLab is going, not what STRIDE OS does today. Features described here are aspirational. The companion document, *STRIDE OS Master Plan v2*, describes what currently exists and ships.

This document exists because shipping a calculator without a coherent long-term vision risks building a calculator that has no future. The North Star ensures every v1 decision is made with the destination in mind.

---

## ONE-SENTENCE VISION

**CoachLab becomes the longitudinal performance interpretation infrastructure for human athletic development — a continuously-updating, evidence-organized representation of each athlete that helps coaches understand state, identify constraints, and predict adaptation response.**

---

## THE CORE INSIGHT

Most performance tools today are **outcome-focused**:
- What did the athlete run?
- What's their PR?
- What pace should they train at?

CoachLab evolves toward **mechanism-focused**:
- Why can the athlete run that?
- What systems are limiting further improvement?
- How does this athlete respond to specific interventions?
- What's the probability of adaptation given a stimulus?

This is the shift from prediction to interpretation. From static to adaptive. From calculator to digital twin.

---

## THE ELEVEN DIMENSIONS OF MATURE COACHLAB

Following sport science framings (Galpin-style), the mature CoachLab system models eleven dimensions of athlete state. None are fully built in v1. Some are partially captured by current schema. All are deliberate North Star targets.

### 1. Energy System Distribution

**What it is:** Quantification of the athlete's relative reliance on ATP-PC, glycolytic, and aerobic energy systems across event durations.

**Why it matters:** Two athletes with identical 1600m times may have very different physiological profiles. Training prescriptions should differ accordingly.

**Currently measurable from STRIDE OS:** Coarse inference from cross-event PR patterns (fast 400m relative to 5K = anaerobic-leaning).

**Eventually measurable with:** Lactate testing, VO₂max testing, or sophisticated wearable inference.

### 2. Force-Velocity Profile

**What it is:** Mechanical output characterization — max velocity, acceleration profile, stride mechanics, ground contact time, stiffness, fatigue decay.

**Why it matters:** Explains *why* the athlete performs as they do, not just *what* they perform.

**Currently measurable from STRIDE OS:** Nothing directly.

**Eventually measurable with:** Timing gates, force plates, video analysis (markerless pose estimation), or partnered wearable integration.

### 3. Adaptation Response Modeling

**What it is:** How an athlete responds to specific training stimuli. The "responder profile."

**Why it matters:** Two athletes with identical current PRs may respond very differently to the same training. Knowing which is which transforms programming.

**Currently measurable from STRIDE OS:** Foundational — once 6+ months of logged training and race data exist, we can begin to see response patterns.

**This is the most valuable future capability.** It is the closest thing to a real moat.

### 4. Fatigue State Modeling

**What it is:** Distinguishing structural fatigue (tissue load), CNS fatigue (neural output), metabolic fatigue (glycogen/lactate), hormonal stress, and psychological fatigue.

**Why it matters:** An athlete's "true fitness" is different from their "current readiness." Predictions should be state-dependent.

**Currently measurable from STRIDE OS:** Coarse inference from race-to-race performance variation, optional recovery/sleep logging.

**Eventually measurable with:** HRV trends, sleep architecture (via wearables), training load monotony analysis, mood/RPE logs.

### 5. Developmental Trajectory

**What it is:** How likely is this athlete to improve dramatically? Growth velocity potential rather than current performance.

**Why it matters:** A 14-year-old is not a finished phenotype. Some athletes plateau early; some bloom late. Coaches need to know which pattern applies.

**Currently measurable from STRIDE OS:** Foundational — multi-year PR tracking is captured in v1 schema. Cross-population comparisons (HS → NCAA → Masters in our corpus) provide reference distributions.

**This is the most immediately accessible North Star feature.** With 12–24 months of data, basic developmental trajectory modeling becomes feasible.

### 6. Event Transfer Mapping

**What it is:** Physiological mapping of how capacities transfer between events. A great 800m athlete may map to 400m, 1500m, steeple, cycling pursuit, rowing.

**Why it matters:** Talent identification. A coach may discover an athlete is suited to an event they've never tried.

**Currently measurable from STRIDE OS:** Foundational via Event Fit Review. Mature version requires cross-sport data.

**Eventually measurable with:** Multi-sport athlete data partnerships, physiological characterization beyond running.

### 7. Environmental Adaptability

**What it is:** Individual response to heat, humidity, altitude, cold. Some athletes are heat responders; some collapse in humidity.

**Why it matters:** Currently STRIDE OS applies *population-average* corrections. Mature version applies *individual* corrections.

**Currently measurable from STRIDE OS:** Foundational — race-day conditions are captured in v1 schema. Individual response patterns emerge with longitudinal data.

**Eventually measurable with:** Sweat rate testing, thermoregulation tracking, altitude training response patterns.

### 8. Recovery Efficiency

**What it is:** How quickly the athlete returns to baseline after training stress. HRV recovery slope, sleep architecture, glycogen restoration, injury recurrence patterns.

**Why it matters:** Adaptive training dosing — the right load for this athlete in this state.

**Currently measurable from STRIDE OS:** Optional self-reported recovery rating in v1 schema.

**Eventually measurable with:** HRV wearables, sleep tracking integration, structured recovery questionnaires.

### 9. Genetic & Epigenetic Interaction

**What it is:** Probabilistic interpretation of genetic predispositions (ACTN3, ACE, collagen genes, mitochondrial efficiency).

**Why it matters:** Genes influence ceilings, not destiny. But over time, patterns of genetic variants correlate with training response.

**Currently measurable from STRIDE OS:** Nothing.

**Eventually possible with:** Voluntary genetic testing integration (partnered services). Must be handled with extreme care — never deterministic, always probabilistic, always with informed consent. **Galpin-style emphasis here is essential.**

### 10. Movement Economy

**What it is:** Energetic efficiency. Oxygen cost per speed, stiffness, braking forces, asymmetry, stride adaptation under fatigue.

**Why it matters:** Two athletes with identical VO₂max can have very different race performance due to economy differences.

**Currently measurable from STRIDE OS:** Nothing directly.

**Eventually measurable with:** Wearable IMU integration, video gait analysis, structured biomechanical screens.

### 11. Psychological Stability Under Load

**What it is:** **Behaviorally measurable patterns** — not subjective "mindset scores." Race execution consistency, pacing stability under pressure, performance volatility.

**Why it matters:** Champions at every level share emotional regulation under competitive stress. This is observable from race data.

**Currently measurable from STRIDE OS:** Foundational — race execution patterns are visible in detailed splits (when captured).

**Eventually measurable with:** Split-level race data, competitive context tags, optional structured journaling.

**Critical principle:** Never inferred "psychology" without behavioral grounding. Always tied to measurable patterns.

---

## THE EVOLUTION: FROM PREDICTION TO ADAPTIVE CAPACITY

The most important shift CoachLab makes is from this:

> *"What pace should this athlete run?"*

To this:

> *"What is the current state of this organism, what systems constrain it, and what is its probability of responding to specific stimuli?"*

That reframing changes everything downstream. The metric that matters is no longer PR or VDOT or pace. It becomes:

### Adaptive Capacity

**The athlete's probability of improvement given a specific training stimulus.**

This is the ultimate North Star metric. It cannot be measured directly. It is inferred over time from:

- Training stimulus logged
- Recovery state measured
- Subsequent performance change observed
- Cross-validated against population reference patterns

Building this metric requires accumulated longitudinal data — which begins with STRIDE OS v1 and matures over years.

---

## CONSTRAINT-BASED MODELING

Closely related to Adaptive Capacity is the shift toward constraint-based modeling.

Today: "This athlete is a 4:20 miler."

Mature CoachLab: "This athlete is constrained by:
- Velocity ceiling (limit at 100m)
- Aerobic durability (decay rate over 30+ minutes)
- Lactate buffering capacity
- Tissue resilience to high training loads
- Recovery rate from intense sessions
- Movement economy (oxygen cost per pace)
- Neural fatigue resistance"

Then training becomes **constraint removal** — identify the limiting system, prescribe interventions to address it, measure adaptation.

This is how elite-level coaching already operates intuitively. CoachLab makes it explicit and data-driven.

---

## THE LONGITUDINAL DATABASE — THE TRUE MOAT

Formulas are commodified. Pacing math is published. Environmental corrections are in textbooks.

**What is not commodified, and cannot be quickly replicated, is a multi-year longitudinal dataset of athlete development with associated training context, recovery patterns, environmental conditions, and outcomes.**

Once mature, CoachLab's database contains:

- Millions of training-stimulus-to-adaptation-response pairs
- Across ages, environments, genetic backgrounds, training styles
- Event transitions, injury histories, recovery profiles
- Cross-population reference distributions

At that point, predictions are no longer derived from theory. They are derived from **empirical pattern matching against the largest longitudinal adaptation dataset in human running development.**

That is potentially revolutionary. It is also unattainable in less than 3–5 years.

**STRIDE OS v1 is the first capture node of that database.** Every coach who uses it contributes — anonymously, with consent — to the eventual goldmine.

---

## THE PATH FROM STRIDE OS V1 TO MATURE COACHLAB

### Year 1: STRIDE OS (Pacing + Data Capture Foundation)

- Coaching-facing pacing calculator (Master Plan v2)
- Full Path B data schema underneath
- Backend with auth, privacy, consent framework
- Validation against UIL + NCAA + WMA corpora
- 100+ coaches contributing data

### Year 2: Strength & Recovery Integration

- Optional integration of strength benchmarks (vertical jump, 1RM estimates)
- Optional integration of wearable data (HRV, sleep)
- Cross-domain Event Fit (running profile + strength profile)
- Recovery efficiency surfacing
- 500+ coaches, 5,000+ athletes

### Year 3: Adaptation Response Modeling

- First version of Adaptive Capacity Metric
- Training intervention → response tracking
- Responder/non-responder profiling
- Developmental trajectory predictions (HS → college projection)
- Research partnerships activated

### Year 4: Constraint-Based Programming

- Mechanism-aware prescriptions
- Movement economy integration (partnered wearable data)
- Environmental adaptability profiles
- Talent identification tools for college recruitment

### Year 5+: Mature CoachLab

- Multi-sport platform
- Genetic interaction (probabilistic, opt-in)
- Athlete digital twin modeling
- Federation-level adoption
- Reference data for sport science research

---

## WHAT MUST BE TRUE FOR THIS VISION TO REALIZE

### Technical

- Backend that scales to 100k+ athletes
- Data schema that doesn't require migration as features mature
- Privacy infrastructure that survives regulatory scrutiny across jurisdictions

### Organizational

- Solo operator with AI assistance for v1–v2
- Recruit sport scientist advisor by year 2
- Add engineer or co-founder by year 3
- Build research partnerships by year 3

### Cultural

- Trust from coaches that the platform serves them, not the other way around
- Trust from athletes/parents that data is protected
- Trust from researchers that methodology is rigorous
- Trust from federations that the system is institutional-grade

### Philosophical

- Never overclaim what's measured
- Never display analysis that isn't validated
- Always tag claims by inference layer (L1–L5)
- Always preserve the Coach Override Doctrine

---

## WHAT CANNOT BE TRUE

A few things this vision is **not**:

- It is not "AI coaching" — it is decision support
- It is not athlete replacement of coaching judgment — it is augmentation
- It is not deterministic prediction — it is probabilistic interpretation
- It is not unique-to-CoachLab science — it organizes published science
- It is not a wearable manufacturer — it integrates with wearables
- It is not a meet management system — it consumes results from them
- It is not a research substitute — it is a research collaborator

These boundaries protect the platform's credibility and clarify what it competes against.

---

## CLOSING

CoachLab's long-term value is not in pacing calculations. Pacing is the entry point — the deliverable that ships first, validates the methodology, and earns the trust required to expand.

The long-term value is in becoming the **organized memory of human athletic development** — a place where every training intervention, every adaptation response, every environmental challenge, and every developmental trajectory contributes to a reference database that helps the next coach, the next athlete, and the next researcher.

That is the destination. STRIDE OS is the first step.

---

**Document Version:** 1.0 (North Star)
**Last Updated:** May 20, 2026
**Owner:** CoachLab
**Status:** Internal/strategic — informs but does not gate v1 shipping
**Companion documents:** *STRIDE OS Master Plan v2*, *The Bridge Map*, *Backend Architecture Plan*
