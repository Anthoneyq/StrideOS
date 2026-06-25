# Stride OS: Supplementary Appendix
## Heart Rate Formulas, Training Philosophies, and Implementation Specifications
*Author: Manus AI*  
*Date: May 26, 2026*

---

## Appendix A: Complete Heart Rate Zone Calculation Methods

### A.1 Maximum Heart Rate (HRmax) Estimation Formulas

| Formula | Equation | Source | Accuracy Notes |
| :--- | :--- | :--- | :--- |
| **Fox (Traditional)** | $HRmax = 220 - Age$ | Fox et al. (1971) | Standard deviation of $\pm 10-12\text{ bpm}$; highly inaccurate for individuals |
| **Tanaka (Revised)** | $HRmax = 208 - 0.7 \times Age$ | Tanaka et al. (2001) | Meta-analysis of 351 studies, 18,712 subjects. More accurate for trained athletes |
| **Gulati (Women)** | $HRmax = 206 - 0.88 \times Age$ | Gulati et al. (2010) | Specific to women; derived from 5,437 asymptomatic women |
| **Gellish** | $HRmax = 207 - 0.7 \times Age$ | Gellish et al. (2007) | Very similar to Tanaka; validated in a longitudinal study |
| **Field Test** | Actual measured max from a graded effort test | N/A | Gold standard; requires a 3-5 minute all-out hill or track effort |

**Stride OS Recommendation:** Use the **Tanaka formula** as the default estimate, but always prompt the user to validate with a field test. Store the field-test result as the authoritative value.

---

### A.2 The Karvonen (Heart Rate Reserve) Method

The Karvonen method is more accurate than simple percentage-of-max because it accounts for the athlete's resting heart rate, which reflects their current aerobic fitness level.

**Heart Rate Reserve (HRR):**
$$HRR = HRmax - HRrest$$

**Target Heart Rate at a given intensity percentage ($\%I$):**
$$HR_{target} = HRrest + \%I \times (HRmax - HRrest)$$

**Example:** A 30-year-old runner with $HRmax = 190\text{ bpm}$ and $HRrest = 50\text{ bpm}$.
*   $HRR = 190 - 50 = 140\text{ bpm}$.
*   Target HR at $70\%$ intensity: $50 + 0.70 \times 140 = 148\text{ bpm}$.
*   Target HR at $85\%$ intensity: $50 + 0.85 \times 140 = 169\text{ bpm}$.

---

### A.3 The Maffetone MAF 180 Formula

Dr. Phil Maffetone's formula is designed to find the **Maximum Aerobic Function (MAF) Heart Rate**, which represents the upper boundary of purely aerobic training (approximately the top of Zone 2 in a 5-zone model).

**Base Formula:**
$$MAF_{HR} = 180 - Age$$

**Adjustments:**
*   **Subtract 10:** If recovering from major illness, surgery, or chronic overtraining.
*   **Subtract 5:** If injured, inconsistent, just starting training, getting frequent colds/flu, or overfat.
*   **No modification:** If training consistently (4+ times/week) for up to 2 years without problems.
*   **Add 5:** If training consistently for 2+ years with measurable progress and no injuries.

**Exemptions:**
*   Athletes over 65: May add up to 10 beats (only if in the "Add 5" category).
*   Athletes 16 and under: Use a fixed MAF HR of 165 bpm.

**Training Protocol:** All aerobic training is performed within a 10-beat range below MAF HR. Progress is measured by the **MAF Test**: run a fixed distance (e.g., 5 miles) at MAF HR and track pace improvement over months.

---

### A.4 Lactate Threshold Heart Rate (LTHR) Zone Model

Based on the 30-minute time trial protocol (Section 3.2 of the main report), the LTHR provides the most physiologically accurate zone system for individual runners.

