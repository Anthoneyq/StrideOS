# STRIDE OS Research — Comprehensive Findings

## SECTION 1 ADDITIONS: Remaining Prediction Models

### Mercier/Léger/Desjardins Nomogram (1984)
- **Source:** Mercier D, Léger L, Desjardins M. "Nomogramme pour prédire la performance, le VO2max et l'endurance relative en course de fond." Médecine du Sport 58(4): 181-187, 1984.
- **Concept:** A graphical nomogram that uses TWO known race performances to predict a third, while simultaneously estimating VO2max and "aerobic endurance" (AE).
- **How it works:**
  - Draw a line through two known performances on their respective distance scales
  - Where the line crosses a third distance scale = predicted performance
  - AE (Aerobic Endurance) = A - B (difference between two scale readings)
  - VO2max (in METS) estimated from horizontal line through 3km performance
- **Underlying formula:** Based on constant energy cost of running assumption + logarithmic decline in fractional utilization of MAS with increasing duration
- **Validation (Coquart et al. 2009, JSCR):**
  - N = 330 male runners (French Athletics Federation rankings 2002-2006)
  - Overestimated 10km by 13 seconds (p=0.03)
  - Underestimated 20km by 27 seconds (p<0.01)
  - Overestimated marathon by 85 seconds (p=0.06, not significant)
  - Effect sizes trivial (-0.04 < ES < 0.05)
  - Correlations: r=0.89 (10km), r=0.97 (20km), r=0.89 (marathon)
  - Limits of agreement: 10.2% (10km), 6.1% (20km), 13.2% (marathon)
  - INTERPOLATED predictions more accurate than EXTRAPOLATED
- **Validation (Tabben/Coquart 2016):**
  - Confirmed validity for track running (3000m, 5000m, 10000m)
  - High accuracy except for male runners with high performance levels
- **Validation (Lerebourg 2022):**
  - Tested on female runners specifically
  - Compared precision and accuracy across three nomograms
- **Key advantage:** Requires only 2 race results (like Critical Speed model)
- **Key limitation:** Graphical tool — harder to implement algorithmically than formula-based models
- **Implementation for STRIDE:** Can be digitized as a two-input linear interpolation/extrapolation system on log-transformed performance data

### World Athletics Scoring Tables (2025)
- **Source:** Spiriev B. "World Athletics Scoring Tables." Updated 2025. Published by World Athletics.
- **Formula type:** Convex polynomial (different coefficients per event/gender/category)
- **General formula structure:**
  - For track events (lower is better): Points = f(time)
  - For field events (higher is better): Points = f(distance/height)
  - Polynomial fit with R² > 0.999 for all events
- **Jeff Chen reverse-engineering (2022):**
  - Parsed PDF scoring tables into JSON data structure
  - Fitted polynomial regression curves to each event/gender/category
  - R² > 0.999 for all fitted curves
  - Using `round()` produces only 12 total points of discrepancy across all events
  - Open-source code available: github.com/jchen1/iaaf-scoring-tables
- **Coverage:** All standard track & field events, 100m through marathon, road races
- **Use for STRIDE:**
  - Can serve as a NORMALIZATION layer (not primary prediction)
  - Equal WA points ≈ equivalent performances across events
  - Useful for competitive benchmarking
  - Updated regularly with new world-class data
- **Limitation:** Based on elite performance curves; may not perfectly represent recreational runners

### World Masters Athletics Age Grading (2023)
- **Source:** WMA Age Grading Committee. Factors adopted 1989, updated 1994, 2002, 2006, 2010, 2015, 2023.
- **Methodology:**
  - Derived from 2+ million performances including verified age bests
  - Factors cover single-year ages from 30 to 110
  - Separate factors for male and female
  - Covers all standard track & field events
- **Formula:**
  - Age Graded Performance = Actual Performance × Age Factor
  - Age Grade % = (Open Standard / Actual Performance) × 100
  - Open Standard = benchmark equivalent to world record level for open age
  - For ages 20-30: factor = 1.0 (peak performance age)
