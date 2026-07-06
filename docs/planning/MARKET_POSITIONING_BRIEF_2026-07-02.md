# StrideOS - Market Positioning Brief

**Date:** 2026-07-02
**Source:** Manus AI competitive research package, reviewed against current StrideOS repo state.
**Status:** Internal strategy brief. Do not paste directly into public marketing without verifying competitor claims.

## Decision

StrideOS should be positioned as **roster intelligence for track and cross country teams**, not as a generic pace calculator, AI coach, training log, or meet-management tool.

The simplest market claim:

> StrideOS turns race marks and roster data into coach decisions: training groups, event-fit, race forecasts, printable sheets, and meet-lineup guidance.

The technical model is the proof, but the buyer pain is operational: a coach has dozens of athletes, too many spreadsheets, and not enough time to convert results into decisions before practice or a meet.

## Competitive Map

### 1. Race calculators and pace systems

Examples: VDOT, McMillan, Tinman/CV tools, Riegel calculators, Garmin/COROS race predictors, Stryd.

What they do well:

- Fast individual race equivalencies and training paces.
- Strong credibility with runners and coaches.
- Low-friction free calculator experiences.

Where StrideOS can beat them:

- Multi-event athlete profiles instead of a single input.
- Coach-readable confidence and proof language.
- Track/XC-specific event coverage and roster workflow.
- Batch outputs for a whole team.

Risk:

- These products own "calculator" expectations. StrideOS must keep the free calculator fast and trustworthy while making clear that the paid product is the roster workflow, not just more numbers.

### 2. Coaching and training platforms

Examples: TrainingPeaks, Final Surge, V.O2 Coach, COROS Training Hub, Nolio.

What they do well:

- Coach-athlete workflow.
- Calendars, plan delivery, communication, device sync, and broad endurance workflows.

Where StrideOS can beat them:

- Track/XC event-fit and race-forecast intelligence from meet marks.
- Program-level roster reads instead of one athlete at a time.
- No per-athlete pricing wedge.
- School-friendly reports and privacy posture.

Risk:

- Coaches already understand training logs. StrideOS should not try to become a full daily log before it proves the intelligence layer.

### 3. Results, roster, and meet systems

Examples: Athletic.net, MileSplit, TFRRS, DirectAthletics, MeetPro, AthleticLIVE, HY-TEK-style workflows.

What they do well:

- Data gravity: official or near-official results, rosters, entries, rankings, and meet administration.
- High coach familiarity.

Where StrideOS can beat them:

- Turn existing marks into training paces, event-fit, and lineup guidance.
- Private coach workspace instead of public media/results-first posture.
- Paste/CSV import as the safe near-term bridge.

Risk:

- Direct scraping or unofficial API ingestion is legally and operationally risky. Treat direct import as later work unless there is a permissioned source or user-provided export.

### 4. AI/app-based running coaches

Examples: Runna, Coopah, Trenara, Garmin Coach/Daily Suggested Workouts, consumer AI running apps.

What they do well:

- Polished onboarding.
- Personalized individual plans.
- Device-sync and mobile UX.

Where StrideOS can beat them:

- Coach-first team context.
- Track/XC events below the road-race stack.
- Roster decisions, event-fit, and meet strategy.

Risk:

- Do not compete as a consumer AI coach. That market is crowded and pulls StrideOS away from the school/program buyer.

## Product Priorities From The Research

### Keep / emphasize now

- Free, fast calculator as the trust front door.
- Multi-event profile and personalized fatigue curve.
- Roster import via CSV/XLSX/paste.
- Sample roster and demo squad experience.
- Event-fit calculator as a lead magnet.
- Show-the-math provenance panel.
- Proof Ledger and held-out accuracy evidence.
- Printable pace cards, group sheets, and lineup sheets.
- Student-data privacy posture for schools.

### Build next

- Calibrate confidence/range language against observed error. Current ranges are planning ranges, not calibrated 95% intervals.
- Improve the current heuristic lineup tool into a true scoring/meet strategy workflow: event caps, district/region context, opponent context, relays later.
- Add everyday-HS validation data so the superiority claim is not limited to elite/sub-elite held-out pairs.
- Create school vendor packet assets: quote, invoice, W-9, privacy/security overview, and unique-value one-pager.

### Avoid for now

- Direct scraping from Athletic.net/MileSplit/TFRRS without permission or clear user-export path.
- Building a consumer athlete app.
- GPS-watch sync as the main wedge.
- Video analysis.
- Meet management/timing.
- Daily adaptive training-plan generation before roster intelligence is proven.

## Public Copy Guardrails

Use:

- "Roster intelligence"
- "Track and XC team decisions"
- "Turns race marks into training groups, event-fit, forecasts, and meet-lineup guidance"
- "Planning ranges" or "confidence-aware forecasts"
- "Supports school privacy review"
- "No ads. We do not sell athlete data."

Avoid:

- "FERPA/COPPA compliant" without legal review and district-specific agreements.
- "No competitor does this" unless manually verified close to publication.
- "Calibrated confidence intervals" until observed-error calibration is complete.
- "AI coach" as the primary category.
- "Pace calculator" as the primary category.
- Any claim that StrideOS guarantees PRs, prevents injury, replaces coach judgment, or diagnoses health.

## Launch Implication

The research does not justify adding more broad features before selling. It justifies tightening the launch around this sequence:

1. Earn trust with coach-credible outputs and clear proof.
2. Show roster intelligence immediately through demo/import.
3. Ask founding coaches to pay.
4. Let paid roster usage decide how deep the lineup/team-points workflow needs to go.