| Zone | Name | % of LTHR | RPE (1-10) | Purpose |
| :---: | :--- | :---: | :---: | :--- |
| 1 | Active Recovery | $< 80\%$ | 2-3 | Blood flow, mental recovery |
| 2 | Aerobic Endurance | $80 - 88\%$ | 3-4 | Mitochondrial density, fat oxidation |
| 3 | Tempo / "Gray Zone" | $89 - 95\%$ | 5-6 | Moderate aerobic stimulus |
| 4 | Sub-Threshold | $96 - 99\%$ | 7-8 | Lactate clearance, buffering |
| 5a | Threshold | $100 - 102\%$ | 8-9 | Maximal steady-state power |
| 5b | VO2max | $103 - 106\%$ | 9-10 | Maximal oxygen uptake |
| 5c | Anaerobic | $> 106\%$ | 10 | Neuromuscular power, speed |

---

## Appendix B: Comparative Training Philosophies

### B.1 The Major Coaching Systems

| Philosophy | Founder | Core Principle | Periodization Style | Best Suited For |
| :--- | :--- | :--- | :--- | :--- |
| **Lydiard** | Arthur Lydiard (NZ, 1960s) | Build a massive aerobic base first; then sharpen with anaerobic work | Linear (Base → Hill → Anaerobic → Sharpening → Taper) | 5K to Marathon; athletes who can handle high volume |
| **Daniels** | Jack Daniels (USA, 1980s) | Prescribe exact training paces based on current fitness (VDOT) | Phase-based (Easy → Repetition → Interval → Threshold → Race) | Structured coaches; high school/college programs |
| **Canova** | Renato Canova (Italy, 1990s) | Race-specific training from Day 1; "special block" periodization | Non-linear (Fundamental → Special → Specific → Competition) | Elite marathoners; athletes with high training ages |
| **Pfitzinger** | Pete Pfitzinger (USA, 2000s) | Structured, evidence-based marathon plans with specific weekly mileage targets | Linear with built-in recovery weeks | Competitive recreational marathoners |
| **Hanson** | Keith & Kevin Hanson (USA, 2000s) | Cumulative fatigue; train on tired legs to simulate late-race conditions | Linear with high-frequency running (6 days/week) | Marathon-specific; runners who respond to volume |
| **Hudson** | Brad Hudson (USA, 2000s) | Adaptive training; adjust daily based on athlete response | Flexible/Non-linear | Athletes with experienced coaches; post-collegiate |
| **Maffetone** | Phil Maffetone (USA, 1980s) | Exclusively aerobic training below MAF HR until aerobic base is maximized | No traditional periodization; continuous aerobic development | Injury-prone athletes; ultra-endurance; beginners |
| **80/20 (Seiler)** | Stephen Seiler (Norway, 2000s) | 80% of training time at low intensity; 20% at high intensity; avoid the "gray zone" | Polarized intensity distribution | All levels; backed by strongest research evidence |

---

### B.2 The 80/20 Polarized Training Model (In Depth)

Pioneered by Dr. Stephen Seiler at the University of Agder in Norway, this model is based on the observation that elite endurance athletes across all disciplines (running, cycling, rowing, XC skiing) independently converge on the same intensity distribution: approximately $80\%$ low intensity and $20\%$ high intensity, with minimal time in the "moderate" zone.

**Key Research Findings:**
*   A 2013 study of 30 recreational runners over 10 weeks found that the 80/20 group improved their 10K times by $5.0\%$ compared to $3.6\%$ for the 50/50 (threshold-heavy) group.
*   The "sweet spot" between easy and hard is defined by the **Ventilatory Threshold (VT1)**, which falls at approximately $77 - 79\%$ of maximum heart rate in trained runners.
*   The critical insight: Running in the "moderate" zone ($80 - 88\%$ of HRmax) is too hard to allow full recovery but too easy to stimulate $VO_2max$ adaptation. It is physiologically "dead zone" training.

**Stride OS Implementation:**
*   When analyzing an athlete's training log, Stride OS should calculate the **Intensity Distribution Ratio (IDR)** for each week:
    *   $IDR = \frac{\text{Time below VT1}}{\text{Total Training Time}} \times 100$
*   If $IDR < 75\%$, flag the athlete with: *"Your easy runs may not be easy enough. Research shows optimal adaptation occurs when 80% of training time is below your ventilatory threshold."*

---

## Appendix C: Running Biomechanics Reference Values

### C.1 Optimal Running Form Metrics