- **Key characteristics:**
  - Linear decline from ~30-60, then accelerating (exponential) decline after 60
  - Different decline rates by event (sprints decline faster than distance)
  - Updated with new data every few years
- **Implementation for STRIDE:**
  - Apply age factors to adjust predictions for masters athletes
  - Can be used to "normalize" performances across ages for comparison
  - Separate from youth development (different trajectory)

### Anaerobic Speed Reserve (ASR) / Speed Reserve Ratio (SRR)
- **Source:** Sandford GN, Allen SV, Kilding AE, Ross A, Laursen PB. "Anaerobic Speed Reserve: A Key Component of Elite Male 800-m Running." IJSPP 14(4): 501-508, 2019. Cited by 81.
- **Definition:**
  - ASR = MSS - MAS (Maximal Sprint Speed minus Maximal Aerobic Speed)
  - SRR = MSS / MAS (Speed Reserve Ratio)
- **Athlete profiling categories (Sandford et al.):**
  - SRR > 1.60 = 400m specialist (speed-biased)
  - SRR 1.50-1.60 = 400-800m specialist
  - SRR < 1.50 = 800-1500m specialist (aerobic-biased)
- **Alternative categories (Flex Affect / middle distance):**
  - SRR ≥ 1.58 = Speed-dominant (best fit: 400m-800m)
  - SRR 1.47-1.57 = Balanced (true 800m specialist)
  - SRR ≤ 1.46 = Endurance-dominant (best fit: 800m-1500m, mile)
- **Key findings:**
  - Athletes with larger ASR displayed faster 800m performances
  - ASR explains why two runners with same MAS can have very different 800m times
  - Muscle fiber composition drives ASR differences
- **Testing protocol:**
  - MSS: Full-effort 40-60m sprint (timing gates or GPS)
  - MAS: 1500m or 2km time trial, or predicted from race performance
  - MAS prediction from 1500m: validated by Sandford et al. 2019 (IJSPP)
- **Rappelt et al. 2025 (JSAMS):**
  - Combined MSS and MAS in predictive model for 400m: R² = 0.90
  - SRR enables differentiation between sprint-type and endurance-type 400m athletes
  - Speed reserve ratio continuum useful for athlete categorization
- **Implementation for STRIDE:**
  - If user provides sprint data (100m, 200m, 400m) + distance data (1500m+), calculate SRR
  - Use SRR to adjust predictions for middle-distance events
  - High SRR → better at shorter events relative to prediction
  - Low SRR → better at longer events relative to prediction
  - Critical for 400m-1500m prediction accuracy

### Tinman / Critical Velocity Model (Tom Schwartz)
- **Source:** Tom "Tinman" Schwartz, Tinman Endurance Coaching LLC. Also: Running Writings calculator by John Davis (2025).
- **Definition of CV:** The boundary separating metabolically sustainable and unsustainable paces
  - Sustainable for approximately 30-40 minutes of racing
  - Approximately 10K race pace for well-trained runners
  - Sits between threshold (LT2) and VO2max pace
- **Relationship hierarchy:**
  - Threshold < CV < VO2max pace
  - Threshold = fastest metabolic steady-state pace
  - CV = boundary between sustainable/unsustainable
  - VO2max pace = slowest speed producing unsustainable state
- **Running Writings Calculator (John Davis, 2025):**
  - Built from 8,000+ race performances from 1,600+ runners across 2,600 seasons
  - Includes HS, college, adult, and masters athletes
  - Uses critical speed model as gold standard
  - Provides "safe estimate" (90th percentile) and "median estimate" (50th percentile)
  - Explicitly accounts for uncertainty (10th-90th percentile range)
  - Key finding: Men and women at same performance level have SAME threshold/CV/VO2max paces
  - Key finding: High school and college runners do NOT differ after accounting for performance level
  - Supports 800m to 10K input distances
- **Training pace definitions (Tinman system):**
  - Easy: well below threshold
  - Steady/Tempo: at or near threshold
  - CV: ~10K pace, 30-35 min race effort
  - VO2max intervals: ~3K-5K pace
  - Repetition/Speed: faster than VO2max pace
