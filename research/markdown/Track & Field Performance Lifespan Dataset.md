# Track & Field Performance Lifespan Dataset
**Compiled:** May 20, 2026
**Compiler:** Manus AI

## Overview
This dataset contains actual track & field and cross country results for college-level (NCAA) and masters-level athletes. It was compiled to complement high school UIL datasets, providing performance data across the full adult age range (18-22 for college, 35-95+ for masters) to enable the modeling of athletic performance curves across the lifespan.

The primary value of this dataset is the inclusion of **age data** alongside performance marks, specifically focusing on distance events (800m, 1500m/mile, 5000m, 10000m, and Cross Country/Road) as well as sprints.

## Files Included
1. **`all_results_combined.csv`**: The master dataset containing all 518 records from both college and masters sources, standardized into a single format with age estimates.
2. **`ncaa_track_results.csv`**: NCAA Division I Outdoor Track & Field Championships 2024 results (184 records).
3. **`ncaa_xc_results.csv`**: NCAA Division I Cross Country Championships 2024 results (100 records).
4. **`masters_track_results.csv`**: World Masters Athletics (WMA) Championships 2024 and USATF Masters track results (148 records).
5. **`masters_road_results.csv`**: WMA 2024 and USATF Masters road and cross country results (86 records).

## Data Schema (`all_results_combined.csv`)
The master dataset is structured with the following fields to ensure consistency across different competition levels and age groups:

| Field Name | Description |
| --- | --- |
| **`athlete_name`** | Full name of the athlete |
| **`age_estimate`** | Approximate age in years. For college athletes, estimated from class year (FR=18, SO=19, JR=20, SR=21). For masters athletes, calculated as the midpoint of their 5-year age group (e.g., M40 = 42). |
| **`age_group`** | The official age category (e.g., "M40", "W55") or college class (e.g., "College SO-2"). |
| **`school_or_country`** | University name (NCAA) or country code (Masters). |
| **`year_class`** | College class standing (FR, SO, JR, SR). Blank for masters. |
| **`division`** | NCAA Division (DI) or "Masters". |
| **`event`** | Event name (e.g., 100m, 1500m, 5K XC). |
| **`time_mark`** | Performance time or mark. |
| **`place`** | Finishing position in the meet. |
| **`meet_name`** | Name of the championship event. |
| **`meet_level`** | Competition level (National, International). |
| **`meet_year`** | Year of competition (2024). |
| **`sex`** | Male (M) or Female (F). |
| **`data_source`** | Origin of the data (TFRRS/NCAA or WMA/USATF Masters). |

## Sources & Verification
The dataset relies on authoritative sources for both collegiate and masters athletics to ensure accuracy.

For the **College Level**, data was extracted directly from the official NCAA track & field results database, TFRRS (tfrrs.org). The dataset includes top finishers from the 2024 NCAA Division I Outdoor Track & Field Championships and the 2024 NCAA Division I Cross Country Championships.

For the **Masters Level**, data was compiled from the 2024 World Masters Athletics Championships in Gothenburg, Sweden, and the 2024 USATF Masters 5K Cross Country Championships in Boulder, CO. These events represent the highest level of international and national masters competition, ensuring the performance marks reflect true elite masters capabilities.

## Dataset Statistics
The compiled dataset provides a robust foundation for modeling performance across the lifespan. It contains a total of **518** records spanning ages 18 to 97.

The data is well-balanced across demographics, with 284 records from TFRRS/NCAA and 234 from WMA/USATF Masters. The gender distribution includes 250 female and 268 male performances. The events covered span the full spectrum of track and road distances, including 100m, 200m, 400m, 800m, 1500m, 5000m, 10000m, 10K Road, Half Marathon, 5K XC, 6K XC, and 10K XC.

## Next Steps for Analysis
1. **Time Normalization:** Convert all `time_mark` strings (which range from "9.95" seconds to "1:49:03" hours) into standardized seconds or milliseconds for quantitative modeling.
2. **Performance Curve Modeling:** Plot normalized performance times against `age_estimate` for each specific event to visualize the aging curve.
3. **Data Augmentation:** The current college dataset focuses on NCAA Division I. Future iterations could expand to include NCAA Division II and III to broaden the performance distribution at the 18-22 age range.
4. **Integration with High School Data:** Combine this dataset with the existing UIL high school data (ages 14-18) to complete the lifespan curve from adolescence through late adulthood.