| Metric | Recreational Runners | Competitive Runners | Elite Runners | How to Improve |
| :--- | :--- | :--- | :--- | :--- |
| **Cadence** (steps/min) | 155 - 170 | 170 - 180 | 180 - 195 | Metronome drills; shorten stride |
| **Ground Contact Time** (ms) | 280 - 350 | 220 - 280 | 180 - 220 | Plyometrics; hill sprints |
| **Vertical Oscillation** (cm) | 8 - 12 | 6 - 9 | 5 - 7 | Core strength; cue "run tall" |
| **Vertical Ratio** (%) | 8 - 12% | 6 - 8% | 4 - 6% | Combination of cadence + oscillation |
| **Stride Length** (m) | 1.0 - 1.3 | 1.3 - 1.6 | 1.6 - 2.2 | Hip extension strength; flexibility |

**Key Principle:** Cadence and ground contact time are the two most actionable metrics. Increasing cadence by $5 - 10\%$ at a given speed reduces ground contact time, vertical oscillation, and impact loading rate simultaneously. However, forced cadence increases beyond $5\%$ can worsen running economy.

---

### C.2 Ground Contact Time Balance (GCT Balance)

GCT Balance measures the symmetry between left and right foot contact times. Research shows that a GCT imbalance of $> 2\%$ is significantly correlated with impaired running economy and elevated injury risk.

**Stride OS Implementation:** If wearable data shows consistent GCT imbalance $> 2\%$, flag the athlete and recommend:
1.  Single-leg strength assessment (single-leg squat, single-leg calf raise).
2.  Gait analysis referral.
3.  Targeted unilateral strength work on the weaker side.

---

## Appendix D: Race Distance Conversion Quick-Reference

### D.1 Riegel Conversion Factors (from 5K baseline)

| Target Distance | Conversion Factor (× 5K Time) | Example (20:00 5K) |
| :--- | :--- | :--- |
| **1 Mile** | 0.298 | 5:58 |
| **3K** | 0.575 | 11:30 |
| **5K** | 1.000 | 20:00 |
| **8K** | 1.660 | 33:12 |
| **10K** | 2.107 | 42:08 |
| **15K** | 3.244 | 1:04:53 |
| **Half Marathon** | 4.545 | 1:30:54 |
| **Marathon** | 9.607 | 3:12:08 |

*Note: These factors assume equivalent training for all distances. Real-world marathon times for a 20:00 5K runner with < 40 miles/week training will be significantly slower (3:20 - 3:30+).*

---

### D.2 Age-Grading Formula (World Masters Athletics)

Age-grading allows comparison of performances across ages and genders by calculating what percentage of the age-specific world record the performance represents.

$$\text{Age-Graded Performance (\%)} = \frac{\text{Age Standard (World Record for Age/Sex)}}{\text{Actual Time}} \times 100$$

| Age-Graded % | Performance Level |
| :--- | :--- |
| $> 90\%$ | World Class |
| $80 - 89\%$ | National Class |
| $70 - 79\%$ | Regional Class |
| $60 - 69\%$ | Local Competitive |
| $50 - 59\%$ | Recreational |
| $< 50\%$ | Beginner |

---

## Appendix E: Complete VO2max Norms Table

### E.1 VO2max Classification by Age and Sex (ml/kg/min)

**Males:**

| Age | Very Poor | Poor | Fair | Good | Excellent | Superior |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 13-19 | < 35.0 | 35.0-38.3 | 38.4-45.1 | 45.2-50.9 | 51.0-55.9 | > 55.9 |
| 20-29 | < 33.0 | 33.0-36.4 | 36.5-42.4 | 42.5-46.4 | 46.5-52.4 | > 52.4 |
| 30-39 | < 31.5 | 31.5-35.4 | 35.5-40.9 | 41.0-44.9 | 45.0-49.4 | > 49.4 |
| 40-49 | < 30.2 | 30.2-33.5 | 33.6-38.9 | 39.0-43.7 | 43.8-48.0 | > 48.0 |
| 50-59 | < 26.1 | 26.1-30.9 | 31.0-35.7 | 35.8-40.9 | 41.0-45.3 | > 45.3 |
| 60+ | < 20.5 | 20.5-26.0 | 26.1-32.2 | 32.3-36.4 | 36.5-44.2 | > 44.2 |