- **Key insight for STRIDE:** CV-based systems provide UNCERTAINTY RANGES, not point estimates — this directly supports STRIDE's confidence model

### Percent-of-World-Record Model
- **Concept:** If a runner performs at X% of the world record at one distance, they should perform at approximately X% at other distances
- **Implementation:** 
  - Calculate: athlete_time / world_record_time for input distance
  - Apply same percentage to world record at target distance
  - Predicted_time = world_record_target × (athlete_time / world_record_input)
- **Limitation:** Assumes linear scaling, which is known to be incorrect
  - Elite runners are closer to WR at their specialty distance
  - Recreational runners are further from WR at longer distances
  - Sprint WRs are dominated by genetic outliers (Bolt effect)
- **Use for STRIDE:** Low-weight normalization layer only; not a primary prediction tool
- **Advantage:** Simple, intuitive, covers all events
- **Better variant:** Use age-graded percentages instead of raw WR percentages



## SECTION 2: PHYSIOLOGY MODELS & TRAINING PACE RESEARCH

### Lactate Threshold Definitions and Zones
- **LT1 (First Lactate Threshold / Aerobic Threshold):**
  - Blood lactate ~2.0 mmol/L
  - Transition from moderate to heavy intensity
  - Below LT1: metabolic steady-state easily maintained
  - Heart rate: approximately 70-80% HRmax (highly individual)
  - Running Writings (Davis 2025): "The entire point of heart rate zones is to tell whether you are below LT1, above LT1, or above LT2"

- **LT2 (Second Lactate Threshold / Anaerobic Threshold / SSmax):**
  - Blood lactate ~4.0 mmol/L (OBLA = Onset of Blood Lactate Accumulation)
  - Fastest metabolic steady-state pace
  - Above LT2: lactate accumulates continuously → eventual exhaustion
  - Heart rate: approximately 85-92% HRmax (highly individual)
  - Also called: MLSS (Maximal Lactate Steady State), "threshold pace"

- **OBLA (Onset of Blood Lactate Accumulation):**
  - Fixed reference at 4 mmol/L
  - Used historically as a standardized threshold marker
  - Norwegian model uses 2-4.5 mmol/L range for threshold training

### Norwegian Lactate-Guided Threshold Interval Training (LGTIT)
- **Source:** Casado A, Foster C, Bakken M, Tjelta LI. "Does Lactate-Guided Threshold Interval Training within a High-Volume Low-Intensity Approach Represent the 'Next Step' in the Evolution of Distance Running Training?" IJERPH 20(5): 3782, 2023. Cited by 95.
- **Model description:**
  - 3-4 LGTIT sessions per week + 1 VO2max session
  - Low intensity running up to 150-180 km/week total
  - Training pace dictated by blood lactate TARGET (2-4.5 mmol/L)
  - Internal load (lactate) rather than external load (pace) controls intensity
  - Lactate measured every 1-3 repetitions during intervals
- **Key innovation:** Pace is the OUTPUT, not the INPUT
  - Same athlete may run different paces on different days to hit same lactate target
  - Accounts for fatigue, sleep, nutrition, weather automatically
- **Zone structure (Norwegian model):**
  - Zone 1: Recovery/Easy (HR < 70% max)
  - Zone 2: Aerobic threshold (~70-80% max)
  - Zone 3: Tempo/Threshold (LT2 zone, 2-4.5 mmol/L target)
  - Zone 4: Anaerobic endurance (3000m/800m race speeds, >8 mmol/L)
- **Physiological rationale:**
  - Interval character allows high absolute speeds at relatively low metabolic intensity
  - Maximizes motor unit recruitment at threshold metabolic cost
  - Allows more rapid recovery between sessions → greater weekly volume of quality work
  - Optimizes calcium and AMPK signaling for mitochondrial proliferation

### Training Pace Systems Comparison

