# The Bridge Map
## How STRIDE OS v1 Becomes Mature CoachLab

---

## PURPOSE

This document maps every shipping feature of STRIDE OS v1 to its role in the long-term CoachLab North Star.

The point is to show that **nothing in v1 is throwaway work.** Every architectural decision, every data field, every UI component contributes to the eventual mature platform.

This is the document that proves the v1 calculator is not "a calculator that happens to exist" — it is "the first capture node of CoachLab."

---

## THE BRIDGE TABLE

| v1 STRIDE OS Feature | North Star Dimension It Foundationally Serves | What Will Eventually Unlock |
|---|---|---|
| **Multi-formula ensemble (Riegel, Daniels, Cameron, Vickers, Purdy)** | Mechanism Awareness | Formula disagreement patterns will reveal which physiological systems are limiting performance for each athlete |
| **Multi-event cross-validation** | Constraint-Based Modeling | Comparing PRs across distances reveals limiting systems (aerobic, anaerobic, speed, durability) |
| **Event Fit Review** | Constraint-Based Modeling + Event Transfer Mapping | Identifying mismatches becomes the foundation for talent identification and cross-event recommendations |
| **Environmental correction (heat, altitude, humidity)** | Environmental Adaptability | Population-average corrections in v1; individual-response modeling in v2+ once longitudinal data accumulates |
| **Pace Guardrail (smart-defaulted)** | Developmental Trajectory | Automatic protection by age/training-age is the foundational form of developmental awareness |
| **Athlete profile (age, grade, training age, sex)** | Developmental Trajectory | These fields enable growth-velocity modeling once 2+ years of data per athlete exist |
| **Race PRs with date, location, conditions** | Adaptation Response Modeling | Time-stamped performance data is the raw material for adaptation curves |
| **Optional Daily Check-In (recovery, sleep, training notes)** | Fatigue State Modeling + Recovery Efficiency | Captured in v1, analyzed in v2+ — building the data set before features depend on it |
| **Race conditions (temperature, wind, surface)** | Environmental Adaptability | Per-race environmental tagging enables individual environmental response patterns |
| **Reliability tier on race data** | Validation Hierarchy | Distinguishing high-confidence from low-confidence race data prevents bad data from polluting future analyses |
| **Inference layer tagging (L1–L5)** | All North Star dimensions | Maintains scientific credibility by separating observation from interpretation |
| **Validation corpus (UIL + NCAA + WMA, n=1,817)** | Developmental Trajectory + Population Reference | Provides cross-age reference distributions for every analysis |
| **Backend (Supabase) with full data schema** | Longitudinal Database (the moat) | Captures coach-contributed data centrally for eventual cross-athlete pattern recognition |
| **Coach Override Doctrine (explicit)** | All North Star dimensions | Establishes the philosophical framing that scales as features expand |
| **Sources page with 40+ citations + validation corpora** | Scientific Credibility Infrastructure | Foundation for researcher trust when CoachLab approaches academic partnerships |
| **Coach + Program + Research access tiers** | Institutional Adoption | Schema-level support for federation/research integration in years 3+ |

---

## WHAT'S NEW IN V1 SCHEMA THAT WASN'T BEFORE

The Path B decision means v1 captures these fields silently — useful for future analysis, invisible (or optional) to coaches today:

### Athlete-Level Fields
- Training age (years competitive)
- Primary event + secondary events
- Multi-year PR history with dates
- Optional resting HRV baseline
- Optional typical sleep duration
- Optional injury history (free text)
- Optional menstrual cycle tracking (where consented)
- Demographics (age, sex, grade)
- Athlete consent flags (research opt-in, parental consent for under-13)

### Race-Level Fields
- Event, distance, time, place
- Date, location, conditions (temp, humidity, altitude, wind)
- Reliability tier
- Coach notes (free text)
- Pre-race state (taper, training context)
- Post-race notes (execution, tactics)

### Daily Check-In Fields (Optional)
- Recovery rating (1–10)
- Sleep hours
- Subjective fatigue
- Training session description
- Session intensity (1–10)
- Notes (free text)

