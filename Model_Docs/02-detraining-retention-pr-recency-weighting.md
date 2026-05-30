# STRIDE OS research notes: detraining, retention, and PR recency weighting

## What the literature says

### Aerobic fitness / VO2max / mitochondrial adaptations
- Long-term detraining review (Mujika & Padilla, 2000; PMID 10999420): VO2max declines markedly during >4 weeks detraining; recently acquired VO2max gains can be completely lost. Mechanisms include reduced blood volume, cardiac dimensions, ventilatory efficiency, stroke volume, cardiac output, capillarization, a-vO2 diff, and oxidative enzyme activity. Lactate threshold drops, but in highly trained athletes it often remains above untrained values. Force declines more slowly and usually stays above control values for long periods.
- Masters review (Lepers et al., 2022; PMID 36078762): VO2max can decline almost linearly after cessation, by as much as ~20% after 12 weeks. Mitochondrial markers such as citrate synthase and succinate dehydrogenase fall substantially with cessation, but can often be largely rescued in similar time periods after training resumes.
- LT-intensity training cessation study (PMID 21681480): after 12 weeks detraining, VO2max and LT-related variables regressed, but capillaries around type I fibers and some oxidative-phosphorylation-related transcripts remained elevated; suggests partial muscular memory even when systemic fitness drops.
- Old HIIT/detraining study (PMID 3653091): 7 weeks detraining reduced maximal aerobic power and 90s performance; oxidative enzymes declined while glycolytic enzymes were preserved better.

### Running economy / threshold / performance
- 12-week detraining-retraining case study in a master triathlete (PMID 39651431): VO2max dropped ~9-11%, maximal aerobic velocity ~8.6%, peak power ~12.7%, cycling efficiency ~6.2%, and running economy worsened ~22% after 12 weeks detraining. After 12 weeks retraining, VO2max mostly returned, but running economy and lean mass did not fully recover.
- Practical implication: aerobic ceiling can come back relatively quickly, but economy/durability/mechanics can lag behind. Old PR should not be read as immediate race readiness after layoff/injury.

### Sprint / neuromuscular / speed reserve
- Long-term detraining review (PMID 10999420): force production generally declines slower than aerobic qualities and often remains above controls for long periods.
- Short sprint training + 7-week detraining study (PMID 9202944): 9 weeks sprint training increased maximal power output by 28% and peak force by 16%; those changes were maintained after 7 weeks detraining.
- Adolescent girls sprint study (PMID 16477445): 6 months sprint training improved performance; after 5 months detraining, adrenergic adaptations disappeared but the performance gain was maintained.
- Soccer 2-week break study (PMID 30110374): repeated sprint ability worsened after only 2 weeks detraining, but intermittent endurance (Yo-Yo IR1) did not significantly change.
- Royal Society masters records analysis (web result summary): contrary to common belief, endurance-event performance can decline with age more than sprint performance in master world-record data; however sprint still depends heavily on type II function and injury exposure.

### Age / progression / decline
- Adolescent track-and-field study (PLOS One, 2015): boys and girls perform similarly until ~12 y; beyond that, males pull away. Female annual relative improvement declines gradually across adolescence. In males, annual improvement accelerates to ~13 y for running and ~14 y for jumping, then slows toward 18 y. Overall 11->18 improvement is >50% larger in males and roughly twice as large in jumps vs running.
- World-class track-and-field peak-age study (PMID 29543080): peak age is usually 25-27 y, somewhat later for marathon / male throwers (~28-29 y). Sprinters show smaller 5-year pre-peak improvements than throwers and some endurance events.
- Masters endurance review (PMID 17717011): endurance performance is mostly maintained until ~35 y, then declines modestly until ~50-60 y, then more steeply. Primary driver is VO2max decline; lactate threshold contributes; exercise economy is relatively preserved in endurance-trained adults.
- Longitudinal masters data (PMID 33606016): athletes who continue competing repeatedly perform better and show slower decline than one-off cross-sectional profiles suggest.

### Injury / return-to-sport / layoff
- Detraining review (PMID 10999420) explicitly recommends maintaining intensity, only moderately reducing frequency, and allowing major volume reductions if needed; similar-mode cross-training helps preserve adaptations. Cross-education/contralateral training matters during unilateral immobilization.
- Retraining case (PMID 39651431): cardiorespiratory fitness can return within the same order of time as detraining, but economy/lean mass may lag, which matters for runners returning from injury.