| System | Easy | Steady/Tempo | Threshold | CV | VO2max | Repetition |
|--------|------|-------------|-----------|----|---------|----|
| Daniels | 59-74% VO2max | - | 83-88% VO2max (20-30 min effort) | - | 95-100% VO2max (11-12 min effort) | 105-110% VO2max |
| Tinman | Well below threshold | - | Fastest steady-state | ~10K pace / 30-35 min effort | ~3K-5K pace | Faster than VO2max |
| Norwegian | Zone 1-2 (<70-80% HR) | - | Zone 3 (2-4.5 mmol/L) | - | Zone 4 (>8 mmol/L) | - |
| Canova | Fundamental | Medium | Fast | - | Specific (race pace) | Short/Fast |

### Key Relationships Between Physiological Markers and Race Paces
- **Threshold pace ≈ 1-hour race pace** (approximately half marathon for elites, 10-15K for recreational)
- **CV ≈ 30-40 minute race pace** (approximately 10K for well-trained)
- **VO2max pace ≈ 8-12 minute race pace** (approximately 3K for well-trained)
- **MAS (Maximal Aerobic Speed) ≈ ~7 minute effort** (approximately 2K for well-trained)

### Critical Insight for STRIDE Training Paces
- **Running Writings dataset (8,000+ performances, 1,600+ runners):**
  - Men and women at same performance level have SAME threshold/CV/VO2max paces
  - High school and college runners do NOT differ after accounting for performance level
  - Massive individual variation exists: two runners with same 5K time can have very different threshold paces
  - Uncertainty range for threshold from 800m input is MUCH wider than from 5K/10K input
  - "Safe estimate" (90th percentile) recommended over median for training prescription

### VO2max as Performance Predictor
- **Strengths:**
  - Strong correlation with distance running performance (r = 0.7-0.9 in heterogeneous groups)
  - Useful when combined with running economy and fractional utilization
  - Daniels' VDOT effectively uses VO2max as the unifying metric
- **Limitations:**
  - Does NOT reliably predict race finish ORDER among homogeneous groups
  - Two runners with same VO2max can differ by 2+ minutes in 5K
  - Running economy explains remaining variance
  - Fractional utilization (%VO2max sustainable) varies by training and event
  - Elite marathoners sustain ~85% VO2max; recreational ~70-75%
- **For STRIDE:** VO2max should be ONE data point, not the master metric

### Running Economy
- **Definition:** Oxygen cost (ml/kg/min) at a given submaximal speed
- **Importance:** Better predictor of performance than VO2max among homogeneous groups
- **Typical values:** 
  - Elite: ~180-200 ml/kg/km
  - Recreational: ~210-240 ml/kg/km
- **Field proxies (no lab needed):**
  - Ratio of race pace to heart rate at that pace
  - "Running Effectiveness" from Stryd power meter (pace per watt)
  - Improvement in pace at same HR over time
- **Factors affecting RE:** Biomechanics, training history, shoe type, altitude adaptation, body composition

### Easy Pace Research
- **Key coaching insight (from STRIDE brief):** Easy pace is highly individual and recovery-dependent
- **Research findings:**
  - Easy pace should be BELOW LT1 (Zone 1)
  - Traditional calculators often prescribe easy pace too fast for recreational runners
  - Example: Female 16:43 5K runner — calculator says 6:27/mi easy, coach recommends 7:00-8:00/mi
  - Easy pace should be shown as a BROAD RANGE with RPE guidance
  - RPE 3-4 on 0-10 scale, or "conversational pace"
  - Heart rate: below ~75% HRmax or ~65% HRR (highly individual)
- **Daniels Easy range:** 59-74% VO2max (quite broad already)
- **Recommendation for STRIDE:** 
  - Show easy pace as wide range (e.g., 7:00-8:15/mi for an 18:00 5K runner)
  - Include RPE descriptor: "Should feel effortless, fully conversational"
  - Do NOT prescribe a single easy pace number



## SECTION 3: PERFORMANCE DATASETS & DATA ACCESS

### Available Public/Research Datasets

