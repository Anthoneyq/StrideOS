# STRIDE OS: Master Plan (v2)
## CoachLab — Phase 1 Deliverable

---

## ONE-SENTENCE THESIS

**STRIDE OS is an evidence-informed decision support platform for pacing prescription and event analysis, built as the first capture node of CoachLab's longitudinal performance interpretation infrastructure.**

---

## WHAT THIS DOCUMENT IS

A shareable plan for STRIDE OS v1 — what it is, what it isn't, who it serves, how it works, how to evaluate it.

This document is structured so any reader can find their role:

- **Researchers** → Parts 4, 6, 7, 12
- **Running Coaches** → Parts 3, 5, 8
- **Strength & Conditioning Coaches** → Parts 9, 11
- **Software Engineers** → Parts 4, 6, 13
- **Athletes & Parents** → Parts 8, 12
- **Program Administrators** → Parts 5, 12, 13
- **Investors & Stakeholders** → Parts 1, 2, 10, 14

Each part stands alone. Cross-references in Part 14.

---

## PART 1: CONTEXT — COACHLAB AS THE UMBRELLA

CoachLab is a unified athlete development platform designed to synthesize data across multiple coaching domains — running performance, strength, power, recovery, environmental adaptation, and eventually psychology — into a coherent decision-support tool for coaches.

STRIDE OS is the first module. We chose to ship the pacing calculator first because:

1. Running performance is **objectively measurable** (race times don't lie)
2. Multiple peer-reviewed prediction formulas already exist (Riegel, Daniels, Cameron, Vickers, Purdy) — we don't have to invent the math, we have to validate the ensemble
3. Running data **surfaces broader signals** about athlete physiology that inform other coaching domains
4. Success here proves the validation methodology before we expand scope

**STRIDE OS is not the destination. It is the foundation.**

---

## PART 2: SCOPE — WHAT STRIDE OS V1 DOES AND DOES NOT DO

### What v1 Does

1. Calculates training paces from a race time across published intensity zones
2. Forecasts race times across distances using ensemble multi-formula validation
3. Identifies cross-event mismatch (Event Fit Review)
4. Corrects pace for environmental conditions (heat, altitude, humidity)
5. Tracks athlete development longitudinally over multiple races
6. Captures structured data for future analysis (training notes, recovery, conditions)
7. Cites peer-reviewed methodology transparently

### What v1 Does NOT Do

- Prescribe strength or conditioning training
- Analyze biomechanics or movement quality
- Make psychological recommendations
- Predict injury risk or detect overtraining
- Handle field events (jumps, throws)
- Replace meet management software
- Replace coaching judgment

**This scope is deliberate.** It's small enough to validate within 4–8 weeks of real coach use. Once validated, it expands.

---

## PART 3: THE PROBLEM STRIDE OS SOLVES

Running coaches currently consult **multiple disconnected tools** because no single tool handles all distances with rigor:

| Tool | Strength | Limitation |
|---|---|---|
| VDOT (Daniels Running Formula) | 1500m–10K range | Systematically misestimates marathon; weak for sprint events |
| Riegel | All distances, simple | Fixed exponent (1.06) — doesn't adapt to individual |
| McMillan, Strava, Garmin | Easy to use | Black-box methodology; no transparency for evaluation |
| Spreadsheets (Excel, Google Sheets) | Customizable | Labor-intensive, inconsistent, unmaintainable across teams |

**STRIDE OS consolidates these.** A single tool that:

- Uses **multiple formulas in ensemble**
- **Cross-validates** them against each other and against actual athlete performance
- **Transparently cites** all sources
- **Adapts weighting** based on event distance, age, and training context
- **Accumulates validation data** to improve over time

The pitch is consolidation: *replace three to five tools with one rigorous one.*

---

## PART 4: METHODOLOGY — INFERENCE LAYERS

Following the principle that scientific credibility requires distinguishing observation from interpretation, STRIDE OS organizes every output by inference layer:

| Layer | Description | Example |
|---|---|---|
| **L1: Direct Observation** | Measured race times, dates, conditions | Athlete ran 1600m in 4:32.1 on 2024-04-15 at 72°F |
| **L2: Mathematical Derivation** | Direct calculation from observed data | At 4:32.1 pace, target threshold pace = 6:08/mile |
| **L3: Pattern Recognition** | Cross-event analysis revealing relationships | Athlete's 400m and 1600m times suggest aerobic-dominant profile |
| **L4: Coaching Hypothesis** | Possible interpretations requiring coach validation | Athlete *may* benefit from increased speed work |
| **L5: Acknowledged Unknown** | Variables STRIDE OS cannot measure | Athlete's sleep, motivation, biomechanics, life stress |

**Every output in STRIDE OS is tagged by layer.** Coaches see clear separation between "this is what happened" and "this is one possible interpretation."

This is the structural difference between STRIDE OS and conventional pace calculators.

---

## PART 5: HOW COACHES USE STRIDE OS

### Anonymous Mode (Free Tier)

Open the calculator. Type a distance and time. Get pace prescriptions. No account required, no data saved.

Designed to immediately demonstrate value before any commitment.

### Coach Mode (Premium Tier)

1. **Add athletes** with PRs across distances they've raced
2. **Anchor athlete** as the basis for pace prescriptions
3. **View Event Fit Review** — does this athlete's profile match their primary event?
4. **Generate Race Forecasts** — predict race times across distances with confidence intervals
5. **Apply Environmental Corrections** — adjust paces for heat, altitude, humidity
6. **Track results over time** — log races, see formula accuracy improve

### Optional Daily Data Capture

For coaches who want richer analysis later, optional fields capture:
- Recovery rating (subjective 1–10)
- Sleep duration / quality
- Training notes (free-text)
- Race-day conditions and notes

**These fields are optional and clearly marked as "for future analysis."** STRIDE OS v1 does not analyze them yet. The data accumulates for v2+ validation.

---

## PART 6: VALIDATION DATASETS — THE EMPIRICAL CORPUS

STRIDE OS maintains validation corpora used to:
- Empirically calibrate ensemble weights
- Benchmark population-level performance distributions
- Validate confidence intervals
- Provide reference points across age and developmental stages

### Current Corpora (as of v1 launch)

| Dataset | Source | Records | Population | Age Range | Used As |
|---|---|---|---|---|---|
| **UIL Texas State Meet** | UIL Official (uil.tfresult.com, mychiptime.com) | 1,299 | Texas HS state qualifiers | 12–18 | HS developmental benchmark |
| **NCAA Division I** | TFRRS / NCAA Public Records | 284 | NCAA D1 outdoor + indoor championship qualifiers | 18–22 | Peak performance benchmark |
| **WMA / USATF Masters** | World Masters Athletics + USATF Masters | 234 | International masters championship qualifiers | 35–95 | Aging curve reference |

**Total corpus: 1,817 records across three populations spanning ages 12 to 95.**

### Documented Coverage Gaps

- **Recreational / non-elite athletes** — corpus is qualifier-level across all ages
- **Ages 22–35** — the "missing decade" between college and masters competition
- **Geographic representation outside Texas/USA** — limited
- **Field events** — not included in v1
- **Real-time longitudinal data** — corpus is cross-sectional; longitudinal tracking begins with coach-contributed data after launch

### Reliability Tiers

Each validation record is tagged by reliability:

| Tier | Definition | Example |
|---|---|---|
| **High** | Official championship timing, no environmental adjustment needed | State final, 65°F, no wind |
| **Moderate** | Verified but with potential confounders | Race in 85°F heat, or wind ≥10mph |
| **Low** | Verified result with significant confounders | Athlete returning from injury, unusual tactics |

Reliability affects how heavily a record influences calibration math.

### Data Sharing & Research Access

- **Aggregate benchmarks** (e.g., "average HS 1600m time by classification") are public and citable
- **De-identified individual records** are available to qualified researchers under signed agreement
- **Identified data** is never shared externally; used only for internal calibration

---

## PART 7: VALIDATION HIERARCHY — WHAT'S ESTABLISHED VS. EXPERIMENTAL

Following the principle that all claims should be tagged by evidence level:

| Feature | Status | Evidence Base |
|---|---|---|
| **Formula-based pacing (Riegel, VDOT, Cameron)** | Established | 40+ years of peer-reviewed sport science |
| **Multi-formula ensemble averaging** | Moderately validated | Cross-formula validation literature; our corpus partially validates |
| **Environmental corrections (heat, altitude)** | Moderately validated | Ely 2007, Wehrlin & Hallén 2006, Daniels 2014 |
| **Event Fit Review (cross-event mismatch detection)** | Emerging | Logical from physiology; empirical validation ongoing |
| **Confidence intervals from formula disagreement** | Emerging | Statistical methodology established; calibration in progress |
| **Athlete-specific formula weight calibration** | Experimental | Requires 100+ athletes of longitudinal data |
| **Adaptation response profiling** | Hypothetical | North Star feature; not currently implemented |
| **Psychological inference from performance patterns** | Hypothetical | Explicitly excluded from v1 |

**Coaches see status tags on every advanced feature.** Established features are shown without qualifier. Experimental features are explicitly marked.

---

## PART 8: DAILY WORKFLOW — HOW COACHES INTERACT WITH STRIDE OS

### The Pre-Practice Use Case (Phone)

Coach has 3 minutes before practice starts. Opens STRIDE OS, picks the athlete on screen, gets target paces for today's interval session. Done.

### The Weekly Planning Use Case (Laptop)

Coach plans Sunday night. Reviews each athlete's freshness (when was their last PR?), runs Race Forecasts for upcoming meets, considers Event Fit Review for athletes who may be misclassified.

### The Post-Race Use Case (Any Device)

Coach logs a race result. STRIDE OS compares the actual time to its prediction. Over time, prediction accuracy improves as the system learns each athlete's response patterns.

### What Coaches See

- **Clear, actionable outputs** when the inference layer is L1 or L2 (observed, derived)
- **Probabilistic, hedged language** when the inference layer is L3 or L4 (pattern recognition, hypothesis)
- **Explicit "unknown" markers** for L5 variables the system cannot measure

### The Coach Override Doctrine

**STRIDE OS surfaces signals. Coaches interpret context. The platform supports decisions; it does not replace coaching judgment.**

This principle is stated explicitly in the app, in the methodology section, and in every research output.

---

## PART 9: INTEGRATION WITH STRENGTH & CONDITIONING

### In v1 (Pacing Module Only)

S&C coaches do not use STRIDE OS directly. They consult the Event Fit Review for context on each athlete's running profile, which may inform programming.

Example:
> Running coach (via STRIDE OS): "Hannah's profile suggests anaerobic-dominant tendencies — strong 400m, less developed 5K."
> S&C coach: "Recommend lactate buffering work and aerobic base development to complement the running profile."

### In Future CoachLab Versions

STRIDE OS becomes one module among several. S&C coaches see running data alongside strength benchmarks (vertical jump, 1RM estimates, broad jump), recovery metrics, and movement quality data. Programming decisions become evidence-informed across domains.

**This integration is North Star territory — see CoachLab North Star document.**

---

## PART 10: VALIDATION TIMELINE & SUCCESS METRICS

### Phase 1 (Weeks 1–8): Coach Friend Network Launch

**Goal:** Find product bugs, understand user behavior, collect first real-world validation data.

**Success metrics:**
- 10 coaches using STRIDE OS daily or weekly
- 100+ athlete records
- 50+ race results logged
- No critical bugs
- Feedback survey completed by all 10 coaches

### Phase 2 (Months 3–9): Expansion to 100 Coaches

**Goal:** Validate ensemble methodology across broader population, identify error patterns.

**Success metrics:**
- 100 coaches, 2,000+ athlete records
- 500+ races logged with prediction-vs-actual comparisons
- Ensemble error <4% across distances (current state-of-art: 4–5%)
- Coach retention >80% at 6 months

### Phase 3 (Months 9–18): Research Partnership

**Goal:** Bring validated dataset to research community.

**Success metrics:**
- Approach 3–5 sport scientists with real data
- At least one peer-reviewed validation study initiated
- Public-facing methodology document refined based on academic feedback

### Phase 4 (Year 2+): Scale & Institutional Adoption

**Goal:** Establish STRIDE OS as standard pacing reference; begin CoachLab module expansion.

**Success metrics:**
- 500+ coaches, 10,000+ athletes
- Ensemble error <3%
- Multi-event consistency validated
- First non-pacing CoachLab module (strength integration) in development

---

## PART 11: CONNECTIONS TO ATHLETE DEVELOPMENT

STRIDE OS is built to surface developmental signals coaches can use. Key examples:

### Mid-Distance vs Distance Mismatch

An athlete with disproportionately fast 800m relative to their 5K may be physiologically suited to middle distance despite being trained as a distance runner. STRIDE OS surfaces this as a possible event mismatch.

**This is L3 pattern recognition.** It's not a verdict — it's information for a coach to consider.

### Plateau Detection

When an athlete's times remain stable across multiple races despite training, STRIDE OS flags the plateau and notes which formulas are predicting improvement that hasn't materialized. The coach decides whether to investigate training load, recovery, or motivation.

**This is L4 coaching hypothesis.** STRIDE OS doesn't diagnose the cause — it identifies the discrepancy between expected and observed performance.

### Developmental Trajectory (Future)

Once enough longitudinal data accumulates, STRIDE OS will be able to compare an athlete's progression to reference populations across age groups. This is North Star territory; not in v1.

---

## PART 12: PRIVACY, GOVERNANCE & ATHLETE PROTECTION

### Data Ownership

- **Coaches own the athlete data they enter.** They can export it or delete it at any time.
- **STRIDE OS retains aggregate, de-identified data** for methodology improvement.
- **No individual athlete data is sold or shared** with third parties.

### Athlete Privacy

- **Names and identifying information are stored only as needed** for coach workflow.
- **For research use, identifiers are stripped** before any analysis or sharing.
- **Under-13 data handling follows COPPA requirements**, with parental consent flow built into the onboarding for any athlete profile under age 13.

### Coach Privacy

- **Coach accounts are private.** No coach can see another coach's athletes.
- **Aggregate statistics** (e.g., "average HS 1600m time by state") can be displayed without identifying any individual coach or athlete.

### Data Retention

- **Active accounts:** data retained indefinitely while account is active
- **Inactive accounts (no login for 12+ months):** notified before any deletion; can re-activate
- **Deleted accounts:** all identifying data purged within 30 days; aggregate de-identified data may be retained

### Research Tier (Opt-In)

- **Coaches can opt their data into the research tier** for academic study participation
- **Athletes/parents can opt out of research participation** at the athlete level
- **All research use of data requires:** signed agreement, IRB approval (when relevant), de-identification before sharing

### Security

- **All data transmission encrypted** (HTTPS only)
- **Database encryption at rest**
- **No third-party tracking** or analytics on athlete data
- **Coach authentication** via Supabase (PostgreSQL backend with managed auth)

---

## PART 13: TECHNICAL ARCHITECTURE

### Current State (Pre-Backend)

- Single-page application (HTML/JS, no framework)
- Data stored in browser localStorage
- All computation client-side
- No server dependencies for core functionality

### Backend Migration Plan (In Progress)

- **Database:** Supabase (managed PostgreSQL)
- **Authentication:** Supabase Auth (email/password + magic link initially; OAuth later)
- **API:** Supabase auto-generated REST + Realtime APIs
- **Front-end:** Existing HTML/JS, modified to read/write to Supabase
- **Offline capability:** Calculator and athlete data work offline; sync when reconnected

### Data Schema (Path B — Full Capture)

Even though v1 displays only the pacing calculator surface, the underlying schema captures:

- **Athletes:** demographics, training age, primary/secondary events, all PRs with date/conditions, optional HRV/sleep/recovery, training notes
- **Races:** event, distance, time, conditions, reliability tier, coach notes
- **Predictions:** formula outputs, ensemble, confidence intervals, actual results for comparison
- **Daily check-ins:** optional, structured fields for future analysis
- **Coach metadata:** team affiliation, research opt-in status, subscription tier

This schema is the foundation of the longitudinal database moat.

---

## PART 14: STAKEHOLDER QUICK REFERENCE

For each audience, the key question and where to find the answer:

| Stakeholder | Question | See Part |
|---|---|---|
| **Researchers** | Can I trust this data for my study? | 4, 6, 7, 12 |
| **Running Coaches** | Will this save me time and help my athletes? | 3, 5, 8 |
| **S&C Coaches** | How does this affect my program? | 9, 11 |
| **Engineers** | What's the architecture? | 4, 13 |
| **Athletes / Parents** | How is my data protected? | 12 |
| **Administrators** | How do I onboard my team? | 5, 13 |
| **Investors** | What's the business case? | 1, 2, 10 |

---

## APPENDIX A: REFERENCE EXAMPLE — THE 400M PLATEAU

A 36-year-old masters runner with the following profile (presented for illustration; details simplified):

**Observed (L1):**
- 800m PR: 2:08.4
- 400m: 60.09 → 60.14 → 60.23 → 60.39 across four races over 12 months

**Derived (L2):**
- Riegel-predicted 400m from 800m: ~59.1
- VDOT-predicted 400m from 800m: ~59.8
- Cameron-predicted 400m from 800m: ~60.2
- Ensemble prediction: 59.8 ± 1.2 seconds

**Pattern Recognition (L3):**
- Actual 400m times have drifted from the high end of ensemble (60.1) toward outside the predicted range (60.39)
- 800m time has remained stable
- This pattern suggests a plateau in 400m capacity that is not reflected in 800m capacity

**Coaching Hypothesis (L4) — multiple possibilities, none verified:**
- Speed-specific work may be a limiting factor
- Recovery state may be reducing race-day output
- Athlete may be at individual ceiling for 400m given current training

**Acknowledged Unknown (L5):**
- Sleep quality, life stress, hormonal context, motivation, biomechanics, race tactics — all unmeasured

**STRIDE OS does not diagnose this plateau.** It surfaces the L1–L3 information and offers L4 possibilities. The coach gathers additional context and decides the intervention.

If the coach adds speed work and the 400m subsequently improves to 59.8 over the following season, STRIDE OS logs:

**Adaptation response observed:** Speed-emphasis intervention preceded 400m improvement of 0.4s over 12 weeks. Hypothesis L4-A (speed development as limiting factor) is consistent with observation. Other L4 hypotheses not ruled out.

This is the rigor STRIDE OS aims to provide: **transparent attribution of every claim to its evidence layer.**

---

## APPENDIX B: EXPLICIT UNKNOWNS

Variables STRIDE OS cannot currently measure but that affect performance:

- Sleep quality and duration
- Nutrition adherence
- Hydration status
- Iron, ferritin, vitamin D
- Hormonal context (menstrual cycle, stress hormones)
- Emotional and psychological state
- Motivation and goal alignment
- Pain tolerance and injury history
- Coaching quality and athlete-coach fit
- Biomechanics and movement economy
- Race tactics and competitive context
- Family and life stress
- School/work demands

**These variables are not deficiencies of STRIDE OS — they are explicit boundaries.** Predictions should always be interpreted within broader coaching context that accounts for these factors.

---

## APPENDIX C: CITATIONS

The Sources page within STRIDE OS contains the full 40+ peer-reviewed citation list. Major categories:

- **Pace prediction:** Riegel 1981, Cameron 1998, Daniels & Gilbert 1979, Vickers & Vertosick 2016, Purdy 1974
- **Training intensity zones:** Daniels 2014, Foster 2001, Coyle 2007
- **Environmental physiology:** Ely 2007, Wehrlin & Hallén 2006, Cheuvront 2010
- **Lactate and threshold:** Faude 2009, Beneke 2003
- **Energy systems:** Spencer & Gastin 2001, Gastin 2001
- **Validation datasets:** UIL Texas State Meet (2023–2025), NCAA D1 TFRRS (2024), WMA / USATF Masters (2024)

Full list with summary findings and publication links: STRIDE OS Sources page.

---

**Document Version:** 2.0 (Galpin-rigorous structure, expanded corpus)
**Last Updated:** May 20, 2026
**Owner:** CoachLab
**Status:** Foundation document for STRIDE OS v1 launch
**Companion documents:** *CoachLab North Star*, *The Bridge Map*, *Backend Architecture Plan*
