# STRIDE OS / CoachLab — Backend (Supabase)

Status: **Scaffolding only.** The schema files in this directory are ready to deploy but not yet attached to a live Supabase project. The live app currently runs on localStorage. Backend migration is a deliberate next phase.

---

## What's Here

```
backend/
├── README.md                          (this file)
├── migrations/
│   ├── 001_init.sql                   Core tables: coaches, athletes, races, predictions
│   ├── 002_checkins.sql               Optional daily check-in data
│   ├── 003_corpus.sql                 Validation corpus tables (UIL, NCAA, WMA)
│   └── 004_indices.sql                Performance indices for common queries
└── policies/
    └── rls.sql                        Row-level security policies
```

---

## Architecture Overview

**Database:** Supabase (managed PostgreSQL)
**Auth:** Supabase Auth (email/password + magic link initially)
**APIs:** Auto-generated REST + Realtime from schema
**Front-end:** Existing HTML/JS, modified to optionally read/write to Supabase

**Design principle:** The front-end works fully offline with localStorage. Supabase sync is additive — it provides multi-device access, persistence beyond browser cache, and the longitudinal data accumulation needed for "more data = better predictions."

---

## Migration Plan (when ready to deploy)

### Week 1: Provision
1. Create Supabase project at supabase.com (free tier sufficient for v1)
2. Run `migrations/001_init.sql` to create core tables
3. Run `migrations/002_checkins.sql` to add optional check-in support
4. Run `migrations/003_corpus.sql` to add validation corpus tables
5. Run `migrations/004_indices.sql` to create performance indices
6. Run `policies/rls.sql` to enable row-level security
7. Seed validation corpus tables from existing CSV files in `/data/`

### Week 2: Wire the Front-End
1. Add Supabase JS client to `stride-os.html` via CDN
2. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to a config block
3. Add auth modal (sign-up / sign-in / magic-link / sign-out)
4. Add sync logic: detect localStorage data on first login, offer migration

### Week 3: Sync Layer
1. Implement read-from-Supabase on app load (fall back to localStorage if offline)
2. Implement write-to-Supabase on athlete create/update (optimistic local cache)
3. Implement realtime sync for multi-device coaches

### Week 4: Privacy & Consent
1. Build terms of service + privacy policy acceptance flow
2. Build COPPA parental consent flow for athletes under 13
3. Build research opt-in (separate consent)
4. Build data export feature (JSON or CSV)
5. Build account deletion flow

---

## Schema Highlights

The schema is designed for the **full Path B vision** — capture richly now, expose features sequentially. Specifically:

- **`athletes`** table captures demographics, training context, multi-year PR history, optional HRV/sleep baselines, consent flags
- **`races`** table captures every result with reliability tier, race conditions, taper status, execution notes
- **`daily_checkins`** table captures optional recovery/sleep/training data (analyzed in v2+, not v1)
- **`predictions`** table logs every prediction the system makes, so we can validate accuracy over time
- **`validation_corpus`** table holds the UIL/NCAA/WMA reference data (1,817 records)

The schema is the foundation of the longitudinal database moat described in the CoachLab North Star document.

---

## Cost Projection

| Stage | Active Coaches | Supabase Tier | Monthly Cost |
|---|---|---|---|
| v1 launch (Alex + 10 friends) | 10 | Free | $0 |
| Early growth | 100 | Free | $0–25 |
| Expansion | 500 | Pro | $25–100 |
| Scale | 5,000 | Pro + add-ons | $200–500 |

Free tier limits: 50,000 MAU, 500MB DB, 1GB storage, 2GB bandwidth.

---

## Security & Privacy

- All data encrypted in transit (HTTPS) and at rest (Supabase default)
- Row-level security ensures coaches can only see their own athletes
- Research opt-in is explicit, not default
- COPPA flow required for under-13 athletes
- Account deletion fully removes identifying data within 30 days

See `policies/rls.sql` for the actual security policies.

---

## What's Still TBD

- **Hosting region** — default US (Supabase us-east-1); add EU if needed for international coaches
- **Backup strategy beyond Supabase's daily backups** — weekly manual exports to encrypted cold storage recommended
- **Subscription billing** — Stripe integration is a separate workstream, not in this scaffolding
- **Email service** — Supabase has basic SMTP; production needs Resend or Postmark

---

## Why This Is Scaffolding And Not Live

Per the Backend Architecture Plan and current strategy:

1. v1 STRIDE OS ships to Alex + 10 coach friends on localStorage first
2. We collect feedback for 2–4 weeks
3. We deploy this backend once feedback shapes which features are actually used
4. We migrate coaches to authenticated accounts after the localStorage version is validated

Building the backend now but not deploying it means we can iterate on the schema without breaking real users.

---

**Last Updated:** May 20, 2026
**Status:** Schema ready; deployment deferred per strategy
**Owner:** CoachLab