| Dataset | Coverage | Access | Size | Notes |
|---------|----------|--------|------|-------|
| NRCD (National Running Club Database) | Collegiate club XC (6K/8K) | Zenodo (open) | 15,397 results, 5,585 athletes | 2023-2024 seasons, includes weather/elevation standardization |
| parkrun | 5K weekly events worldwide | Public results pages (scraping) | 36+ million timed runs | Age, gender, event location; no API but scrapeable |
| Strava | All distances, GPS data | Research partnerships only | 100M+ users | Performance Predictions feature uses historical data |
| TFRRS | NCAA track/XC results | Web only (no API) | All NCAA D1/D2/D3 | Comprehensive but no bulk download |
| Athletic.net | HS/MS track & XC | Web only (no API) | Millions of results | US high school comprehensive |
| MileSplit | HS track & XC | Web only (no API) | Millions of results | Similar to Athletic.net |
| World Athletics | Elite international | Scoring tables (PDF/JSON) | All WA-sanctioned events | Jeff Chen reverse-engineered coefficients |
| WMA Age Grading | Masters (30-110) | Open factors tables | All standard events | Updated 2023, downloadable |
| RunRepeat | Marathon/HM mass participation | Research partnerships | 107M+ race results | Used in Nikolaidis et al. studies |
| MarathonGuide | US marathon results | Web (limited scraping) | 20+ years of results | Age, gender, splits |

### Key Research Papers Using Large Datasets
1. **Smyth (2021) "Human running performance from real-world big data"** — Nature Communications
   - Used GPS data from recreational runners
   - Demonstrated feasibility of extracting performance indices from real-world data
   - Showed individual variation in fatigue profiles

2. **Blythe & Király (2016) "Individual athletic performance prediction"** — PLOS ONE
   - 5,000+ athletes, 50,000+ performances
   - Proved individual power-law exponents vary significantly
   - Local Matrix Completion algorithm for personalized predictions

3. **NRCD (Karr et al. 2025)** — arXiv
   - Uses Riegel formula with sex-specific exponents: b=1.055 (men), b=1.080 (women)
   - Weather standardization: temp + dew point > 100°F → time adjustment
   - Elevation gain standardization included
   - Dataset: https://zenodo.org/uploads/16652626

### Longitudinal Development & Improvement Rates
- **Age-related decline (Davis/RunnersConnect):**
  - ~0.2% per year after age 40 at moderate distances
  - 1-1.4% per year at the marathon distance
  - Works out to 1-6 seconds per mile per year of aging
  
- **Novice improvement rates (Boullosa et al. 2020, cited 194):**
  - First year of structured training: 10-20% improvement typical
  - Second year: 5-10% improvement
  - Third year: 2-5% improvement
  - Diminishing returns follow logarithmic curve
  
- **NRCD findings on seasonal improvement:**
  - Slower initial runners improve more per calendar day
  - More frequent racing correlates with greater improvement
  - Women (6K) and men (8K) show comparable improvement patterns

## SECTION 4: ENVIRONMENTAL CORRECTIONS

### Heat/Humidity Correction (Running Writings / Davis 2025)
- **Data source:** 3,891 marathon runners across 754 different races
- **Model type:** Statistical model allowing nonlinear interaction between temperature and humidity
- **Input options:** Heat index, temperature + relative humidity, or temperature + dew point
- **Key formula concept:**
  - Speed_reduction = f(temperature, humidity) — nonlinear interaction
  - Pace adjustment is NOT linear (speed reduction → nonlinear pace increase)
- **Practical approximation (coaching heuristic):**
  - Temp + Dew Point > 100°F → performance starts degrading
  - Every 10°F above 100 combined → approximately 2-3% pace slowdown
  - More precise: Base Pace + [(Dew Point°F - 60) × 0.025] = Adjusted Pace
- **Validation case studies:**
  - 2007 Osaka WC: Kibet 2:15:59 in 82°F/72% → converts to 2:08:55 (actual PB: 2:08:52)
  - 2008 Beijing Olympics: Wanjiru 2:06:32 in 70°F/72% → converts to 2:04:32
