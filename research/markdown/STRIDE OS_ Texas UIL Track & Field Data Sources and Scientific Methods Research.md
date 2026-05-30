# STRIDE OS: Texas UIL Track & Field Data Sources and Scientific Methods Research

## 1. Executive Summary

STRIDE OS requires high-integrity, legally usable data on Texas high school athletes who compete in multiple events to power its decision-support tools for coaches. This research investigated the availability, structure, and legal access pathways for Texas University Interscholastic League (UIL) track and cross country data. The findings indicate that while robust performance data exists across several platforms, commercial use and automated data collection (scraping) are strictly prohibited by the major data aggregators (MileSplit, Athletic.net, and MaxPreps) [1] [2] [3]. 

However, UIL athletic results are public records [4], and pathways exist to acquire this data legally through official public information requests, platform partnerships, or coach-mediated exports. Scientifically, middle-distance runners can be effectively profiled along a speed-endurance continuum using the Anaerobic Speed Reserve (ASR) framework and speed preservation calculations [5] [6], which will allow STRIDE OS to accurately forecast performances and recommend optimal event fits.

## 2. Best Data Sources Ranked

The following data sources are ranked based on data depth, legal accessibility, and relevance to STRIDE OS objectives:

| Rank | Data Source | Access Classification | Description |
| :--- | :--- | :--- | :--- |
| 1 | **UIL Official Results / TPIA Request** | Public and usable | Requesting historical results directly from the UIL via the Texas Public Information Act provides the most legally sound foundation for a proprietary database. |
| 2 | **Coach-Mediated Exports (Hy-Tek/MeetPro)** | Coach/athlete-consent only | Allowing coaches to upload their own team's historical data from standard meet management software exports ensures consent and high data quality. |
| 3 | **Athletic.net (Deker Net LLC)** | Requires paid license | Athletic.net possesses the most comprehensive multi-season database and explicitly states they sell/license aggregated data to third parties. |
| 4 | **MileSplit (FloSports)** | Requires paid license | Holds extensive Texas UIL data but has strict commercial use prohibitions; would require a formal API/licensing partnership. |
| 5 | **Karmarush (uil.tfresult.com)** | Public but needs attribution | The platform powering UIL's live results; data is well-structured but likely governed by UIL contracts. |
| 6 | **MaxPreps (2080 Media)** | Requires paid license | The official UIL partner for results, but explicitly prohibits scraping and commercial use without an agreement. |

## 3. UIL Data Availability

The University Interscholastic League (UIL) is a government entity operating under the University of Texas at Austin [7]. 

**Data Structure and Depth:**
The UIL maintains historical archives of State Track & Field and Cross Country results. Current state meet results are powered by Karmarush (uil.tfresult.com), which provides highly structured data including the athlete's name, school, grade level, event, result, and placement [8]. The inclusion of the grade level (e.g., [09] for freshman) is a critical data point that enables the tracking of individual athlete progression across multiple years without relying on persistent unique identifiers.

**Limitations:**
While state meet data is readily available, district, area, and regional results are often decentralized and managed by individual host schools or regional directors, making comprehensive statewide aggregation challenging without a centralized partner.

## 4. MileSplit Data Availability

MileSplit, acquired by FloSports, is the premier network for high school track and field data [9].

**Data Structure and Depth:**
MileSplit offers extensive athlete profiles that link cross country and track performances across a student's entire high school career. The platform features meet histories, personal bests, season bests, and statewide rankings. It processes results submitted in standard formats like Hy-Tek and RaceTab.

**Terms and Restrictions:**
The FloSports Terms of Service strictly govern MileSplit data. Automated data collection, scraping, and commercial exploitation of the platform's content are explicitly prohibited [1]. Accessing the full depth of data requires a paid "PRO" subscription, and utilizing this data to build a competing or commercial product without a formal partnership violates their terms.

## 5. Athletic.net Data Availability

Athletic.net, operated by Deker Net LLC, provides comprehensive meet management and results tracking [10].

