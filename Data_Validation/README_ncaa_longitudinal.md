# NCAA Distance Running Longitudinal Dataset
**Compiled:** May 20, 2026
**Compiler:** Manus AI

## Overview
This dataset contains longitudinal performance data for elite NCAA distance runners, tracking their season-by-season progression across their college careers. It is designed to complement the cross-sectional dataset by providing actual developmental trajectories of individual athletes from approximately ages 18 to 23.

The dataset captures season-best times across all major distance events (800m through 10,000m, plus Cross Country) for 74 distinct elite athletes (32 men, 42 women), yielding over 1,200 individual performance records.

## Files Included
1. **`ncaa_longitudinal_distance.csv`**: The master longitudinal dataset containing all 1,264 performance records.

## Data Schema (`ncaa_longitudinal_distance.csv`)
The dataset is structured in a "long" format (one row per athlete-event-season) to facilitate time-series analysis and developmental curve modeling.

| Field Name | Description |
| --- | --- |
| **`athlete_name`** | Full name of the athlete |
| **`school`** | University the athlete competed for |
| **`sex`** | Male (M) or Female (F) |
| **`graduating_class`** | The year the athlete graduated or exhausted eligibility |
| **`event`** | Track event (e.g., 1500m, 5000m) or Cross Country distance (e.g., XC 8K, XC 6K) |
| **`season_year`** | The calendar year the performance was achieved |
| **`season_best_time`** | The athlete's fastest time in that event during that specific year |
| **`age_estimate`** | Estimated age at the time of performance, calculated backward from their graduating class (assuming age 22 at graduation) |
| **`tfrrs_url`** | Direct link to the athlete's official TFRRS profile for verification |
| **`data_type`** | "longitudinal_season_best" indicating this represents peak seasonal fitness |
| **`source`** | "TFRRS" indicating the official NCAA results database |

## Dataset Statistics
The compiled dataset provides a rich view of athletic progression during the critical early-20s developmental window.

* **Total Records:** 1,264
* **Total Athletes:** 74 (32 Male, 42 Female)
* **Average Records per Athlete:** 16.9 (representing ~4 years of data across 3-5 events per year)
* **Age Range Covered:** 17 to 23 years old

The data spans all primary distance events, with the highest concentration in the core collegiate distances:
* **3000m / 5000m:** 454 records
* **1500m:** 185 records
* **Cross Country (All Distances):** 442 records
* **10,000m:** 104 records
* **800m:** 79 records

## Value for Modeling
Unlike cross-sectional data which compares different athletes at different ages, this longitudinal dataset allows for the modeling of **true developmental velocity**. 

By tracking the exact same athletes as they age from 18 to 22, models can account for individual baseline differences and isolate the pure effect of age and accumulated training. When combined with the previously collected high school and masters data, this forms the critical "bridge" connecting adolescent development to peak professional performance.
