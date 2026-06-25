# STRIDE OS · Sources & Methodology Library

**Status:** Comprehensive citation library extracted from the STRIDE OS application's in-app Sources page.

**Purpose:** This document is the canonical source of all peer-reviewed and methodological references that inform STRIDE OS predictions, pacing zones, and validation logic.

**Audience:** Researchers, sport scientists, coaches who want to evaluate the methodology, and developers maintaining the calculation engine.

**Last Updated:** June 20, 2026

---

## Why this lives in the repo, not in the app

STRIDE OS displays a concise Sources screen in the app and keeps the deeper methodology library here for coaches who want methodological depth. This is deliberate:

1. Coaches in the field don't need to see 40+ academic citations every time they open the app
2. Showing formula names without context can introduce cognitive bias, so the app lists the evidence base while keeping proprietary blending weights and implementation details private
3. The website (future) will surface this content as a "Sources & Methodology" page for serious users

The methodology is not hidden. It's organized for the audience that needs it.

---

## 1. Validation Datasets — Empirical Corpus

Beyond the peer-reviewed sources cited below, STRIDE OS maintains validation corpora of competitive race results used to benchmark ensemble weights, population-level performance distributions, and planning-range coverage. These datasets supplement the published literature; they do not replace it.

### UIL Texas State Meet Results (2023–2025)

**Source:** University Interscholastic League · Public Records
**Scale:** n = 1,299 results, 647 unique athletes
**Coverage:** 800m through 5K cross country; ages 12–18
**Compiled from:** uil.tfresult.com, MyChipTime (XC), uiltexas.org

- **2025 Track:** n=632, fully verified
- **2024 Track + XC:** n=617, mixed verification
- **2023 XC:** n=50, fully verified

**Distribution by event:** 800m (197), 1600m (195), 3200m (187), 5K XC (330), 400m (129), 200m (137), 100m (124).

**Scope limitation:** All athletes in the corpus are state-meet qualifiers — performance is elite for their classification. Calibrations derived from this set are valid for fast HS athletes but should not be silently applied to slower or developmental athletes.

### NCAA Division I Track & Field (2024)

**Source:** TFRRS / NCAA · Public Records
**Scale:** n = 284 results, ~250 unique athletes
**Coverage:** 100m through 10,000m + 6K/10K XC; ages 18–22

NCAA Division I outdoor and indoor championship qualifiers (2024). Used as a peak-performance reference and development benchmark for post-HS college athletes.

**Scope limitation:** NCAA D1 qualifiers represent elite college athletes only. Predictions calibrated here are valid for college-bound athletes but overestimate for recreational or HS-only runners.

### WMA / USATF Masters (2024)

**Source:** World Masters Athletics + USATF Masters · Public Records
**Scale:** n = 234 results, ~230 unique athletes
**Coverage:** 100m through Half Marathon; 5-year age groups (M35–M95, W35–W90)

Masters (age 35+) athletes competing in World Masters Athletics and USATF Masters championships (2024). Used as a performance decline reference and aging-curve validation.

**Scope limitation:** Masters championship qualifiers are elite masters athletes only. Decline curves should not be silently applied to sedentary or recreational masters runners.

### Total Empirical Corpus

**1,817 race records spanning ages 12–95** across three populations (Texas HS, NCAA D1, Masters). Used to validate formula accuracy, benchmark performance distributions, and audit planning-range coverage.

**Data files:** canonical datasets live under `Data_Validation/` in this repository.

Researchers can request access to the underlying dataset for independent review by contacting the project directly.

---

## 2. Race Time Prediction Models

The STRIDE Ensemble combines outputs from several published prediction models, weighted by event distance, athlete domain, and individual race history. Specific weights and combination logic are proprietary; the underlying formulas are publicly cited below.

**Riegel, P. S.** (1981). *Athletic records and human endurance.* American Scientist, 69(3): 285-290.
The classic power-law model: T₂ = T₁ × (D₂/D₁)^k. Original exponent k ≈ 1.06. Best for 1500m–marathon range; degrades on sprint↔distance crossovers.

**Cameron, D.** (1998). *Cameron Running Time Prediction Formula.* Self-published methodology.
A modified power-law model that adjusts the fatigue exponent based on race distance. Sometimes more accurate than Riegel for longer distances (10K+).

