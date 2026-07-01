# StrideOS — How To Be Superior (2026-07-01)

Multi-agent competitive study: **25 tools** across 4 clusters (VDOT/calculators,
coach platforms, HS data ecosystem, consumer AI coaching), positioning grounded
in the actual codebase, **32 candidate features** filtered/ranked to the roadmap
below.

## The one-sentence superiority claim
> **StrideOS is the only tool that builds each athlete's own fatigue curve from
> ALL their meet PRs** — telling a track/XC coach *which event each kid should
> actually run* and the race-specific Canova paces to get there — with live,
> coach-verifiable held-out proof it's **~35% more accurate** than the commodity
> VDOT/Riegel formula, and pulling further ahead the wider the event gap.

**The wedge:** every competitor anchors on a SINGLE input — one race (VDOT O2,
McMillan, Tinman, Riegel, Garmin), one threshold (Final Surge, TrainingPeaks,
COROS), or one VO2max (Runalyze). Only StrideOS personalizes a fatigue exponent
from an athlete's *multiple* PRs across events. No consumer app even covers
track events or gives a coach a roster.

## Where StrideOS already wins (real, shipping)
- **Multi-PR personalized fatigue curve** (`personalFatigueExponent`, backed by
  held-out backtest: median 1.2% vs Riegel 1.9%; gap widens to 0.5% vs 2.2% at
  far event gaps).
- **Track & XC event coverage + coach-owns-athletes console** — the whole
  consumer cluster is road-centric 5K–marathon with no roster.
- **Roster-level squad intelligence** (`computeSquadAnalytics`) — cross-roster
  diagnosis no one-athlete-at-a-time calculator does.
- **Cross-distance event-fit** (`buildEventFit`: "may be a miler, not a 5K").
- **Canova % of race pace** 11-zone spectrum in the free tier.
- **No hardware lock-in / no per-athlete pricing** — predicts from hand-timed
  meet PRs at one flat team price (vs $9–18/head or a $199 pod each).
- **Environmental pace adjustment** (live weather/elevation).

## Where it's behind (fix to compete)
- **Not deployed. 0 paid. 0 willingness-to-pay proof.** (Live site is a stale
  build — deploy is the gate on everything.)
- **The "team-points lineup optimizer" — the stated #1 differentiator — is
  vaporware** (marketing copy only, no code).
- **Incumbent data/distribution moat**: MileSplit + Athletic.net own US HS
  results & the daily coach workflow; TFRRS owns college. No ingestion yet.
- **Team billing unfulfillable** (matches DECISIONS D1/D2).
- **Single-PR majority case**: most HS athletes have ONE PR in ONE event, so the
  wedge engine can't fire and silently degrades to Riegel — the biggest risk.
- **Missing table-stakes**: no PDF/printable report (advertised, absent),
  no season plan/workout-builder, no meet-day seeding.
- **Minors'-PII bar** (partly closed this pass — export/delete UI now built).

## Build first (in order)
1. **Paste-a-Roster Import (Athletic.net / MileSplit / TFRRS).** Without imported
   multi-event marks the fatigue-curve wedge stays starved and activation dies on
   retyping 40 kids. *(The multi-event CSV import shipped this pass is the first
   half of this — paste-from-results-site is the next step.)*
2. **"Which Event Should You Run?" free, no-login Event-Fit calculator.** The one
   calculator no competitor ships — a screenshottable lead magnet aimed straight
   at the 0-distribution / no-brand problem.
3. **Show-the-Math Provenance Panel + Proof Ledger.** The direct answer to the
   two coaches who rejected real outputs live — trust gates everything else.

## Full roadmap

### Now (weeks)
- Paste-a-Roster Import (Athletic.net/MileSplit/TFRRS) — M
- "Which Event Should You Run?" free Event-Fit calculator — S
- Show-the-Math Provenance Panel — S
- Proof Ledger — in-app held-out accuracy dashboard on the coach's own roster — M
- Full WBGT + air-quality race-day adjustment (data already fetched) — S
- Right-Event Roster Scan (event-fit depth chart) — S

### Next (this season)
- **Meet Lineup Optimizer** (team-points, the "Monday ritual") — L · *the reason
  team pricing can exist; today vaporware.*
- Fix team-tier billing + Program seat-invite (.edu land-and-expand) — L
- Calibration Flywheel + coach-verified outcome ledger — M
- Training-load-aware forecast (Strava ACWR) — L
- Race-Ready shareable card (public /r/ link + branded OG image) — M
- Pace-Pack practice sheet + meet-prep roster sheet (PDF/CSV + QR) — M
- Season PR arc + season goal ladder — M

### Later (moat)
- **k-Atlas** — single-PR fatigue-curve priors from an anonymized corpus (fixes
  the single-PR majority risk; compounding network effect) — L
- Champion/Challenger engine gate + public accuracy changelog — M
- XC course-adjusted prediction (flat-equivalent normalization) — L
- Event-fit realized-gain ledger — M
- Athlete + parent portal (consent-gated, read-only) — L
- Coach-to-coach referral loop + clinic demo mode — M

---
*Source: `strideos-superiority` workflow (11 agents, 25 tools, 32 features).
Positioning cites live code; treat effort tags as rough.*
