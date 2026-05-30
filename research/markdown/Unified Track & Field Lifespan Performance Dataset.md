# Unified Track & Field Lifespan Performance Dataset
**Compiled:** May 21, 2026
**Compiler:** Manus AI

## Overview
This repository contains a comprehensive, multi-level dataset of track and field performance data, designed to model athletic progression from adolescence through peak professional years and into the masters age groups. 

The dataset captures **2,108 individual performance records** from **437 unique athletes**, spanning ages 14 to 97. It successfully bridges the gap between high school (UIL/State) data and masters data by providing dense coverage of the critical college and early professional developmental windows.

## The Master Dataset
The core deliverable is **`master_longitudinal_dataset.csv`**, which unifies all collected data streams into a single, standardized schema.

### Data Streams Included:
1. **High School to College Pipeline (164 records):** Year-by-year progressions of 12 known elite athletes from their freshman year of high school (age ~14) through their senior year of college (age ~22).
2. **College Longitudinal Data (1,264 records):** 4-year seasonal progressions for 74 elite NCAA distance runners (ages 18-23) across 800m, 1500m, 5000m, 10000m, and Cross Country.
3. **Elite/Professional Career Arcs (162 records):** Year-by-year career progressions for 13 of the greatest distance runners in history (e.g., Eliud Kipchoge, Jakob Ingebrigtsen, Faith Kipyegon) spanning ages 16 to 40.
4. **NCAA Cross-Sectional Data (284 records):** A snapshot of top performers at the 2024 NCAA Track & Field and Cross Country Championships.
5. **Masters Athletics Data (234 records):** Cross-sectional data from the 2024 World Masters Athletics Championships and USATF Masters Championships, covering 5-year age groups from 35 to 95+.

### Unified Schema:
| Field | Description |
| --- | --- |
| **`athlete_name`** | Full name of the athlete |
| **`sex`** | Male (M) or Female (F) |
| **`age`** | Exact or estimated age at the time of the performance |
| **`age_group`** | Categorical age bucket (e.g., "High School (14-18)", "Masters M45") |
| **`event`** | Standardized event name (e.g., "1500m", "5000m", "XC 8K", "Marathon") |
| **`time_mark`** | The performance mark (MM:SS.ms format for distance events) |
| **`year`** | The calendar year the performance was achieved |
| **`level`** | The competition level (High School, NCAA DI, Elite/Professional, Masters) |
| **`data_type`** | "longitudinal_season_best", "cross_sectional", "longitudinal_pipeline", or "longitudinal_career_arc" |
| **`school_team_country`** | Affiliation of the athlete at the time |
| **`meet_name`** | Name of the competition (if available) |
| **`source`** | Source of the data (TFRRS, World Athletics, Wikipedia, Athletic.net, etc.) |
| **`notes`** | Additional context (e.g., graduation year, placement, primary events) |

## Dataset Statistics

* **Total Records:** 2,108
* **Total Athletes:** 437
* **Gender Split:** 1,090 Male / 1,018 Female
* **Age Range:** 14 to 97 years old
* **Records with Age Data:** 1,824 (86.5% of total)

### Top Events by Volume:
1. **5000m:** 379 records
2. **1500m:** 300 records
3. **3000m:** 251 records
4. **XC 6K:** 198 records
5. **10000m:** 182 records
6. **XC 10K:** 148 records
7. **800m:** 138 records

## Value for Predictive Modeling
This dataset is specifically structured to support the creation of **developmental trajectories, age-adjusted prediction curves, and progression velocity models**. 

By combining cross-sectional breadth (Masters and NCAA Championships) with longitudinal depth (the same athletes tracked year-over-year from HS through their Pro careers), models trained on this data can account for both population-level aging curves and individual-level developmental baselines.