**Daniels, J. & Gilbert, J.** (1979). *Oxygen Power: Performance Tables for Distance Runners.* Self-published.
Original VDOT methodology — predicts VO2max-equivalent from race time, then back-converts to predict performances at other distances. Best in 1500m–10K range.

**Vickers, A. J. & Vertosick, E. A.** (2016). *An empirical study of race times in recreational endurance runners.* BMC Sports Science, Medicine and Rehabilitation, 8:26.
**n = 2,303 runners.** Empirical validation showing formulas can underestimate marathon finish time / overestimate marathon performance for many recreational runners.

**Purdy, J. G.** (1974). *Computer-generated track and field scoring tables: An effort to assess performance for all running events.* Medicine and Science in Sports, 6(4): 287-291.
Performance scoring system that normalizes results across distances for comparison.

---

## 3. Daniels VDOT & Training Intensity Zones

**Daniels, J.** (2014). *Daniels' Running Formula (3rd ed).* Human Kinetics.
The canonical reference for percentage-based training zone prescription:
- E (Easy): ~65–75% VO2max
- M (Marathon): ~80% VO2max
- T (Threshold): 88% VO2max
- I (Interval / VO2max): 98–100% VO2max
- R (Repetition): >100% VO2max

STRIDE OS percentage zones are calibrated against these reference points.

**Daniels, J. & Gilbert, J.** (1979). *Oxygen Power.*
Original VDOT tables.

---

## 4. Norwegian Threshold Model & Contemporary Endurance Methodology

The lactate-controlled, double-threshold approach pioneered by Marius Bakken (Norway, early 2000s) is a major contemporary influence on elite distance training. STRIDE OS uses this material to constrain threshold pace prescriptions, readiness guardrails, and coaching language. It is not used as a direct race-time equivalence formula.

**Bakken, M.** (2026). *The Norwegian Method Applied.* Local Source Library scans:
- `/Users/anthoney/Documents/AnthoneyOS/Library/Source Library/01_Source_Files/Training/the norwegian method p.1-102.pdf`
- `/Users/anthoney/Documents/AnthoneyOS/Library/Source Library/01_Source_Files/Training/the norwegian method p.103-204.pdf`
- `/Users/anthoney/Documents/AnthoneyOS/Library/Source Library/01_Source_Files/Training/the norwegian method p.205-307.pdf`
- `/Users/anthoney/Documents/AnthoneyOS/Library/Source Library/01_Source_Files/Training/the norwegian method p.307-327.pdf`

Practical application of lactate-controlled threshold training. Key implementation points for STRIDE OS: threshold pace is a starting estimate, not the prescription itself; interval length changes the correct pace; easy days must remain easy; readiness and lactate/HR/RPE drift should override target pace; future continuous-lactate ideas are roadmap direction, not current measured capability.

**Bakken, M. & Magness, S.** (2024). *The Norwegian Method Applied: Threshold Training and Intensity Control for Faster, More Durable Running at Every Level.* Self-published / Amazon.
Earlier/source-adjacent practical framing of the lactate-controlled Norwegian threshold model. Useful for coaching context, but the locally scanned 2026 PDFs are the auditable source set currently tied to STRIDE OS.

**Casado, A., Foster, C., Bakken, M. & Tjelta, L. I.** (2023). *Does Lactate-Guided Threshold Interval Training within a High-Volume Low-Intensity Approach Represent the "Next Step" in the Evolution of Distance Running Training?* International Journal of Environmental Research and Public Health, 20(5):3782.
Peer-reviewed framing for lactate-guided threshold interval training. Supports the core principle that internal load controls intensity while pace varies by athlete, day, recovery status, and interval structure.

**Tjelta, L. I.** (2016). *The training of international elite distance runners.* International Journal of Sports Science & Coaching, 11(1): 122-134.
Empirical analysis of training logs from elite Scandinavian distance runners. Documents prevalence of sub-threshold and threshold-controlled work in successful programs.

**Casado, A., González-Mohíno, F., González-Ravé, J. M. & Foster, C.** (2022). *Training periodization, methods, intensity distribution, and volume in highly trained and elite distance runners: a systematic review.* International Journal of Sports Physiology and Performance, 17(6): 820-833.
Systematic review confirming polarized + threshold-emphasis as dominant in elite distance training. ~80% easy, ~20% threshold/VO2max work.