- **Limitations:**
  - Fit to marathon data; shorter races affected less
  - Individual heat acclimation creates large variance
  - Data sparse above 95°F and below 32°F
  - Only valid for continuous efforts (not interval training)

### Altitude Correction (Péronnet & Thibault 1991)
- **Source:** Péronnet F, Thibault G. "A theoretical analysis of the effect of altitude on running performance." J Appl Physiol 70(1): 399-404, 1991. Cited by 130.
- **Two competing effects:**
  1. NEGATIVE: Reduced VO2max (reduced O2 partial pressure) → slows distance events
  2. POSITIVE: Reduced air density → less aerodynamic drag → helps sprints
- **Net effect by distance:**
  - 100m: FASTER at altitude (e.g., Mexico City 1968: +1.9% speed)
  - 200m: FASTER at altitude
  - 400m: Approximately neutral (competing effects cancel)
  - 800m+: SLOWER at altitude (aerobic limitation dominates)
  - Marathon: Significantly slower (~3-5% at 2000m)
- **VO2max reduction formula:**
  - VO2max_altitude = VO2max_sea_level × (1 - 0.000105 × altitude_meters) for altitudes > ~1500m
  - More precise: exponential decline above 1000m
- **Sprint correction (air resistance):**
  - Air density at altitude h: ρ(h) = ρ₀ × exp(-h/7000)
  - Drag force reduction proportional to density reduction
  - 100m at 2240m (Mexico City): ~0.04s advantage
- **Implementation for STRIDE:**
  - Sprints (100-200m): Apply drag reduction formula
  - Middle distance (400-1500m): Blend of drag benefit and VO2max loss
  - Distance (3K+): Apply VO2max reduction model
  - Crossover point: ~400m where effects approximately cancel

### Wind Correction for Sprints (Moinat, Fabius & Emanuel 2018)
- **Source:** "Data-driven quantification of the effect of wind on athletics performance." European Journal of Sport Science 18(6): 820-826, 2018. Cited by 18.
- **Methodology:** 150,169 competition results, quadratic mixed effects model
- **Key findings:**
  - 2.0 m/s tailwind advantage:
    - 100m: 0.125 seconds
    - 200m: 0.140 seconds
    - 100/110m hurdles: 0.146 seconds
    - Long jump: 0.058 m
    - Triple jump: 0.102 m
  - Relationship is QUADRATIC (not linear)
  - Linear AND quadratic coefficients significant (p < .001) for all events except LJ quadratic
  - Performance level matters: Amateur athletes (13s 100m) benefit 69% MORE from 2.0 m/s tailwind than elite (10s 100m)
- **Practical formula (100m):**
  - Corrected_time = Actual_time + a×wind + b×wind²
  - Where a and b are event-specific coefficients from the paper
- **Implementation for STRIDE:**
  - Apply to 100m, 200m results when wind data available
  - Use performance-level-adjusted coefficients
  - Legal wind limit: ≤ 2.0 m/s for record purposes

### Wind Correction for Distance (Running Writings / Davis 2024)
- **Source:** Running Writings Track Wind Calculator and Wind Calculator
- **Methodology:** Based on drag force and air resistance calculations validated against wind tunnel data
- **Key physics:**
  - Headwinds slow you MORE than tailwinds speed you up (asymmetric effect)
  - On a track: net effect of wind is always detrimental (even with tailwind portions)
  - Wind direction relative to track matters (crosswind on straights better than head/tail)
- **Metabolic cost model:**
  - Drag force: F_drag = 0.5 × ρ × C_d × A × v_relative²
  - Where v_relative = runner_speed ± wind_speed (depending on direction)
  - Metabolic cost increase from headwind is proportional to v_relative²
- **Limitations:**
  - Accurate for wind speeds up to 15 mph (24 km/h)
  - Slightly too pessimistic above 20 mph (runners lean into wind, creating lift)
  - Not reliable for sprint speeds (sub-50s 400m)
  - For 100m/200m sprints: use Moinat et al. empirical formula instead