**Females:**

| Age | Very Poor | Poor | Fair | Good | Excellent | Superior |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 13-19 | < 25.0 | 25.0-30.9 | 31.0-34.9 | 35.0-38.9 | 39.0-41.9 | > 41.9 |
| 20-29 | < 23.6 | 23.6-28.9 | 29.0-32.9 | 33.0-36.9 | 37.0-41.0 | > 41.0 |
| 30-39 | < 22.8 | 22.8-26.9 | 27.0-31.4 | 31.5-35.6 | 35.7-40.0 | > 40.0 |
| 40-49 | < 21.0 | 21.0-24.4 | 24.5-28.9 | 29.0-32.8 | 32.9-36.9 | > 36.9 |
| 50-59 | < 20.2 | 20.2-22.7 | 22.8-26.9 | 27.0-31.4 | 31.5-35.7 | > 35.7 |
| 60+ | < 17.5 | 17.5-20.1 | 20.2-24.4 | 24.5-30.2 | 30.3-31.4 | > 31.4 |

---

## Appendix F: VDOT Reference Table (Expanded)

| VDOT | 1500m | Mile | 3K | 5K | 10K | Half Marathon | Marathon |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 30 | 8:30 | 9:10 | 17:56 | 30:41 | 1:03:49 | 2:21:17 | 4:49:49 |
| 35 | 7:25 | 8:01 | 15:44 | 26:59 | 56:02 | 2:04:13 | 4:16:06 |
| 40 | 6:35 | 7:07 | 14:02 | 24:06 | 50:01 | 1:50:54 | 3:49:37 |
| 45 | 5:56 | 6:24 | 12:40 | 21:49 | 45:13 | 1:40:14 | 3:28:16 |
| 50 | 5:24 | 5:50 | 11:33 | 19:56 | 41:20 | 1:31:31 | 3:10:40 |
| 55 | 4:57 | 5:21 | 10:37 | 18:22 | 38:06 | 1:24:16 | 2:55:55 |
| 60 | 4:35 | 4:57 | 9:50 | 17:03 | 35:22 | 1:18:09 | 2:43:22 |
| 65 | 4:16 | 4:37 | 9:09 | 15:55 | 33:02 | 1:12:54 | 2:32:35 |
| 70 | 4:00 | 4:19 | 8:35 | 14:56 | 31:01 | 1:08:23 | 2:23:13 |
| 75 | 3:46 | 4:04 | 8:04 | 14:04 | 29:15 | 1:04:26 | 2:14:59 |
| 80 | 3:34 | 3:51 | 7:37 | 13:18 | 27:42 | 1:00:57 | 2:07:43 |
| 85 | 2:29 | 2:40 | 5:03 | 10:47 | 22:10 | 48:48 | 1:43:00 |

---

## Appendix G: Stride OS Data Model Specification

### G.1 Athlete Profile Schema (Database Fields)

