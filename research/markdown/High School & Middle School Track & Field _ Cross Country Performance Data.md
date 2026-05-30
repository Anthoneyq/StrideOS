# High School & Middle School Track & Field / Cross Country Performance Data

## Overview

This dataset contains track & field and cross country performance data for approximately **3,245 unique athletes** across **4,823 results** from high school and middle school competitions nationwide. Data was collected from publicly available sources including state athletic association websites, timing company result pages, and publicly indexed meet results.

## Files

| File | Description | Records |
|------|-------------|---------|
| `all_athletes_combined.csv` | Master file with all results | 4,823 |
| `milesplit_hs_results.csv` | High school results only (grades 9-12) | 4,674 |
| `milesplit_ms_results.csv` | Middle school results only (grades 6-8) | 149 |
| `README.md` | This documentation file | — |
| `raw_data/` | Raw source files (HTML, CSV, PDF) | — |
| `scripts/` | Collection and parsing scripts | — |

## Data Schema

Each row in the CSV files contains the following fields:

| Field | Description | Example |
|-------|-------------|---------|
| `athlete_name` | Full name of the athlete | "Kyle Emerson" |
| `sex` | M or F | "M" |
| `grade` | Grade level (7-12, or blank if unknown) | "11" |
| `school` | School name | "Albany HS" |
| `state` | State abbreviation (or "US" for national meets) | "KY" |
| `event` | Event name (standardized) | "100m" |
| `time_mark` | Performance time | "10.77" |
| `meet_name` | Name of the competition | "KHSAA Class 1 State Track Championships 2024" |
| `meet_level` | Level of competition | "state" |
| `meet_year` | Year of the competition | "2024" |
| `meet_date` | Date of the competition | "2024-05-30" |
| `source_url` | URL where data was obtained | "https://khsaa.org/track/2024/..." |
| `source_type` | Source website/organization | "khsaa.org" |
| `school_level` | "high_school" or "middle_school" | "high_school" |

## Summary Statistics

### Unique Athletes: 3,245
- **Male athletes:** 1,762 (54.3%)
- **Female athletes:** 1,483 (45.7%)

### Events Covered (7 running events)

| Event | Results Count |
|-------|--------------|
| 100m | 948 |
| 200m | 851 |
| 400m | 759 |
| 800m | 623 |
| 1600m | 623 |
| 3200m | 621 |
| 5K (Cross Country) | 398 |

### States Covered (9 states + national)

| State | Results Count |
|-------|--------------|
| Kentucky (KY) | 1,985 |
| Missouri (MO) | 695 |
| New York (NY) | 533 |
| National (US) | 398 |
| Georgia (GA) | 378 |
| Washington (WA) | 327 |
| California (CA) | 288 |
| Oregon (OR) | 130 |
| Illinois (IL) | 89 |

### Grade Distribution

| Grade | Results Count |
|-------|--------------|
| 12 (Senior) | 1,653 |
| 11 (Junior) | 1,305 |
| 10 (Sophomore) | 895 |
| 9 (Freshman) | 441 |
| 8 | 102 |
| 7 | 47 |
| Unknown | 380 |

### Year Distribution

| Year | Results Count |
|------|--------------|
| 2022 | 506 |
| 2023 | 757 |
| 2024 | 2,578 |
| 2025 | 982 |

### Source Breakdown

| Source | Results | Description |
|--------|---------|-------------|
| khsaa.org | 1,985 | Kentucky High School Athletic Association (direct HTML results) |
| mshsaa.org | 695 | Missouri State High School Activities Association (direct HTML results) |
| leonetiming.com | 533 | Leone Timing (NY state meet timing provider, public HTML results) |
| athletic.net | 507 | Athletic.net (publicly viewable meet results pages) |
| runnerspace.com | 398 | RunnerSpace/NXN (Nike Cross Nationals public results) |
| ghsa.net | 378 | Georgia High School Association (public results archive) |
| wiaa.com | 327 | Washington Interscholastic Activities Association (public PDF results) |

## Methodology

### Data Collection Approach

1. **State Athletic Association Archives**: Downloaded publicly available HY-TEK Meet Manager HTML result files directly from state association websites (KHSAA, MSHSAA). These are official results posted for public access.

2. **Timing Company Results**: Accessed publicly posted results from Leone Timing (leonetiming.com), which provides timing services for NYSPHSAA state championships and posts compiled HTML results publicly.

3. **Athletic.net Public Pages**: Accessed publicly viewable meet result pages on Athletic.net for Oregon, California, and Illinois state championships. These pages are publicly accessible without login.

4. **National Championship Results**: Collected Nike Cross Nationals (NXN) results from RunnerSpace.com, which publishes full results publicly.

5. **State Association Websites**: Accessed GHSA (Georgia) and WIAA (Washington) public results archives.

### Compliance Notes

- **No direct scraping of MileSplit**: Data was NOT scraped from milesplit.com. Only publicly available sources were used.
- **Public data only**: All data was obtained from publicly accessible web pages that do not require login or subscription.
- **State association data**: KHSAA and MSHSAA publish their results as public HTML files specifically for public access.
- **Timing company data**: Leone Timing publishes compiled results as public HTML pages.
- **No terms of service violations**: All data was accessed through normal HTTP requests to publicly posted result pages.

### Data Quality

- All times were validated against reasonable ranges for each event
- Duplicate entries (same athlete, event, time, meet) were removed
- Event names were standardized to a consistent format
- Grade levels were normalized
- Non-running events (hurdles, field events, relays) were excluded

### Limitations

- **Gender imbalance**: Slightly more male athletes (54.3%) than female (45.7%) due to data availability
- **State concentration**: Kentucky is overrepresented due to the availability of 3 years of complete results in easily-parseable format
- **Grade data**: ~8% of records have unknown grade levels (primarily from NXN cross country results)
- **Middle school data**: Only 149 middle school results were found, primarily from Georgia state meets
- **Event coverage**: Only running events (sprints, middle distance, distance, XC) are included; field events and relays were excluded per the project scope
- **Some states missing**: Texas, Florida, Pennsylvania, and other major states could not be included because their results are behind paywalls (MileSplit) or in formats that could not be reliably parsed

## How to Use

```python
import pandas as pd

# Load all data
df = pd.read_csv('all_athletes_combined.csv')

# Filter by event
sprinters = df[df['event'] == '100m']

# Filter by state
california = df[df['state'] == 'CA']

# Get unique athletes with multiple events
athlete_events = df.groupby(['athlete_name', 'school', 'state'])['event'].nunique()
multi_event = athlete_events[athlete_events > 1]
```

## License & Attribution

This data was collected from publicly available sources for research and analysis purposes. Please cite the original sources when using this data. All data is publicly posted by the respective state athletic associations and timing companies for public access.
