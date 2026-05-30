---
title: 18 StrideOS — INDEX
type: index
domain: strideos
project: null
source: human
created: 2026-05-26
updated: 2026-05-26
status: active
confidence: high
tags:
  - index
  - domain/strideos
related:
  - 02_Projects/StrideOS/working_context
  - 17_Coach_Lab/INDEX
---

# 18 StrideOS

## Purpose
The StrideOS running-system knowledge domain — predictive models, pace calculators, race standards, athlete assessments, sprint/XC systems, validation formulas, UI design, Lindsey's programming, parent communication. Distinct from `02_Projects/StrideOS/working_context.md`, which holds *current* project state.

## What Belongs Here
- **Predictive model** — assumptions, formulas, calibration data, derivations.
- **Pace calculator** — UX + math.
- **Athlete assessments** — protocols, scoring, normative data.
- **Race standards** — qualifying times, age-group norms, benchmarks.
- **Sprint models** — short-distance specific.
- **Cross country** — XC-specific.
- **Track & field** — broader T&F context.
- **UI design** — StrideOS-specific UI.
- **Formulas** — the math sheet.
- **Data validation** — rules for what inputs are valid, edge cases.
- **Lindsey programming** — training plans / programming sourced from Lindsey.
- **Parent communication** — copy, scripts, templates for parent-facing comms.

## What Does Not Belong Here
- App platform layer → `17_Coach_Lab/`.
- Coaching business strategy → `03_Coaching_Business/`.
- Private athlete data → `07_Client_Systems/`.

## Key Subfolders
- `Predictive_Model/`
- `Pace_Calculator/`
- `Athlete_Assessments/`
- `Race_Standards/`
- `Sprint_Models/`
- `Cross_Country/`
- `Track_And_Field/`
- `UI_Design/`
- `Formulas/`
- `Data_Validation/`
- `Lindsey_Programming/`
- `Parent_Communication/`

## Active Notes
- (none yet)

## Related Projects
- [[02_Projects/StrideOS/working_context]]

## Related Maps
- [[Map_Of_Maps]]
- [[Master_Project_Map]]

## Open Questions
- Long-term: merge with `02_Projects/StrideOS/` (one home for both project state + knowledge) or keep the split? See [[AnthoneyOS_v1_1_Migration_Proposal]].
- Where do calibration data sets live — here, or in `15_Source_Library/Studies/`?

## Maintenance Rules
- Formulas always carry a confidence marker.
- Athlete-data examples are de-identified.
- Lindsey's programming gets attributed; her contributions are flagged.