### Prediction-Level Fields
- Input race (distance, time)
- Target distance
- Individual formula outputs
- Ensemble prediction
- 95% confidence interval
- Actual result when logged
- Prediction error
- Inference layer used for any flag

### Coach-Level Fields
- Account, authentication, subscription tier
- Team affiliation
- Research participation opt-in
- Data export/deletion timestamps

---

## DECISIONS THAT PAY OFF LONG-TERM

### Decision 1: Backend From Day One (Supabase)

**Short-term cost:** Extra 2–4 weeks of work before v1 ships. Some Supabase free-tier costs.

**Long-term value:** Every athlete-day of data accumulates centrally. The longitudinal database starts on day one rather than year two.

### Decision 2: Full Schema Now, Surface Later

**Short-term cost:** Slightly more complex onboarding (more optional fields).

**Long-term value:** No data migration when v2 features need fields that should have been there from the start.

### Decision 3: Inference Layer Tagging Everywhere

**Short-term cost:** More verbose feature design.

**Long-term value:** Scientific credibility from day one. Researchers can evaluate the methodology. Coaches understand what's observed vs. inferred.

### Decision 4: Validation Corpus on Sources Page

**Short-term cost:** None.

**Long-term value:** Demonstrates rigor at first touch with any skeptical reader. Foundation for academic credibility.

### Decision 5: Privacy & Consent Framework Before Coaches Sign In

**Short-term cost:** Several weeks of legal/documentation work before launch.

**Long-term value:** No regulatory liability when scaling. Trust with athletes, parents, and institutions.

### Decision 6: Coach Override Doctrine Explicit

**Short-term cost:** Marketing copy is slightly less exciting.

**Long-term value:** Defensible position when STRIDE OS predictions don't match outcomes. The coach was always the decider.

---

## WHAT'S DELIBERATELY NOT IN V1

These features are not in v1 — and that's the right call:

- **Adaptation response analysis** — needs 6+ months of data per athlete
- **HRV trend modeling** — needs wearable integration partnerships
- **Energy system quantification** — needs lactate or VO₂ data
- **Movement economy** — needs biomechanical sensor partnerships
- **Genetic interaction** — needs genetic testing partnerships + extreme regulatory care
- **Athlete-facing app** — coach is the primary user, athlete data flows through them
- **Meet management** — out of scope; integrate via UIL/TFRRS/timing partner data
- **Strength tracking** — separate CoachLab module, not v1

Each of these is a Year 2+ deliverable. None require throwing away v1 work.

---

## TIMELINE INTEGRATION

| Phase | What Ships | What Schema Already Captures | What's Unlocked |
|---|---|---|---|
| **v1 (Months 0–3)** | Pacing calculator, athletes, races, Event Fit, Race Forecasts | Full Path B schema, optional check-ins, reliability tiers | Coach feedback, first longitudinal accumulation |
| **v1.1 (Months 3–6)** | Polish, bug fixes, UX improvements based on feedback | Same | Validation data approaches statistical significance |
| **v2 (Months 6–12)** | Daily Check-In surface, basic recovery trends, polished forecasts | Adds wearable integration schema | First adaptation response signals visible |
| **v2.5 (Year 2)** | Strength integration (CoachLab Module 2) | Adds biomechanical fields | Cross-domain Event Fit |
| **v3 (Year 2–3)** | Adaptive Capacity Metric (alpha), Developmental Trajectory | Cross-population reference data | Research partnership activation |
| **v4 (Year 3+)** | Constraint-based programming, mechanism awareness | Full schema mature | Federation adoption, talent identification |

---

## THE KEY INSIGHT

Every line of v1 STRIDE OS code is a vote for what CoachLab eventually becomes.

By capturing the right data with the right schema and the right consent framework — even before we display analysis based on that data — we make the future possible without locking the present into a stale design.

This is the difference between **shipping a calculator** and **shipping the first node of an infrastructure.**

Both ship now. Only one of them scales.

---

**Document Version:** 1.0
**Last Updated:** May 20, 2026
**Owner:** CoachLab
**Status:** Internal architecture document
**Companion documents:** *STRIDE OS Master Plan v2*, *CoachLab North Star*, *Backend Architecture Plan*