### Grade/Elevation Correction (GAP - Grade Adjusted Pace)
- **Source:** Running Writings GAP Calculator; Strava GAP algorithm
- **Concept:** Converts uphill/downhill running to equivalent flat-ground effort
- **Key relationships:**
  - Uphill: metabolic cost increases approximately linearly with grade
  - Downhill: metabolic cost decreases to a minimum around -10% to -15% grade, then increases
  - Optimal downhill grade (minimum cost): approximately -10%
- **Implementation:** 
  - For road races: minimal effect (most courses relatively flat)
  - For trail/ultra: essential correction
  - For STRIDE: include as optional adjustment for hilly courses

## SECTION 5: CONFIDENCE MODEL & ERROR MATRICES

### Prediction Error by Distance and Model

| Model | 5K→10K | 5K→HM | 5K→Marathon | 10K→Marathon | Notes |
|-------|--------|-------|-------------|--------------|-------|
| Riegel (1.06) | ±2-3% | ±5-7% | ±8-15% | ±5-10% | Systematic overestimation at marathon |
| Cameron | ±2-3% | ±4-6% | ±6-10% | ±4-7% | Better for recreational |
| Daniels VDOT | ±2-3% | ±4-6% | ±7-12% | ±5-8% | Assumes equal training |
| Critical Speed (2-input) | ±1-2% | ±3-5% | ±5-8% | ±3-6% | Requires 2 race inputs |
| Mercier Nomogram (2-input) | ±1-2% | ±3-5% | ±5-7% | ±3-5% | Interpolation more accurate |
| Blythe Individual | ±1-2% | ±2-4% | ±3-6% | ±2-5% | Requires 3+ race inputs |

### Factors That Increase Prediction Uncertainty
1. **Extrapolation distance:** Predicting marathon from 800m = very high error
2. **Training specificity:** Untrained for target distance = systematic underperformance
3. **Population mismatch:** Using elite model for recreational = systematic error
4. **Environmental conditions:** Unaccounted heat/altitude = systematic error
5. **Individual physiology:** Speed vs. endurance orientation (ASR/SRR)
6. **Race experience:** First-time marathoners systematically underperform predictions

### Confidence Scoring Framework for STRIDE
- **High confidence (±2-3%):** 
  - Adjacent distances (5K→10K, 10K→HM)
  - Multiple input races available
  - Known training volume adequate for target
- **Medium confidence (±5-8%):**
  - 2x distance jump (5K→HM, 10K→M)
  - Single input race
  - Training volume unknown
- **Low confidence (±10-15%):**
  - 3x+ distance jump (5K→M, mile→M)
  - Sprint to distance prediction
  - First-time at target distance
  - Environmental conditions extreme

### Validation Approach for STRIDE
1. **Backtesting:** Use historical race results (parkrun, NRCD, marathon databases) to test predictions against actual outcomes
2. **A/B testing:** Compare STRIDE predictions against Riegel, VDOT, McMillan for same athletes
3. **User feedback loop:** Track predicted vs. actual race times from STRIDE users
4. **Error reporting:** Show confidence intervals to users, not just point estimates
5. **Adaptive learning:** If user provides multiple races, narrow confidence interval using individual exponent



## SECTION 6: COMPETITIVE BENCHMARKING — PERCENTILE TABLES

### Source: RunRepeat (35 million results, 28,000+ races, 20 years of data)

#### Overall Percentile Table (All Genders Combined)

| Percentile | 5K | 10K | Half Marathon | Marathon |
|-----------|-----|------|---------------|----------|
| 1st (elite) | 18:40 | 36:18 | 1:23:59 | 2:50:48 |
| 10th | 25:20 | 48:11 | 1:47:10 | 3:31:46 |
| 20th | 28:13 | 52:47 | 1:56:12 | 3:49:53 |
| 30th | 30:26 | 56:03 | 2:02:48 | 4:02:56 |
| 40th | 32:29 | 59:05 | 2:08:54 | 4:15:09 |
| 50th (median) | 34:37 | 1:02:08 | 2:14:59 | 4:26:33 |
| 60th | 36:58 | 1:05:38 | 2:21:42 | 4:38:30 |
| 70th | 39:48 | 1:10:08 | 2:29:48 | 4:52:18 |
| 80th | 43:39 | 1:16:45 | 2:41:05 | 5:11:00 |
| 90th | 50:04 | 1:27:58 | 2:59:18 | 5:41:45 |