## Coach-facing conclusions for STRIDE OS
1. **Do not use one universal recency curve.** Aerobic race performance, VO2max, economy, sprint ability, and speed reserve have different decay/rebound patterns.
2. **Treat old PR as two things:**
   - a partially retained *trait ceiling* (durable talent/history)
   - a weak estimate of *current state* unless supported by recent training/racing.
3. **Aerobic events:** current fitness is highly sensitive to the last 2-12 weeks. Use old bests mostly as ceiling/anchor, not as current capability.
4. **Economy/mechanics:** may persist partly, but after layoffs they can be the last thing to come back. Strong recent training should outrank old PR unless recent workout evidence says otherwise.
5. **Sprint/top speed:** neuromuscular qualities can be retained longer than VO2max, but repeated-sprint readiness can fade quickly without exposures. Preserve more lifetime-best signal for pure sprint metrics than for threshold/VO2 proxies.
6. **Youth:** old PRs go stale fastest because the athlete is changing, not just detraining. Age- and maturation-adjusted trend should dominate.
7. **Masters:** raw old PRs should be age-corrected before weighting. Consistent training history matters a lot; uninterrupted athletes decline slower than generic age curves imply.
8. **Post-injury / return:** history should retain more weight for eventual ceiling, but less for immediate prediction. In other words: keep the PR in the model, but gate it with current load, recent max-speed exposure, and tissue-specific return status.

## Practical model ideas

### 1) Separate "ceiling" from "current form"
Use:
- `current_form`: built mostly from last 30-120 days
- `historical_ceiling`: built from best marks over 2-5 years, strongly age-adjusted
- prediction = blend of current_form and historical_ceiling based on continuity/injury status

### 2) Age-adjust the old PR before weighting it
Instead of asking only "how old is the PR?", estimate what that PR means **today** given expected development/decline.
- Youth: project forward with expected improvement curves
- Open adult (18-35): small adjustment
- Masters: apply expected decline based on age band and training continuity

### 3) Suggested direct weight for a 3-year-old PR
If you want a simple coach-facing heuristic for *direct current-performance weight* of a 3-year-old PR:
- Open adult, aerobic event: **~0.15-0.25**
- Open adult, sprint event: **~0.20-0.35**
- Youth / adolescent: **~0.00-0.10**
- Masters with consistent training: **~0.10-0.25 after age correction**
- Returning from injury but with good history: **~0.20-0.35 as ceiling signal, lower as current-race predictor**

### 4) Example retention formula
Use an exponential with a non-zero floor:

`weight = floor + (1 - floor) * exp(-t / tau)`

Where `t` is years since PR.

Example parameterizations (computed):
- Open adult aerobic: `floor=0.10, tau=1.2` -> 3-year weight = **0.174**
- Open adult sprint: `floor=0.15, tau=1.8` -> 3-year weight = **0.311**
- Youth: `floor=0.02, tau=0.5` -> 3-year weight = **0.022**
- Returning aerobic athlete: `floor=0.20, tau=1.5` -> 3-year weight = **0.308**

Interpretation:
- aerobic PRs should decay faster as current-state evidence
- sprint PRs can retain more signal
- youth PRs should decay aggressively
- returning athletes can keep more historical ceiling signal, but not necessarily current-race readiness

### 5) Better formula: context-adjusted retained value
A more useful STRIDE OS formulation is:

`retained_value = age_adjust(PR) * continuity * exposure * exp(-t/tau_domain) + floor_trait`

Where:
- `age_adjust(PR)`: converts old PR to present-equivalent based on age progression/decline
- `continuity`: 0-1 score from recent months trained / uninterrupted seasons
- `exposure`: 0-1 sport-specific exposure score (e.g., recent max-speed work for sprint, threshold/volume for endurance)
- `tau_domain`: slower for sprint/top-speed traits, faster for aerobic current-form traits
- `floor_trait`: persistent talent/history component

## Recommended defaults
- **Aerobic prediction engine:** 70-85% recent evidence, 15-30% age-adjusted historical ceiling.
- **Sprint / speed reserve engine:** 55-75% recent evidence, 25-45% historical ceiling if athlete is mature and training continuity exists.
- **Injury-return mode:** reduce recent missingness penalty if athlete has strong long-term history, but cap race-readiness predictions until recent sport-specific exposures reappear.
- **Youth mode:** mostly use last 6-12 months plus maturation priors; historical best older than 18-24 months should have little direct weight.
