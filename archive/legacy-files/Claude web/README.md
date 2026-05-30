# STRIDE OS

A pacing calculator and training reference tool for running coaches, built as the first module of CoachLab.

**Status:** Beta. Active development. Currently shipping to a closed group of coaches for feedback.

---

## What This Is

STRIDE OS turns a single race time into a complete coaching toolkit:
- Training paces across all intensity zones (Easy through Sprint)
- Race forecasts for adjacent distances with confidence ranges
- Event fit analysis identifying strengths and gaps
- Environmental corrections for heat, altitude, humidity
- Multi-event analysis when more than one race is logged
- Speed Reserve Ratio when sprint and distance data both exist

The methodology is proprietary — built on validated sport science but deliberately not displayed formula-by-formula in the app to prevent cognitive bias. Full methodology library available in `/docs/`.

---

## Quick Start

Open `app/stride-os.html` in a web browser. No installation, no build step. It runs.

For the calculator to remember athletes across sessions, the app uses browser localStorage. Multi-device sync requires the Supabase backend (see `/backend/README.md`).

---

## Repository Structure

```
stride-os/
├── README.md                          ← you are here
├── LICENSE
├── .gitignore
├── app/
│   └── stride-os.html                ← the application (single file, ~4500 lines)
├── docs/
│   ├── MASTER_PLAN.md                ← what STRIDE OS is, audience by audience
│   ├── NORTH_STAR.md                 ← long-term CoachLab vision
│   ├── BRIDGE_MAP.md                 ← how v1 serves the long-term architecture
│   ├── BACKEND_ARCHITECTURE.md       ← Supabase schema and migration plan
│   ├── SOURCES_LIBRARY.md            ← full peer-reviewed citation library
│   ├── SOURCES_LIBRARY_BACKUP_2026-05.md
│   ├── TERMS_OF_SERVICE.md           ← plain-language TOS (beta)
│   └── PRIVACY_POLICY.md             ← plain-language privacy policy (beta)
├── data/
│   └── validation_corpus.csv         ← 1,817 race records from UIL/NCAA/WMA
└── backend/
    ├── README.md
    ├── migrations/                   ← Supabase SQL migration files
    │   ├── 001_init.sql
    │   ├── 002_checkins.sql
    │   ├── 003_corpus.sql
    │   └── 004_indices.sql
    └── policies/
        └── rls.sql                   ← Row-level security policies
```

---

## For Coaches

Read `docs/MASTER_PLAN.md` first to understand the methodology. Then open the app.

If you'd like to participate in beta testing or have feedback, please get in touch.

---

## For Researchers

The validation corpus (`data/validation_corpus.csv`) contains 1,817 verified race results spanning ages 12–95 across three populations (Texas HS state qualifiers, NCAA Division I championship qualifiers, World Masters Athletics championship qualifiers).

`docs/SOURCES_LIBRARY.md` contains the complete peer-reviewed citation list informing the methodology.

For collaboration, data access agreements, or methodology questions, please contact us.

---

## For Developers

The app is a single HTML file (`app/stride-os.html`) with embedded CSS and JavaScript. No build step, no framework, no dependencies beyond two web fonts loaded from Google Fonts.

The Supabase backend (`/backend/`) is scaffolded but not yet deployed. Migration files and RLS policies are ready to run against a fresh Supabase project. See `backend/README.md` for deployment instructions.

Internal code comments reference specific formulas (Riegel, Cameron, VDOT family, Sandford ASR) for engineering maintenance. These names do not appear in the user-facing UI on purpose — see `docs/SOURCES_LIBRARY.md` for the rationale.

---

## Status & Roadmap

**Phase 1 (current):** localStorage-only single-coach calculator. Beta testing with closed group.

**Phase 2 (next):** Supabase backend deployment. Auth, multi-device sync, longitudinal data accumulation.

**Phase 3:** Athlete Profile Engine, Competitive Fit Engine, Longitudinal Development tracking.

**Phase 4+:** See `docs/NORTH_STAR.md` for the long-term CoachLab vision.

---

## Legal & Privacy

- `docs/TERMS_OF_SERVICE.md` — plain-language Terms of Service (beta, not yet lawyer-reviewed)
- `docs/PRIVACY_POLICY.md` — plain-language Privacy Policy (beta, not yet lawyer-reviewed)

The current version stores all data locally in the coach's browser. No data is sent to any server until the Supabase backend is deployed and the coach explicitly consents.

---

## License

See LICENSE file.

---

**Maintained by:** CoachLab
**Last updated:** May 21, 2026
