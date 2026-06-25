# STRIDE OS

A pacing calculator and athlete-intelligence tool for running coaches, built as the first module of CoachLab.

**Status:** Beta. Active development. Shipping to a closed group of coaches for feedback.

---

## What This Is

STRIDE OS turns a single race time into a complete coaching toolkit:

- Training paces across all intensity zones (Easy through Sprint)
- Race forecasts for adjacent distances with confidence ranges
- Event-fit analysis identifying strengths and gaps
- Environmental corrections for heat, altitude, humidity
- Multi-event analysis when more than one race is logged
- Speed Reserve Ratio when sprint and distance data both exist

The methodology is proprietary — built on validated sport science, with coach-facing methodology and source summaries exposed in the app's Sources screen. Full methodology library lives in `Model_Docs/`, `Formulas/`, `Data_Validation/`, and `docs/planning/SOURCES_LIBRARY.md`.

---

## Quick Start

Open `index.html` in a web browser. No installation, no build step — it runs as a single static file.

Anonymous use stores data in browser localStorage. Sign-in, multi-device sync, and Pro billing run through the Supabase backend (`supabase/`) and the publishable config in `stride-config.js`.

---

## Repository Structure

```
StrideOS/
├── README.md                  ← you are here
├── INDEX.md                   ← knowledge-domain map (taxonomy + maintenance rules)
├── AGENTS.md                  ← instructions for AI agents working in this repo
├── working_context.md         ← current project state (stub)
├── index.html                 ← the application (single file, ~6,180 lines)
├── stride-config.js           ← publishable Supabase/Strava/billing config
├── fix-vercel.sh              ← deploy helper
├── Stripe_Setup_SOP.md        ← billing setup runbook
│
├── supabase/                  ← backend: migrations, edge functions, email templates
│   ├── migrations/
│   ├── functions/             ← stripe-webhook, strava-oauth, checkout, portal
│   ├── templates/             ← auth email templates
│   ├── seed.sql
│   └── config.toml
│
├── Model_Docs/                ← predictive-model spec, validation, PRD, coach-facing docs
├── Predictive_Model/          ← competitive analysis, diagnosis scripts, ML guide
├── Formulas/                  ← running-intelligence report + appendix (the math)
├── Data_Validation/           ← canonical CSV datasets (UIL/NCAA/Milesplit/masters) + per-dataset READMEs
│
├── research/                  ← supporting research (not part of the deployed app)
│   ├── markdown/              ← research write-ups and scraped references
│   ├── pdfs/                  ← critiques, onboarding, product walkthroughs
│   └── transcripts/           ← meeting recordings (.vtt)
│
├── Feedback/                  ← coach critiques (Alex Muntefering, Doug Framke) + response drafts
│
├── docs/                      ← planning, legal, deploy, and sources docs
│   ├── planning/
│   └── SUPABASE_SETUP.md
│
└── archive/                   ← superseded snapshots kept for historical reference
    └── legacy-files/
```

---

## For Coaches

Start with `Model_Docs/05-coach-facing-explanation.md` to understand the methodology, then open `index.html`. To join beta testing or send feedback, get in touch.

---

## For Researchers

Canonical datasets live in `Data_Validation/` — verified race results spanning HS (Texas UIL), NCAA, and masters (WMA) populations, each with a `README_*.md` describing it. Research write-ups are in `research/markdown/`; the sources library is in `docs/planning/SOURCES_LIBRARY.md`.

---

## For Developers

The app is a single HTML file (`index.html`) with embedded CSS and JavaScript and a few CDN scripts (Supabase, PapaParse, SheetJS, web fonts). No framework, no build step.

Backend lives in `supabase/`: SQL migrations, edge functions (Stripe billing + Strava OAuth/sync), and auth email templates. Public browser config is in `stride-config.js` (publishable keys only — secrets live in Supabase Edge Function env vars). Billing setup is documented in `Stripe_Setup_SOP.md`; Supabase setup in `docs/SUPABASE_SETUP.md`.

Internal code comments reference specific formulas (Riegel, Cameron, VDOT family, Sandford ASR) for maintenance. The user-facing Sources screen also lists the published formulas and evidence base, while keeping proprietary blending weights and implementation details private.

---

## Status & Roadmap

**Phase 1 (current):** Single-file calculator with localStorage + Supabase auth/sync and Pro billing in beta.

**Phase 2:** Longitudinal data accumulation, Athlete Profile Engine, Competitive Fit Engine.

**Phase 3+:** Long-term CoachLab vision — see `docs/planning/CoachLab_North_Star.md`.

---

## Legal & Privacy

Plain-language beta `Terms of Service` and `Privacy Policy` live in `docs/planning/`. Not yet lawyer-reviewed.

---

**Maintained by:** CoachLab
**Last updated:** May 29, 2026