**Seiler, S.** (2010). *What is best practice for training intensity and duration distribution in endurance athletes?* International Journal of Sports Physiology and Performance, 5(3): 276-291.
Defines the 80/20 polarized model.

**Noakes, T. D.** (2012). *Lore of Running (4th Edition).* Human Kinetics.
Comprehensive reference on running physiology. Introduces the Central Governor Model — CNS-mediated fatigue regulation. Important for understanding why pure VO2max-based prescription has limits: perceived effort and motivation are real, measurable performance variables not captured by pace formulas.

**Magness, S.** (2014). *The Science of Running.* Origin Press.
Argues that for trained distance runners, race-pace-based prescription is more practical than VO2max-based prescription (since most coaches lack lab access). Funnel periodization: workouts progress from extreme to specific.

**Maffetone, P.** (2010s). *The MAF Method: 180-Formula heart-rate training.* Various publications, philmaffetone.com.
MAF heart rate (180 minus age) for easy aerobic running. Underpins the "by feel" approach to easy-pace prescription. STRIDE treats easy paces as conservative speed-percentage starting points that must remain conversational in practice.

---

## 5. Pace & Training Prescription Methodology

**Canova, R.** (2000s-2010s). *Percentage-of-race-pace training framework.* Coaching seminars; compiled by Davis 2011 and others.
Elite-coaching methodology prescribing training intensities relative to race performance. STRIDE uses this as coaching context and applies conservative speed-percentage math for displayed paces.

**Davis, J. J.** (2023). *A comprehensive overview of Canova-style "full-spectrum" percentage-based training.* runningwritings.com.
Mathematical treatment of full-spectrum percentage training and the ladder-of-support concept.

**Schwartz, T.** (2010s). *Critical velocity training methodology.* Tinman Endurance Project.
Application of CV-based interval training for 800m–10K athletes.

**Lydiard, A. & Gilmour, G.** (1962/2017). *Running with Lydiard (revised edition).* Meyer & Meyer Sport.
Aerobic-base methodology. Foundation of long-aerobic emphasis still seen in modern marathon training.

**Hart, C.** (1990s-2000s). *Speed development methodology.* Baylor University coaching materials.
Sprint and 400m training framework.

---

## 6. Energy Systems & Physiology

**Spencer, M. R. & Gastin, P. B.** (2001). *Energy system contribution during 200- to 1500-m running in highly trained athletes.* Medicine & Science in Sports & Exercise, 33(1): 157-162.
Direct measurement of aerobic vs. anaerobic energy contributions during race-pace running via accumulated oxygen deficit (AOD) method. Provides the foundation for STRIDE OS's energy system profile estimates.

**Gastin, P. B.** (2001). *Energy system interaction and relative contribution during maximal exercise.* Sports Medicine, 31(10): 725-741.
Review of energy system contributions across event durations.

**Sandford, G. N., Allen, S. V., Kilding, A. E., Ross, A. & Laursen, P. B.** (2019). *Anaerobic Speed Reserve: A Key Component of Elite Male 800-m Running.* International Journal of Sports Physiology and Performance, 14(4): 501-508.
Categorizes 800m athletes by Speed Reserve Ratio (SRR = MSS / MAS). Used for the ASR/SRR feature in the calculator:
- SRR ≥ 1.60 → speed-dominant (400-800m specialist territory)
- SRR 1.50–1.60 → balanced
- SRR < 1.50 → aerobic-dominant (800-1500m+)

**Faude, O., Kindermann, W. & Meyer, T.** (2009). *Lactate threshold concepts: how valid are they?* Sports Medicine, 39(6): 469-490.
Critical review of threshold methodology.

**Beneke, R.** (2003). *Maximal lactate steady state concept: an idea that's running into trouble.* European Journal of Applied Physiology, 89(1): 95-99.
On the limits of single-threshold concepts.

---

## 7. Environmental Physiology

**Ely, M. R., Cheuvront, S. N., Roberts, W. O. & Montain, S. J.** (2007). *Impact of weather on marathon-running performance.* Medicine & Science in Sports & Exercise, 39(3): 487-493.
Quantifies pace degradation by temperature. Foundational reference for STRIDE OS heat correction.