#### Male Percentile Table

| Percentile | 5K | 10K | Half Marathon | Marathon |
|-----------|-----|------|---------------|----------|
| 1st | 17:30 | 34:24 | 1:18:37 | 2:44:18 |
| 10th | 23:26 | 45:11 | 1:40:35 | 3:22:40 |
| 20th | 26:04 | 49:37 | 1:49:13 | 3:40:13 |
| 30th | 27:58 | 52:28 | 1:55:03 | 3:53:07 |
| 40th | 29:41 | 54:50 | 1:58:16 | 4:03:47 |
| 50th | 31:28 | 57:15 | 1:59:48 | 4:14:29 |
| 60th | 33:28 | 1:00:02 | 2:09:58 | 4:25:33 |
| 70th | 35:55 | 1:03:43 | 2:16:31 | 4:38:26 |
| 80th | 39:21 | 1:09:13 | 2:25:57 | 4:55:33 |
| 90th | 45:43 | 1:19:21 | 2:42:48 | 5:25:26 |

#### Female Percentile Table

| Percentile | 5K | 10K | Half Marathon | Marathon |
|-----------|-----|------|---------------|----------|
| 1st | 21:39 | 41:12 | 1:35:55 | 3:11:35 |
| 10th | 28:24 | 53:35 | 1:57:01 | 3:49:22 |
| 20th | 31:09 | 58:01 | 2:05:58 | 4:06:58 |
| 30th | 33:19 | 1:01:02 | 2:12:25 | 4:20:24 |
| 40th | 35:21 | 1:03:50 | 2:18:10 | 4:31:21 |
| 50th | 37:28 | 1:06:54 | 2:24:03 | 4:42:09 |
| 60th | 39:47 | 1:10:38 | 2:30:44 | 4:53:37 |
| 70th | 42:36 | 1:15:36 | 2:39:05 | 5:07:36 |
| 80th | 46:23 | 1:22:46 | 2:50:31 | 5:26:40 |
| 90th | 52:24 | 1:33:14 | 3:08:21 | 5:56:31 |

### Oficial-Casado et al. (2026) — Valencia Marathon Prediction from Half Marathon
- **Source:** "Performance prediction equation for the Valencia Marathon based on time and pacing in the half marathon." Frontiers in Physiology, 2026.
- **Key innovation:** Uses BOTH half marathon time AND pacing behavior (even vs. variable splits) to predict marathon
- **Variables:** Half marathon race time, age category, sex, pacing range (max-min relative speed)
- **Finding:** Better predictions than Daniels' VDOT when pacing variability is included
- **Implication for STRIDE:** If user provides split data (not just finish time), prediction accuracy improves significantly

### Event Transfer Matrix — Observed Ratios

Based on percentile data analysis, the actual ratio between distances at different performance levels:

| From → To | Elite (1st %ile) | Competitive (10th) | Recreational (50th) | Slow (90th) |
|-----------|------------------|-------------------|---------------------|-------------|
| 5K → 10K | 1.95× | 1.90× | 1.79× | 1.76× |
| 5K → HM | 4.50× | 4.22× | 3.88× | 3.57× |
| 5K → Marathon | 9.14× | 8.34× | 7.69× | 6.81× |
| 10K → HM | 2.31× | 2.22× | 2.17× | 2.03× |
| 10K → Marathon | 4.69× | 4.39× | 4.29× | 3.87× |
| HM → Marathon | 2.03× | 1.98× | 1.98× | 1.90× |

**Critical insight:** The ratio is NOT constant across performance levels. Elite runners have HIGHER ratios (they slow down more proportionally going from short to long), while recreational runners have LOWER ratios. This is the opposite of what Riegel predicts and reflects the selection bias in who enters marathons vs. 5Ks.