```json
{
  "athlete_id": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  
  "demographics": {
    "name": "string",
    "date_of_birth": "date",
    "biological_sex": "enum(male, female)",
    "height_cm": "float",
    "weight_kg": "float"
  },
  
  "training_profile": {
    "training_age_years": "float",
    "current_weekly_volume_km": "float",
    "max_weekly_volume_km": "float",
    "primary_event": "enum(100m, 200m, 400m, 800m, 1500m, mile, 3000m, 5000m, 10000m, half_marathon, marathon, ultra)",
    "training_philosophy": "enum(lydiard, daniels, canova, pfitzinger, hanson, maffetone, polarized, custom)",
    "development_stage": "enum(beginner, youth, high_school, college, post_collegiate, elite)"
  },
  
  "physiological_markers": {
    "vdot": "float",
    "vo2max_estimated": "float",
    "lactate_threshold_pace_sec_per_km": "float",
    "lactate_threshold_hr": "int",
    "max_heart_rate": "int",
    "resting_heart_rate": "int",
    "maf_hr": "int",
    "critical_speed_m_per_s": "float",
    "anaerobic_distance_capacity_m": "float"
  },
  
  "neuromuscular_profile": {
    "max_sprint_speed_m_per_s": "float",
    "max_aerobic_speed_m_per_s": "float",
    "anaerobic_speed_reserve": "float",
    "speed_reserve_ratio": "float",
    "athlete_type": "enum(speed_dominant, balanced, endurance_dominant)"
  },
  
  "genetic_profile": {
    "actn3_genotype": "enum(RR, RX, XX, unknown)",
    "ace_genotype": "enum(II, ID, DD, unknown)"
  },
  
  "biomarkers": {
    "last_ferritin_ng_ml": "float",
    "last_crp_mg_l": "float",
    "last_vitamin_d_ng_ml": "float",
    "last_hemoglobin_g_dl": "float",
    "biomarker_test_date": "date"
  },
  
  "injury_history": {
    "current_injuries": ["string"],
    "past_injuries": [
      {
        "type": "string",
        "date": "date",
        "recovery_weeks": "int"
      }
    ],
    "gct_imbalance_percent": "float"
  },
  
  "race_history": [
    {
      "date": "date",
      "distance_m": "float",
      "time_seconds": "float",
      "conditions": {
        "temperature_f": "float",
        "humidity_percent": "float",
        "altitude_ft": "float",
        "course_type": "enum(track, road_flat, road_hilly, trail)"
      },
      "calculated_vdot": "float",
      "age_graded_percent": "float"
    }
  ]
}
```

### G.2 Daily Training Log Schema

```json
{
  "log_id": "uuid",
  "athlete_id": "uuid",
  "date": "date",
  
  "session": {
    "type": "enum(easy, long_run, tempo, threshold, interval, repetition, fartlek, race, recovery, cross_train)",
    "duration_seconds": "int",
    "distance_m": "float",
    "average_pace_sec_per_km": "float",
    "normalized_graded_pace_sec_per_km": "float",
    "average_hr": "int",
    "max_hr": "int",
    "elevation_gain_m": "float",
    "cadence_avg": "int",
    "ground_contact_time_ms": "int",
    "vertical_oscillation_cm": "float",
    "power_watts": "float"
  },
  
  "calculated_metrics": {
    "intensity_factor": "float",
    "rtss": "float",
    "trimp": "float",
    "time_in_zone": {
      "z1_seconds": "int",
      "z2_seconds": "int",
      "z3_seconds": "int",
      "z4_seconds": "int",
      "z5_seconds": "int"
    }
  },
  
  "readiness": {
    "sleep_hours": "float",
    "sleep_quality": "enum(poor, fair, good, excellent)",
    "resting_hr_morning": "int",
    "hrv_ms": "float",
    "rpe_session": "int",
    "muscle_soreness": "enum(none, mild, moderate, severe)",
    "energy_level": "enum(low, moderate, high)"
  },
  
  "rolling_metrics": {
    "acute_load_7d": "float",
    "chronic_load_28d": "float",
    "acwr": "float",
    "acwr_ewma": "float",
    "weekly_volume_km": "float",
    "monotony": "float",
    "strain": "float"
  }
}
```

---

## Appendix H: Key Formulas Quick Reference (For Development Team)

### H.1 Race Prediction

```python
# Riegel Formula
def riegel_predict(known_time_sec, known_dist_m, target_dist_m, exponent=1.06):
    return known_time_sec * (target_dist_m / known_dist_m) ** exponent

# Cameron Formula
def cameron_predict(known_time_sec, known_dist_m, target_dist_m):
    a = 13.49681 - (0.000030363 * known_dist_m) + (835.7114 / (known_dist_m ** 0.7905))
    b = 13.49681 - (0.000030363 * target_dist_m) + (835.7114 / (target_dist_m ** 0.7905))
    return (known_time_sec / known_dist_m) * (a / b) * target_dist_m

# VDOT Calculation (Daniels-Gilbert)
import math

def calculate_vdot(distance_m, time_min):
    velocity = distance_m / time_min  # meters per minute
    
    # Oxygen cost at velocity
    vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity ** 2
    
    # Percent of VO2max sustainable for duration
    percent_max = (0.8 + 0.1894393 * math.exp(-0.012778 * time_min) 
                   + 0.2989558 * math.exp(-0.1932605 * time_min))
    
    vdot = vo2 / percent_max
    return vdot
```