**Maughan, R. J., Otani, H. & Watson, P.** (2012). *Influence of relative humidity on prolonged exercise capacity in a warm environment.* European Journal of Applied Physiology, 112(6): 2313-2321.
Humidity impact on endurance.

**Wehrlin, J. P. & Hallén, J.** (2006). *Linear decrease in VO2max and performance with increasing altitude in endurance athletes.* European Journal of Applied Physiology, 96(4): 404-412.
Altitude correction methodology used in STRIDE OS.

**Cheuvront, S. N. & Kenefick, R. W.** (2014). *Dehydration: physiology, assessment, and performance effects.* Comprehensive Physiology, 4(1): 257-285.
Hydration physiology background.

---

## 8. Training Adaptations & Improvement Projection

**Jones, A. M. & Carter, H.** (2000). *The effect of endurance training on parameters of aerobic fitness.* Sports Medicine, 29(6): 373-386.
Aerobic adaptation timelines used to inform realistic improvement scenarios.

**Bompa, T. O. & Buzzichelli, C.** (2019). *Periodization: Theory and Methodology of Training (6th ed).* Human Kinetics.
Periodization framework underlying STRIDE OS's training-age improvement bands.

**Hopkins, W. G., Marshall, S. W., Batterham, A. M. & Hanin, J.** (2009). *Progressive statistics for studies in sports medicine and exercise science.* Medicine & Science in Sports & Exercise, 41(1): 3-13.
Statistical methodology for assessing meaningful change in athletic performance.

**Bouchard, C. & Rankinen, T.** (2001). *Individual differences in response to regular physical activity.* Medicine & Science in Sports & Exercise, 33(6 Suppl): S446-451.
The "1 in 5 athletes will miss predicted times" insight — individual response variability is dominant.

---

## 9. Race Forecast Limitations (Cited in App)

The following limitations are explicitly surfaced in the Race Forecasts screen:

- **Marathon predictions from 5K/10K still carry meaningful uncertainty** — published validation shows formulas can underestimate finish time / overestimate performance for some recreational runners. *Source: Vickers & Vertosick (2016).*
- **All prediction formulas degrade in accuracy as distance ratio grows.** Predictions within 2× the anchor distance are most reliable; beyond 4× becomes unreliable. *Source: Multiple validation studies.*
- **Predictions assume equal training specificity for the target distance** — a 5K specialist may not run their predicted marathon time without long-run preparation. *Source: Daniels (2014).*
- **Environmental conditions can shift actual race times by 2–10%** with no correction applied. *Source: Ely et al. (2007); Maughan et al. (2012).*
- **Cross-domain predictions** (sprint ↔ distance) have no published validation and are flagged exploratory in this system. *Source: STRIDE OS design decision.*
- **Approximately 1 in 5 runners will miss their predicted time significantly** even when formulas are applied correctly. Individual response is the dominant variable. *Source: Hopkins et al. (2009); Bouchard & Rankinen (2001).*

---

## 10. What STRIDE OS Intentionally Does Not Do

To prevent overclaiming, STRIDE OS does not:

- Estimate VO2max, lactate threshold, or running economy without measurement
- Make psychological evaluations from race patterns
- Predict injury risk
- Provide medical advice
- Diagnose overtraining
- Generate cross-domain predictions (sprint ↔ distance) without explicit "exploratory" flagging

Those capabilities require lab measurement, professional medical evaluation, or longer longitudinal datasets than the current system has. They belong in future CoachLab modules, not the current pacing calculator.

---

## How to Contact Us

For methodology questions, research collaboration, or institutional access requests:

**Email:** [contact email — TBD before launch]
**Website:** [CoachLab.com — under construction]

Researchers requesting raw validation corpus access will be asked to sign a data-use agreement before access is granted. Aggregate benchmarks and de-identified summaries are available publicly.

---

**Document maintained by:** CoachLab
**Companion documents in this repo:**
- `docs/MASTER_PLAN.md` — STRIDE OS Master Plan v2 (Galpin-rigorous methodology)
- `docs/NORTH_STAR.md` — CoachLab North Star (long-term vision)
- `docs/BRIDGE_MAP.md` — How v1 features serve the long-term architecture
- `docs/BACKEND_ARCHITECTURE.md` — Supabase schema and implementation plan