**Data Structure and Depth:**
Similar to MileSplit, Athletic.net maintains robust athlete profiles with career histories across multiple seasons, linking cross country and track results. It clearly displays multi-event participation, making it an ideal dataset for analyzing event combinations and progression.

**Terms and Restrictions:**
Athletic.net's Terms of Service explicitly prohibit "copying, framing, scraping or mirroring any part of the Services" and using automated systems to access the platform [2]. However, their Privacy Policy notes that they may "aggregate the information you and others make available... and use, sell, license, and share this information with third parties for research, business or other purposes" [3]. This indicates a willingness to license aggregated data.

## 6. Legal and Terms Concerns

When building a commercial database of high school athlete performances, several legal frameworks apply:

**FERPA (Family Educational Rights and Privacy Act):**
Under FERPA, student academic records are confidential. However, athletic participation and results (including weight and height of team members) are generally classified as "directory information," which can be disclosed without consent unless a parent explicitly opts out [11]. Furthermore, race results published at public events (like UIL meets) are considered public records, as the act of competing creates a public record of participation [4].

**COPPA (Children's Online Privacy Protection Act):**
COPPA applies to commercial operators collecting personal information directly from children under 13 [12]. Most high school athletes are 14-18, falling outside COPPA's primary jurisdiction. However, some freshmen may be 13. Because STRIDE OS intends to analyze publicly published results rather than collect data directly from children, COPPA compliance primarily concerns the platform's user registration process (if athletes interact with the app directly).

**Platform Terms of Service:**
The most significant legal barrier is not federal privacy law, but the Terms of Service of data aggregators (MileSplit, Athletic.net, MaxPreps). All explicitly prohibit scraping and commercial use of their databases [1] [2] [13]. Extracting data from these sites to build STRIDE OS without permission constitutes a breach of contract and intellectual property infringement.

## 7. Recommended Legal Data Collection Strategy

To build the STRIDE OS database legally and ethically, the following multi-pronged strategy is recommended:

1. **Texas Public Information Act (TPIA) Requests:** Submit formal TPIA requests to the UIL for all historical district, regional, and state track and cross country results in digital formats (CSV/Excel). As a government entity, the UIL is obligated to provide public records [14].
2. **Coach-Mediated Data Ingestion:** Build an import tool within STRIDE OS that allows coaches to upload their team's historical results directly from their meet management software (e.g., Hy-Tek, MeetPro, DirectAthletics exports). This ensures data quality and relies on the coach's authority to manage their team's data.
3. **Aggregated Data Licensing:** Approach Deker Net LLC (Athletic.net) to negotiate a paid license for aggregated, anonymized performance data specifically for research and algorithm training purposes, leveraging the provision in their privacy policy that allows for data sales.

## 8. Data Schema Proposal

To effectively analyze multi-event athletes and progression, the database schema should focus on linking performances to a unique athlete entity across seasons.

**Athlete Entity:**
- `athlete_id` (UUID)
- `first_name` (String)
- `last_name` (String)
- `gender` (Enum: M/F)
- `graduation_year` (Integer - derived from grade level at time of performance)
- `school_id` (Foreign Key)

**Performance Entity:**
- `performance_id` (UUID)
- `athlete_id` (Foreign Key)
- `meet_id` (Foreign Key)
- `event_type` (Enum: 800m, 1600m, 3200m, 5K XC, etc.)
- `result_time_ms` (Integer - standardized to milliseconds for calculation)
- `date` (Date)
- `grade_level` (Integer: 9, 10, 11, 12)
- `season_type` (Enum: Indoor, Outdoor, XC)
- `conditions` (JSON - optional weather/elevation data)

## 9. Research Questions STRIDE Can Answer With This Data

With a robust dataset of multi-event performances, STRIDE OS can utilize established scientific frameworks to answer critical coaching questions:

**Event Fit and Athlete Profiling:**
By applying the Anaerobic Speed Reserve (ASR) framework [5] and speed preservation calculations [6], STRIDE OS can classify middle-distance runners along a speed-endurance continuum. For example, comparing an athlete's 400m and 800m times against their 1600m times allows the system to determine if they are a "speed-biased" 800m specialist or an "endurance-biased" 1500m/5000m type.

**Performance Translation:**
Using extended versions of Peter Riegel's race time prediction formula and modern machine learning models, STRIDE OS can answer how a performance in the 1600m translates to a predicted 5K cross country time, adjusting the decay factor based on the athlete's specific speed-endurance profile.

**Progression Analysis:**
By tracking athletes by graduation year, STRIDE OS can establish baseline progression curves for Texas high school athletes, answering questions about typical year-over-year improvement rates for different event groups.

## 10. Research Questions STRIDE Cannot Answer Yet

Certain insights will remain inaccessible until the dataset matures or incorporates external variables:

- **Training Load Impact:** Without integration with GPS watches or training logs (e.g., Strava, Garmin Connect), STRIDE OS cannot correlate specific training volumes or intensity distributions with race outcomes.
- **Biological Maturation:** The data does not account for the biological age or maturation status of the athletes, which significantly impacts performance progression in high school students.
- **Injury Correlation:** Meet results do not indicate why an athlete's performance declined or why they missed a season, preventing analysis of injury rates or overtraining syndrome.

## 11. Short-Term Action Plan

1. **Draft and Submit TPIA Request:** Prepare a formal Texas Public Information Act request directed to the UIL Vice President and Chief Financial Officer, seeking historical track and cross country results in structured data formats.
2. **Develop Coach Import Tools:** Prioritize the development of data ingestion pipelines within STRIDE OS that can parse standard Hy-Tek and MeetPro CSV exports, allowing early-adopter coaches to populate the database with their own team histories.
3. **Implement Profiling Algorithms:** Build the analytical engine using the Anaerobic Speed Reserve and speed preservation formulas to begin classifying athletes based on the initial imported data.

## 12. Long-Term Action Plan

1. **Pursue Data Licensing Partnerships:** Initiate discussions with Athletic.net or FloSports regarding formal API access or aggregated data licensing agreements to expand the platform's predictive capabilities statewide.
2. **Integrate Environmental Data:** Enhance the database by cross-referencing meet dates and locations with historical weather and elevation data to normalize race performances and improve forecast accuracy.
3. **Machine Learning Refinement:** Transition from static formulas (like Riegel's) to dynamic machine learning models that continuously refine race forecasts by comparing past predictions against actual future performances within the STRIDE OS ecosystem.

## 13. References

[1] FloSports Terms of Service. https://www.flosports.tv/terms-of-service/
[2] Athletic.net Terms of Service. https://www.athletic.net/terms/
[3] Athletic.net Privacy Policy. https://www.athletic.net/Privacy.aspx
[4] Student Press Law Center: A Sports Reporter's Guide to FERPA & Public Records. https://splc.org/a-sports-reporters-guide-to-ferpa-public-records/
[5] Sandford, G. N., et al. (2019). Anaerobic Speed Reserve: A Key Component of Elite Male 800-m Running. International Journal of Sports Physiology and Performance.
[6] Magness, S. (2014). Classifying Runners- Fun with numbers. The Science of Running. https://www.scienceofrunning.com/2014/06/classifying-runners-fun-with-numbers.html
[7] University Interscholastic League. https://www.uiltexas.org/
[8] UIL Championships Results (Karmarush). https://uil.tfresult.com/
[9] MileSplit United States. https://www.milesplit.com/
[10] Athletic.net. https://www.athletic.net/
[11] U.S. Department of Education: FERPA Protecting Student Privacy. https://studentprivacy.ed.gov/ferpa
[12] Federal Trade Commission: Complying with COPPA. https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
[13] MaxPreps Terms of Use. https://www.maxpreps.com/terms-of-use/
[14] Texas Attorney General: How to Request Public Information. https://www.texasattorneygeneral.gov/open-government/members-public/how-request-public-information
