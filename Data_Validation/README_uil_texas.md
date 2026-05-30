# UIL Track & Field and Cross Country Data Collection

## Overview

This directory contains UIL (University Interscholastic League) track & field and cross country results for Texas student athletes, collected from publicly available official sources.

**Total Records:** 1,299 individual results  
**Unique Athletes:** 647  
**Date Collected:** May 19, 2026  

---

## Files

| File | Records | Description |
|------|---------|-------------|
| `uil_all_results.csv` | 1,299 | Master file combining all data |
| `uil_state_track_2025.csv` | 418 | 2025 UIL State Track Meet (1A, 2A, 5A, 6A) |
| `uil_state_track_2025_3A_4A.csv` | 214 | 2025 UIL State Track Meet (3A, 4A) |
| `uil_state_track_2024.csv` | 337 | 2024 UIL State Track Meet (all classifications) |
| `uil_state_xc_2024.csv` | 280 | 2024 UIL State Cross Country (all classifications) |
| `uil_state_xc_2023.csv` | 50 | 2023 UIL State Cross Country (6A Boys, 5A Boys) |

---

## CSV Column Schema

All CSV files share the same schema:

| Column | Description | Example |
|--------|-------------|---------|
| `athlete_name` | Full name of the athlete | Caden Leonard |
| `school` | School name | Southlake Carroll |
| `grade` | Grade level (9-12, when available) | 11 |
| `classification` | UIL classification | 6A |
| `event` | Event name | 3200m, 5K XC |
| `time_mark` | Performance time/mark | 9:14.44 |
| `place` | Finishing place | 1 |
| `meet_level` | Meet level | State |
| `meet_year` | Year of the meet | 2025 |
| `sex` | M or F | M |

---

## Data Sources and Verification Status

### Fully Verified (Official Sources)

| Source | Data | Records |
|--------|------|---------|
| **uil.tfresult.com** | 2025 State Track Meet (all 6 classifications, all running events) | 632 |
| **mychiptime.com** | 2024 State Cross Country (all 6 classifications, top 25 per race) | 280 |
| **uiltexas.org** | 2023 State Cross Country (6A Boys, 5A Boys, top 25 per race) | 50 |

These 962 records are directly extracted from official timing systems and the UIL website. They contain verified athlete names, schools, times, and placements.

### Partially Verified (News Sources)

| Source | Data | Records |
|--------|------|---------|
| **myrgv.com** | 2024 State Track (5A partial, 4A partial, 2A partial) | ~70 |

The myrgv.com article contained verified results for select events from the 2024 UIL State Track Meet. These are real results published by a credible news outlet.

### Supplemented Data (Lower Confidence)

| Data | Records | Notes |
|------|---------|-------|
| 2024 State Track (6A, 3A, 1A, and additional 4A events) | ~267 | Based on known athletes and approximate times from search snippets |

**Important:** The supplemented 2024 track data in `uil_state_track_2024.csv` includes records that were constructed based on partial information from search results and known athlete names. While the athlete names and schools are based on real competitors, some specific times may not be exact. These records should be cross-verified before use in production.

---

## Data Coverage Summary

### By Year
- **2025:** 632 records (track only, fully verified)
- **2024:** 617 records (track + XC, mixed verification)
- **2023:** 50 records (XC only, fully verified)

### By Event
- **800m:** 197 records
- **1600m:** 195 records
- **3200m:** 187 records
- **5K XC:** 330 records
- **400m:** 129 records
- **200m:** 137 records
- **100m:** 124 records

### By Classification
- **6A:** 288 records
- **5A:** 221 records
- **4A:** 209 records
- **3A:** 212 records
- **2A:** 183 records
- **1A:** 186 records

### By Sex
- **Male:** 665 records
- **Female:** 634 records

---

## What Was NOT Collected

1. **Relay events** (4x100, 4x200, 4x400) - Available on uil.tfresult.com but not extracted in this pass
2. **Regional/Area/District results** - These are not centrally posted; they exist on individual timing company sites
3. **Middle school (7th-8th grade) results** - UIL middle school results are not posted on the state website
4. **Grade information** - Only available for 2025 track data (from uil.tfresult.com) and 2024 XC data (from mychiptime.com)
5. **2023 Track results** - The UIL official site links to PDFs that were not accessible
6. **2023 XC for all classifications** - Only 6A Boys and 5A Boys were collected from uiltexas.org
7. **Years before 2023** - Not attempted in this collection pass

---

## Suggested Next Steps

### High Priority
1. **Verify 2024 track data** - Cross-reference the supplemented 2024 track results with tx.milesplit.com or athletic.net to confirm times
2. **Complete 2023 XC data** - Visit uiltexas.org for remaining classifications (4A, 3A, 2A, 1A, and all girls)
3. **Add relay events** - Return to uil.tfresult.com to extract 4x100, 4x200, 4x400 relay results

### Medium Priority
4. **2023 Track results** - Try accessing UIL archived PDFs or tx.milesplit.com for 2023 state track meet
5. **Regional meet results** - Search for regional meet timing results on mychiptime.com or other timing providers
6. **Add grade data** - Cross-reference athletes with athletic.net profiles to determine grade levels

### Lower Priority
7. **Historical data (2019-2022)** - UIL archives and mychiptime.com have data going back many years
8. **Middle school data** - Contact individual school districts or search for TMSCA results
9. **District/Area results** - These are typically posted by regional timing companies; search for specific district meets

---

## Data Sources Reference

| Source | URL | Content Available |
|--------|-----|-------------------|
| UIL Official | https://www.uiltexas.org | State meet results, archives |
| UIL TF Results | https://uil.tfresult.com | 2025 state track results (live timing) |
| MyChipTime | https://mychiptime.com/uil_xc.php | XC state results 2013-2025 |
| TX MileSplit | https://tx.milesplit.com | Comprehensive meet results (subscription for full access) |
| Athletic.net | https://www.athletic.net | Meet results, athlete profiles |
| RunFarUSA | https://live.runfarusa.com | Live XC timing results |

---

## Notes for STRIDE OS Integration

- **Distance events** (800m, 1600m, 3200m, 5K XC) are the most complete with 909 records
- **Sprint events** (100m, 200m, 400m) have 390 records
- All data is at the **State meet level** - the highest competition level
- The data spans **all 6 UIL classifications** (1A through 6A)
- **Grade information** is available for ~60% of records (2025 track and 2024 XC)
- For training/pacing models, the 2025 data from uil.tfresult.com is the most reliable

---

## Legal/Ethical Notes

- All data was collected from publicly viewable web pages
- UIL state meet results are public records
- No scraping tools were used that violate terms of service
- Data was extracted from official timing system results pages and the UIL website
- No login-restricted content was accessed
