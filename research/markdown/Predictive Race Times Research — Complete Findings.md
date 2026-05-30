# Predictive Race Times Research — Complete Findings

## Phase 1: Foundational Mathematical Prediction Models

### 1. Riegel's Formula (1977/1981)
- **Source:** Riegel PS. "Athletic records and human endurance." American Scientist 69(3): 285-290, 1981.
- **Formula:** T₂ = T₁ × (D₂/D₁)^1.06
- **Concept:** Power-law model; pace declines ~6% when distance doubles
- **Valid range:** Activities lasting 3.5 to 230 minutes (1500m to marathon)
- **Limitations:**
  - Only 80% accurate (1 in 5 runners significantly miss predicted times)
  - Too optimistic for untrained runners, too conservative for elites
  - Assumes "appropriate training for the distance"
  - Only 5% of recreational runners beat Riegel prediction when predicting marathon from half-marathon
  - Underpredicts marathon times by 10+ minutes for recreational runners
  - Does not account for muscle fiber type, training volume, or conditions
- **Fatigue factor variations:**
  - Original: k = 1.06 (population average)
  - Individual k can be calculated from two known race performances
  - Fast-twitch dominant runners: higher effective k (more slowdown)
  - Slow-twitch dominant runners: lower effective k (less slowdown)

### 2. Cameron's Formula (1998)
- **Source:** Dave Cameron, Statistical Services of A.C. Nielsen Co.
- **Formula:**
  - a = 13.49681 - 0.048865×olddist + 2.438936/(olddist^0.7905)
  - b = 13.49681 - 0.048865×newdist + 2.438936/(newdist^0.7905)
  - newtime = (oldtime/olddist) × (a/b) × newdist
  - **Distances in MILES, times in SECONDS**
- **Concept:** Regression on speed (not time) vs distance; non-linear fatigue factor
- **Valid range:** Works well for post-1945 records at 800m through 10000m; from 1964 also works for marathon
- **Advantage:** Better than Riegel for longer distances because fatigue factor is distance-dependent

### 3. Purdy Points System (1970/1974)
- **Source:** Gardner JB, Purdy JG. "Computer generated track scoring tables." Medicine and Science in Sports 6(1): 66, 1974.
- **Concept:** Assigns point value to performances based on "Portuguese Scoring Tables" (1936)
- **Base:** Maximum possible velocity in a straight line = 950 points; 1970 world records ≈ 1035 points
- **Formula:** Estimates equation for men's world record performances (as of 1970)
- **Usage:** Equal Purdy points = equivalent performances across distances
- **Limitation:** Often quite different from other predictions; based on older data