### H.2 Heart Rate Zones

```python
# Karvonen Method
def karvonen_target_hr(hr_max, hr_rest, intensity_pct):
    hr_reserve = hr_max - hr_rest
    return hr_rest + (intensity_pct * hr_reserve)

# Tanaka HRmax
def tanaka_hrmax(age):
    return 208 - (0.7 * age)

# MAF 180 Formula
def maf_hr(age, category='c'):
    base = 180 - age
    adjustments = {'a': -10, 'b': -5, 'c': 0, 'd': 5}
    return base + adjustments.get(category, 0)
```

### H.3 Training Load

```python
# rTSS Calculation
def calculate_rtss(duration_sec, ngp_sec_per_km, ftp_sec_per_km):
    intensity_factor = ftp_sec_per_km / ngp_sec_per_km  # Inverted because lower pace = faster
    rtss = (duration_sec * intensity_factor ** 2) / 3600 * 100
    return rtss

# ACWR (EWMA Model)
def ewma_acwr(daily_loads, acute_days=7, chronic_days=28):
    lambda_acute = 2 / (acute_days + 1)
    lambda_chronic = 2 / (chronic_days + 1)
    
    ewma_acute = daily_loads[0]
    ewma_chronic = daily_loads[0]
    
    for load in daily_loads[1:]:
        ewma_acute = load * lambda_acute + (1 - lambda_acute) * ewma_acute
        ewma_chronic = load * lambda_chronic + (1 - lambda_chronic) * ewma_chronic
    
    if ewma_chronic == 0:
        return 0
    return ewma_acute / ewma_chronic

# VO2max from Cooper Test
def cooper_vo2max_meters(distance_m):
    return (distance_m - 504.9) / 44.73

# VO2max from 1.5 Mile Run
def vo2max_1_5_mile(time_minutes):
    return (483 / time_minutes) + 3.5
```

### H.4 Environmental Adjustments

```python
# Altitude correction used in the current app.
def altitude_slowdown(altitude_ft):
    if altitude_ft is None or altitude_ft < 1500:
        return 0.0
    meters = altitude_ft * 0.3048
    if meters < 500:
        return 0.0
    if meters < 1000:
        return 0.01
    if meters < 1500:
        return 0.018
    if meters < 2000:
        return 0.028
    if meters < 2500:
        return 0.04
    if meters < 3000:
        return 0.055
    return 0.07

# Temperature slowdown used in the current app.
def heat_slowdown(temp_f):
    if temp_f is None or temp_f <= 50:
        return 0.0
    if temp_f <= 55:
        return 0.005
    if temp_f <= 60:
        return 0.01
    if temp_f <= 65:
        return 0.02
    if temp_f <= 70:
        return 0.03
    if temp_f <= 75:
        return 0.045
    if temp_f <= 80:
        return 0.06
    if temp_f <= 85:
        return 0.08
    if temp_f <= 90:
        return 0.10
    return 0.13

# Age Grading
def age_graded_percent(actual_time_sec, age_standard_sec):
    return (age_standard_sec / actual_time_sec) * 100
```

### H.5 Anaerobic Speed Reserve

```python
# ASR Calculation
def anaerobic_speed_reserve(mss_m_per_s, mas_m_per_s):
    return mss_m_per_s - mas_m_per_s

# Speed Reserve Ratio
def speed_reserve_ratio(mss_m_per_s, mas_m_per_s):
    return mss_m_per_s / mas_m_per_s

# Interval Target Speed (ASR-based)
def interval_target_speed(mas_m_per_s, asr_m_per_s, asr_percentage):
    return mas_m_per_s + (asr_percentage * asr_m_per_s)

# Athlete Type Classification
def classify_athlete_type(srr):
    if srr > 1.6:
        return "speed_dominant"
    elif srr < 1.3:
        return "endurance_dominant"
    else:
        return "balanced"
```

---

*End of Appendix*