### 4. Power-Law Model (General Form)
- **Source:** Drake JP et al. "Modelling human endurance: power laws vs critical power." Eur J Appl Physiol 2024. Cited by 25.
- **Formula:** v = k × t^(-g) where g ≈ 0.06 (equivalent to Riegel's 1.06 exponent)
- **Key finding:** Power-law model is a safer tool for pace selection than the hyperbolic (critical power) model
- **Advantage:** More naturally models fatigue than critical power model
- **Variants:**
  - Kennelly (1906): D = a × t^b
  - Riegel (1981): T₂ = T₁ × (D₂/D₁)^(1+g)

### 5. Vickers-Vertosick Method (2016)
- **Source:** Vickers AJ, Vertosick EA. "An empirical study of race times in recreational endurance runners." BMC Sports Sci Med Rehabil 8:26, 2016.
- **Key findings:**
  - N = 2,303 recreational runners
  - Riegel well-calibrated for races up to half-marathon
  - Riegel DRAMATICALLY underestimates marathon times (predicts too fast)
  - Developed correction incorporating training mileage
  - Used by Marathon Handbook calculator
- **Correction factors:**
  - Training volume explains ~77% of variance in marathon times (Tanda 2011)
  - Add 1-2 min/mile if weekly volume < 30 mpw
  - Add 30-60 sec/mile if longest run < 18 miles

### 6. Tanda Model (2011)
- **Source:** Tanda G. "Prediction of marathon performance time on the basis of training indices." J Human Sport Exercise 6(3): 511-520, 2011.
- **Formula:** Marathon time = f(weekly mileage, average training pace)
- **Key finding:** Weekly mileage + mean training pace explain ~77% of variance in recreational marathon times
- **Advantage:** Accounts for actual training, not just race equivalency

### 7. McMillan Running Calculator
- **Source:** Greg McMillan, used by 20+ million runners
- **Approach:** Hybrid calculator with adjustments for runner type
- **Adjustments:**
  - Speed-oriented runners: add 30 seconds to 5K time before predicting marathon
  - Endurance-oriented runners: use actual PR for marathon predictions
  - Track 5K ≈ road 5K + 30-45 seconds (adjust before entering)

### 8. Vandewalle Model Comparison (2018)
- **Source:** Vandewalle H. "Modelling of Running Performances." BioMed Research International, 2018.
- **Models compared:**
  1. Power-law (Kennelly 1906): D = a × t^b
  2. Logarithmic (Péronnet-Thibault 1987): S = MAS × [1 - k × ln(t/tMAS)]
  3. 2-parameter hyperbolic (Hill 1927): D = ADC + CS × t
  4. 3-parameter hyperbolic (Morton 1996): S = CS + (Smax - CS) × ADC / (ADC + (Smax - CS) × t)
  5. Exponential (Hopkins 1989): S = CS + (Smax - CS) × e^(-t/τ)
- **Best for middle distances (1500-10000m):** 3-parameter hyperbolic (Morton)
- **Best for long-distance extrapolation (marathon):** Logarithmic and power-law models



## Phase 2: Physiological and VO2max-Based Models

### 9. Jack Daniels' VDOT System (1979/2014)
- **Source:** Daniels J, Gilbert J. "Oxygen Power: Performance Tables for Distance Runners." 1979. Later: Daniels J. "Daniels' Running Formula." 3rd ed. Human Kinetics, 2014. Cited by 388.
- **Concept:** Maps race performance to pseudo-VO2max ("VDOT"), then reads off equivalent times at other distances
- **Two core equations:**
  1. %VO2max sustainable as function of race duration (the "Drop Dead Formula")
  2. VO2 as function of running velocity (oxygen cost formula)
  - VDOT = equation (2) / equation (1)
- **Key insight:** There is a predictable relationship between running velocity and energy demands at varied distances and intensities
- **Valid range:** 800m to marathon, VDOT values 30-85
- **Distinction from Riegel:** Two-parameter approach (accounts for both speed and endurance characteristics implicitly through the VO2max-duration curve)
- **Limitations:**
  - Assumes stable running economy and fractional utilization across event durations
  - Underpredicts marathon time for endurance-under-trained runners
  - Overpredicts for endurance-specialists
  - One-parameter model (single race input) cannot distinguish speed vs endurance athletes

### 10. Chester's VDOT Regression Equations (2021)
- **Source:** Chester CD. "A Mathematical Approach to Estimating Pace & Distances for Practice and Competition Running." 2021.
- **Key contribution:** Reverse-engineered Daniels' tables into implementable power-law regression formulas
- **Race time formulas (time in days, distance in km):**
  - T_800m = 0.056331814720638 × VDOT^(-0.867275092353156)
  - T_1km = 0.074306950894858 × VDOT^(-0.876541725348173)
  - T_1500m = 0.120590849876843 × VDOT^(-0.887179161114248)
  - T_1600m = 0.129789983350069 × VDOT^(-0.887869998635982)
  - T_mile = 0.130601275519403 × VDOT^(-0.887823738546826)
  - T_3km = 0.244695486277067 × VDOT^(-0.874272474653074)
  - T_3200m = 0.259450105097322 × VDOT^(-0.871409124439484)
  - T_2mi = 0.260901957779438 × VDOT^(-0.871233801795967)
  - T_5km = 0.389068343445441 × VDOT^(-0.853126398932773)
  - T_10km = 0.805659018769989 × VDOT^(-0.852425654240328)
  - T_marathon = 3.49469956615132 × VDOT^(-0.837443821910625)
- **Error:** < 1 sec/km from Daniels' table values (R = 0.997)
- **Generalized race pace formula (any distance above 800m):**
  - φ = (0.119087 × ln|VDOT| + 0.229667) × ln|ln|d_m|| - (0.248453 × ln|VDOT| - 0.647790)
  - Race time ≈ φ × (n/0.8) × T_800m
  - Valid for 30 ≤ VDOT ≤ 85, distances up to marathon
- **Training pace equations (time in days/km):**
  - Slower Easy: P_s = 0.085520 × VDOT^(-0.792315)
  - Faster Easy: P_f = 0.084518 × VDOT^(-0.819515)
  - Marathon: P_m = 0.091387 × VDOT^(-0.861123)
  - Threshold: P_t = 0.069702 × VDOT^(-0.808171)
  - Interval: P_i = 0.064668 × VDOT^(-0.809903)
  - Repetition: P_r = 2.5 × 0.027832 × VDOT^(-0.849632)

### 11. Critical Speed (CS) Model
- **Source:** Smyth B, Muniz-Pumares D. "Calculation of Critical Speed from Raw Training Data in Recreational Marathon Runners." Med Sci Sports Exerc 52(12): 2637-2645, 2020. Cited by 55.
- **Formula:** D = D' + CS × t (linear form); t_lim = D' / (s - CS) (hyperbolic form)
  - CS = critical speed (asymptote) = highest sustainable steady-state speed
  - D' = curvature constant = finite work capacity above CS (measured in meters)
- **Key findings (N > 25,000 recreational marathon runners):**
  - CS from 400m, 800m, 5000m best predicted marathon performance (R² = 0.695, error = 7.67%)
  - Runners completed marathon at 84.8% ± 13.6% CS
  - Faster runners closer to CS: 93.0% CS for 150-min marathons vs 78.9% CS for 360-min marathons
  - Running first half > 94% CS → likely 25%+ slowdown in second half
- **Advantage over Riegel/VDOT:** Two-parameter model distinguishes speed vs endurance athletes
- **Limitation:** Does not predict well beyond ~20 min events or below ~2 min events
- **Practical calculation:** Plot race distance (meters) vs race time (seconds) for 2-3 races (2-20 min duration); slope of linear fit = CS; y-intercept = D'

### 12. Péronnet-Thibault Model (1989)
- **Source:** Péronnet F, Thibault G. "Mathematical analysis of running performance and world running records." J Appl Physiol 67(1): 453-465, 1989. Cited by 383.
- **Concept:** Logarithmic model based on decrease in fractional use of maximal aerobic speed (MAS) over time
- **Formula:** S = MAS × [1 - k × ln(t/tMAS)]
  - S = sustainable speed
  - MAS = maximal aerobic speed
  - k = endurance parameter (rate of speed decline)
  - tMAS = time to exhaustion at MAS (~7 min)
- **Key insight:** Integrates aerobic and anaerobic contributions; MAP (maximum aerobic power) is the key parameter
- **Improved version:** Alvarez-Ramirez (2002) added 3rd-order relaxation process for decreasing dynamics of aerobic power. Eur J Appl Physiol 86: 517-524.

### 13. Drake Unified Framework (2025)
- **Source:** Drake JP, Finke A, Ferguson RA. "A unified framework for performance predictors in endurance sports." Science & Sports, 2025.
- **Key contribution:** Shows that FTP (cycling), VDOT (running), and Galloway's "magic mile" are all special cases of the same power-law framework
- **Unifying principle:** All popular predictors assume a fixed endurance index (fatigue exponent) calibrated to elite athletes
- **Implication for calculator:** The power-law exponent (Riegel's 1.06) is the single most important parameter to individualize



## Phase 3: Modern Big-Data, Machine Learning, and Individualized Prediction Approaches

### 14. Blythe & Király — Local Matrix Completion (2016)
- **Source:** Blythe DAJ, Király FJ. "Prediction and Quantification of Individual Athletic Performance of Runners." PLoS ONE 11(6): e0157257, 2016. Cited by 42.
- **Dataset:** thepowerof10 database — 164,746 individuals, 1,417,432 performances
- **Method:** Local Matrix Completion (LMC) — machine learning technique
- **Key findings:**
  - Average prediction error: 3.6 min on elite marathon, 0.3 sec on 100m
  - 30% improvement in RMSE over state-of-the-art
  - THREE-NUMBER SUMMARY per runner explains performance across ALL distances (100m to marathon):
    1. Endurance parameter (individual power law exponent) — explains most differences >800m
    2. Speed-endurance balance — relative balance between speed and endurance
    3. Middle-distance specialization — non-linear correction
  - Individual power law: t = c × s^α where α varies per runner (NOT fixed at 1.06)
  - Explains why Riegel, Purdy points, and scoring tables all work approximately
  - Provides INDIVIDUAL fatigue exponent rather than population average
- **Implementation:** log t = α × log s + log c (linear in log-log space, but α is individual)

### 15. Vickers & Vertosick (2016)
- **Source:** Vickers AJ, Vertosick EA. "An empirical study of race times in recreational endurance runners." BMC Sports Sci Med Rehabil 8:26, 2016. Cited by 95.
- **Dataset:** N = 2,303 recreational runners (internet survey)
- **Key findings:**
  - Riegel well-calibrated for races up to half-marathon
  - Riegel DRAMATICALLY underestimates marathon time (predicts too fast) — at least 10 min too fast for half of runners
  - MSE: Riegel = 381 vs. their model (1 prior race) = 228 vs. (2 prior races) = 208
  - Sex, age, BMI, and race training all associated with race velocity
  - Tempo runs more strongly associated with shorter distances
  - Weekly mileage and interval training similar associations across all distances
  - Male-female velocity gap DECREASES with increasing distance
- **Modified Riegel with mileage correction:**
  - k_marathon = constant based on runner's typical weekly mileage
  - Accounts for training volume in the prediction

### 16. Dash — LSTM Deep Learning Model (2024)
- **Source:** Dash S. "Win Your Race Goal: A Generalized Approach to Prediction of Running Performance." Sports Med Int Open 8: a24016234, 2024. Cited by 8.
- **Method:** LSTM (Long Short-Term Memory) neural network
- **Dataset:** 15 runners, 15,686 total runs
- **Inputs:** Distance, elevation gain, age for each run in training log
- **Output:** Total time to complete the run
- **Results:**
  - LSTM regression: 89.13% accuracy
  - LSTM time-series regression: 85.21% accuracy
  - Riegel formula: 80% accuracy
  - UltraSignup formula: 87.5% accuracy
  - LSTM model: 90.4% accuracy (best)
- **Advantage:** Works across marathon to ultra distances, accounts for elevation, individualized

### 17. Smyth et al. — Recommender Systems for Marathon Runners (2022)
- **Source:** Smyth B, Lawlor A, Berndsen J, Feely C. "Recommendations for marathon runners: on the application of recommender systems and machine learning." User Modeling and User-Adapted Interaction 32(5): 787-838, 2022. Cited by 46.
- **Methods:** Case-based reasoning (CBR), collaborative filtering
- **Key approach:** Uses activity data from online platforms (Strava) to:
  1. Estimate fitness level during training
  2. Predict finish time at different points in training
  3. Recommend pacing strategies
  4. Recommend training plans
- **CBR formula for race prediction:**
  - Build database of cases: nPB and PB times for pairs of marathons
  - Query with non-personal-best record → retrieve k similar cases → average their PB times
  - Pacing error: ~7-9% for ultra-distance races

### 18. Keogh et al. — Systematic Review of Marathon Prediction Equations (2019)
- **Source:** Keogh A, Smyth B, Caulfield B, et al. "Prediction equations for marathon performance: a systematic review." Int J Sports Physiol Perform 14(9): 1159-1169, 2019. Cited by 45.
- **Key findings from systematic review:**
  - Two main methods: (1) observational studies with physiological/training variables, (2) race-to-race prediction formulas
  - No single prediction equation is accurate for ALL runners
  - Best predictors: previous race time at similar distance, weekly mileage, training pace
  - Physiological predictors: VO2max, lactate threshold, running economy

### 19. Jeff Galloway's Magic Mile (Coaching Heuristic)
- **Source:** Galloway J. "Galloway's 5K/10K Running" and "Marathon: You Can Do It!" Based on 300,000+ runners over 40 years.
- **Formula (multiplier-based from 1-mile time trial):**
  - 5K pace = Magic Mile time + 33 seconds per mile
  - 10K pace = Magic Mile time × 1.15
  - 10-mile pace = Magic Mile time × 1.175
  - Half-marathon pace = Magic Mile time × 1.2
  - Marathon pace = Magic Mile time × 1.3
- **Assumptions:**
  - Appropriate training for the distance
  - Temperature ≤ 60°F on race day
  - Correct pacing and walk breaks
- **Advantage:** Extremely simple, tested on massive population of recreational runners
- **Limitation:** One-size-fits-all multipliers; no individualization

### 20. Tanda Model (2011)
- **Source:** Tanda G. "Prediction of marathon performance time on the basis of training indices." J Human Sport Exercise 6(3): 511-520, 2011. Cited by 60.
- **Formula:** Marathon_time = 17.1 + 140.0 × exp(-0.0053 × km_per_week) + 0.55 × avg_training_pace
  - km_per_week = average weekly training volume
  - avg_training_pace = mean pace of training runs (sec/km)
- **Key finding:** Weekly mileage + average training pace explain ~77% of variance in recreational marathon times
- **Advantage:** Does not require a prior race result — uses training data only
- **Validated on:** Recreational marathon runners



## Phase 4: Coaching Heuristics, Multiplier Tables, and Practical Conversion Systems

### 21. McMillan Running Calculator
- **Source:** McMillan G. "You (Only Faster)." McMillan Running, 2012. Based on empirical data from thousands of runners.
- **Method:** Proprietary algorithm combining Daniels-style VO2max mapping with empirical correction factors
- **Key features:**
  - Predicts equivalent race times from any input distance (800m to marathon)
  - Provides training paces: Recovery, Easy, Steady State, Tempo, Repetition, Speed
  - Accounts for "runner type" (speed-oriented vs. endurance-oriented) via adjustment
  - One of the most widely used calculators among competitive recreational runners
- **Underlying principle:** Modified power-law with empirical adjustments for recreational runners
- **Limitation:** Proprietary — exact formula not published

### 22. Hansons Method Race Equivalency
- **Source:** Humphrey L, Hanson K, Hanson K. "Hansons Marathon Method." VeloPress, 2012/2016.
- **Method:** Modified Riegel with environmental corrections
- **Key features:**
  - Includes temperature, humidity, and wind speed adjustments
  - Provides race equivalency across 5K, 10K, 15K, half marathon, marathon
  - Based on Hansons-Brooks Distance Project coaching data
- **Environmental adjustment approach:**
  - Temperature correction: performance degrades above 55°F
  - Humidity correction: additional degradation above 40% humidity
  - Wind correction: headwind vs. tailwind asymmetry

### 23. Coaching Rules of Thumb (Empirical Multipliers)
- **Sources:** Various coaching traditions, validated empirically
- **Common conversion heuristics:**
  - Half marathon → Marathon: HM time × 2 + 10-20 minutes (faster runners closer to +10, slower to +20)
  - 10K → Half marathon: 10K time × 2 + 10-15 minutes (or 10K time × 2.22)
  - 5K → 10K: 5K time × 2 + 1-3 minutes (or 5K time × 2.09)
  - 5K → Marathon: 5K time × 4.6-4.8 (well-trained), up to × 5.0+ (undertrained for distance)
- **MarathonGuide formula:** Pace decreases by 4-5% as distance doubles
- **Key insight:** The multiplier INCREASES for less-trained runners (higher fatigue factor)

### 24. Stryd Running Power Model
- **Source:** Stryd (proprietary), based on critical power (CP) model adapted for running
- **Method:** Uses running power meter data to calculate:
  - Critical Power (CP) — analogous to Critical Speed
  - Running Effectiveness (RE) — power-to-pace conversion efficiency
  - Personal fatigue factor — individual rate of power decline over distance
- **Race prediction approach:**
  - Combines CP + personal fatigue factor + Power-Duration Curve
  - Accounts for course elevation, wind, temperature
  - Uses last 90 days of training data
- **Advantage:** Individualized fatigue factor rather than population average
- **Limitation:** Requires Stryd power meter hardware

### 25. Polar Running Index
- **Source:** Polar Electro, based on Firstbeat Technologies analytics
- **Method:** Estimates VO2max from submaximal running data + HR
- **Formula basis:**
  - Running Index ≈ estimated VO2max (ml/kg/min)
  - Calculated from: speed, heart rate, and duration during any run >12 minutes
  - Maps to predicted race times via VO2max-performance relationship
- **Prediction table:** Running Index value → predicted times at 5K, 10K, HM, Marathon
- **Advantage:** No maximal test needed; updates with every run
- **Limitation:** Accuracy depends on correct HR max/zones; affected by cardiac drift, heat, fatigue

### 26. Matt Fitzgerald's "Endurance Factor" Individualization Concept
- **Source:** Fitzgerald M. "80/20 Running." Penguin, 2014. Also: Strava Stories article, 2023.
- **Key concept:** Three dimensions of individual variation:
  1. **Aptitude** — relative strength in speed vs. aerobic capacity vs. threshold vs. endurance
  2. **Responsiveness** — how quickly athlete improves from different stimuli
  3. **Tolerance** — capacity to handle training stress without overreaching
- **Practical application for prediction:**
  - If calculator paces seem easy for tempo runs → higher threshold aptitude → better at longer races
  - If calculator paces seem hard for intervals → lower speed aptitude → worse at shorter races
  - Implies individual fatigue exponent varies based on aptitude profile
- **Connection to Riegel:** The 1.06 exponent is an AVERAGE; speed-oriented runners have lower exponent (slower decay), endurance-oriented runners have higher exponent (faster improvement with distance)
  - Actually REVERSED: endurance runners have LOWER exponent (less pace decay over distance), speed runners have HIGHER exponent (more pace decay)

### 27. The "Endurance Factor" or "Stamina Ratio" Metric
- **Used by:** Fellrnr, Running Writings, various coaching platforms
- **Definition:** Ratio of marathon pace to shorter-distance pace (e.g., marathon pace / 5K pace)
  - Or equivalently: marathon time / (5K time × theoretical multiplier)
- **Typical values:**
  - Elite endurance specialists: marathon pace ≈ 95-97% of half marathon pace
  - Recreational well-trained: marathon pace ≈ 92-95% of half marathon pace
  - Recreational undertrained: marathon pace ≈ 85-90% of half marathon pace
- **Application:** If a runner's actual marathon/HM ratio is known, their individual fatigue exponent can be back-calculated and applied to predict other distances

