# Backend Architecture Plan
## STRIDE OS / CoachLab — Supabase Implementation

---

## PURPOSE

This document specifies the backend architecture for STRIDE OS, designed for:
- Solo operator with AI assistance
- Path B (full data schema, lean coach surface)
- Eventually supporting CoachLab North Star (digital twin)
- Privacy-and-consent-first from day one

---

## STACK DECISION

**Supabase** (managed PostgreSQL + auth + APIs + realtime + storage)

### Why Supabase

1. **Solo-operator friendly:** Auto-generated APIs from schema. No backend code to maintain for basic CRUD.
2. **PostgreSQL underneath:** Real database. Standard SQL. Not vendor-locked into a proprietary query language.
3. **Built-in auth:** Email/password, magic link, OAuth providers. Row-level security policies.
4. **Generous free tier:** 50,000 monthly active users, 500MB database, 1GB file storage, 2GB bandwidth. Enough for v1 + early growth.
5. **Self-hostable if needed:** Open source. If Supabase ever changes terms, we can self-host the same stack.
6. **Realtime sync:** Built-in. Coaches with multi-device access get instant sync.
7. **AI-friendly:** Well-documented, popular among AI-assisted developers, lots of training data.

### What Supabase Does Not Solve

- Subscription billing (use Stripe — separate decision, later)
- Email sending (Supabase has a basic SMTP integration; production use needs Resend, Postmark, or similar)
- Complex business logic (use Supabase Edge Functions or keep client-side for now)
- Analytics (can be added later via PostHog or Plausible)

---

## DATABASE SCHEMA

The schema is designed for **Path B** — capture richly now, expose features sequentially.

### Tables

```sql
-- ─────────────────────────────────────────
-- USERS (managed by Supabase Auth)
-- auth.users is built-in. We add a public profile.
-- ─────────────────────────────────────────
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  team_name TEXT,
  team_color TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'individual', 'program', 'research')),
  research_opt_in BOOLEAN DEFAULT FALSE,
  research_opt_in_at TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  privacy_accepted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- ATHLETES
-- Each athlete belongs to one coach (v1). 
-- In v2+ we add program-shared rosters.
-- ─────────────────────────────────────────
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  
  -- Core identification (private, never shared)
  display_name TEXT NOT NULL,  -- coach's chosen label (could be first name only)
  external_id TEXT,             -- coach's own ID system
  
  -- Demographics (used for analysis, can be de-identified)
  birth_year INT,
  age_years INT,
  grade TEXT,
  sex TEXT CHECK (sex IN ('M', 'F', 'X', NULL)),
  
  -- Training context
  training_age_years NUMERIC,
  weekly_mileage_avg NUMERIC,
  primary_event TEXT,
  secondary_events TEXT[],
  
  -- Race anchor (the "main PR")
  race_distance TEXT,
  race_distance_m NUMERIC,
  race_time TEXT,
  race_time_sec NUMERIC,
  race_date DATE,
  race_location TEXT,
  race_start_time TEXT,
  
  -- Settings
  guardrail_setting TEXT DEFAULT 'auto',
  
  -- Consent flags (for under-13 athletes especially)
  parental_consent_received BOOLEAN DEFAULT FALSE,
  parental_consent_at TIMESTAMPTZ,
  research_opt_out BOOLEAN DEFAULT FALSE,  -- athlete-level opt-out
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- RACES / PERFORMANCES
-- The full performance history of an athlete.
-- ─────────────────────────────────────────
CREATE TABLE public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id),
  
  event TEXT NOT NULL,
  distance_m NUMERIC NOT NULL,
  time_text TEXT NOT NULL,
  time_sec NUMERIC NOT NULL,
  
  race_date DATE,
  race_location TEXT,
  race_meet_name TEXT,
  race_level TEXT,        -- 'practice', 'time_trial', 'dual_meet', 'invitational', 'district', 'regional', 'state', 'national'
  placement INT,
  
  -- Environmental
  temperature_f NUMERIC,
  humidity_pct NUMERIC,
  dew_point_f NUMERIC,
  wind_mph NUMERIC,
  altitude_ft NUMERIC,
  aqi INT,
  weather_source TEXT,
  
  -- Reliability tier
  reliability TEXT DEFAULT 'high' CHECK (reliability IN ('high', 'moderate', 'low', 'excluded')),
  reliability_notes TEXT,
  
  -- Coach context
  coach_notes TEXT,
  taper_status TEXT,         -- 'fresh', 'fatigued', 'untapered', 'mid-block', etc.
  execution_notes TEXT,      -- post-race coaching notes
  
  -- Source / verification
  source TEXT DEFAULT 'coach_entry',  -- 'coach_entry', 'imported_csv', 'uil_official', 'tfrrs', etc.
  verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- DAILY CHECK-INS
-- Optional, for future analysis. Not analyzed in v1.
-- ─────────────────────────────────────────
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id),
  
  checkin_date DATE NOT NULL,
  
  -- Subjective state
  recovery_rating INT CHECK (recovery_rating BETWEEN 1 AND 10),
  fatigue_rating INT CHECK (fatigue_rating BETWEEN 1 AND 10),
  motivation_rating INT CHECK (motivation_rating BETWEEN 1 AND 10),
  soreness_rating INT CHECK (soreness_rating BETWEEN 1 AND 10),
  
  -- Sleep
  sleep_hours NUMERIC,
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 10),
  
  -- HRV (if reported)
  resting_hr INT,
  hrv_rmssd INT,
  
  -- Training
  session_description TEXT,
  session_intensity INT CHECK (session_intensity BETWEEN 1 AND 10),
  session_duration_min NUMERIC,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(athlete_id, checkin_date)
);

-- ─────────────────────────────────────────
-- PREDICTIONS LOG
-- Every prediction the system makes for an athlete.
-- Used to track formula accuracy over time.
-- ─────────────────────────────────────────
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id),
  
  -- Input
  input_distance_m NUMERIC NOT NULL,
  input_time_sec NUMERIC NOT NULL,
  input_race_id UUID REFERENCES public.races(id),
  
  -- Target
  target_distance_m NUMERIC NOT NULL,
  
  -- Outputs
  prediction_riegel_sec NUMERIC,
  prediction_cameron_sec NUMERIC,
  prediction_vdot_sec NUMERIC,
  prediction_vickers_sec NUMERIC,
  prediction_purdy_sec NUMERIC,
  prediction_ensemble_sec NUMERIC,
  ci_95_low_sec NUMERIC,
  ci_95_high_sec NUMERIC,
  agreement_score NUMERIC,
  confidence_label TEXT,
  
  -- Validation (filled in when actual result comes in)
  actual_race_id UUID REFERENCES public.races(id),
  actual_time_sec NUMERIC,
  prediction_error_sec NUMERIC,
  prediction_error_pct NUMERIC,
  
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- VALIDATION CORPUS (read-only, populated from CSV uploads)
-- Used for population benchmarks. Not coach-visible.
-- ─────────────────────────────────────────
CREATE TABLE public.validation_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_name TEXT,  -- public record names
  school_or_country TEXT,
  age_group TEXT,
  grade TEXT,
  classification TEXT,
  division TEXT,
  event TEXT NOT NULL,
  time_mark TEXT,
  time_sec NUMERIC,
  place INT,
  sex TEXT,
  meet_level TEXT,
  meet_name TEXT,
  meet_year INT,
  data_source TEXT NOT NULL,
  reliability TEXT DEFAULT 'high',
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_corpus_event_sex ON public.validation_corpus(event, sex);
CREATE INDEX idx_corpus_age_event ON public.validation_corpus(age_group, event);

-- ─────────────────────────────────────────
-- ACCESS LOG (for privacy compliance)
-- ─────────────────────────────────────────
CREATE TABLE public.access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.coaches(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security

Every table has policies enforcing **coach can only see their own data**:

```sql
-- Coaches table
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches see own profile" ON public.coaches
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Coaches update own profile" ON public.coaches
  FOR UPDATE USING (auth.uid() = id);

-- Athletes table
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches see own athletes" ON public.athletes
  FOR ALL USING (auth.uid() = coach_id);

-- Same pattern for races, daily_checkins, predictions
-- ... (full policies in implementation)
```

---

## AUTHENTICATION & ACCESS

### v1 Auth Methods

1. **Email + password** (default)
2. **Magic link** (email a sign-in link)
3. **Anonymous mode** (no account — calculator only, no athlete saving)

OAuth providers (Google, Apple) added in v2.

### Subscription Tiers

| Tier | Cost | Capabilities |
|---|---|---|
| **Anonymous** | Free | Calculator only, no save |
| **Free** | $0 | Up to 3 athletes, calculator + basic features |
| **Individual** | TBD (target $19/mo or $179/yr) | Unlimited athletes, all v1 features |
| **Program** | TBD (target $499/yr) | Multi-coach team sharing |
| **Research** | Negotiated | Aggregated data access under signed agreement |

Tier decisions are deferred but the schema supports them.

### Privacy & Consent Flows

1. **Sign-up requires:**
   - Email confirmation
   - Terms of Service acceptance (recorded timestamp)
   - Privacy Policy acceptance (recorded timestamp)
   
2. **First athlete creation prompts:**
   - "Confirm you have authorization to enter this athlete's data"
   - If birth year indicates age < 13: COPPA parental consent flow required
   
3. **Research participation:**
   - Opt-in only, never default
   - Separate consent flow with explanation of what data is shared
   - Athletes can be individually opted out by coach
   
4. **Data export:**
   - Available at any time from account settings
   - Returns JSON or CSV of all coach + athlete data
   
5. **Account deletion:**
   - 30-day soft-delete window (recovery possible)
   - Permanent purge after 30 days
   - Aggregate de-identified data may be retained for methodology research

---

## IMPLEMENTATION SEQUENCE

### Week 1: Project Setup

- Create Supabase project
- Configure auth providers (email + magic link)
- Set up local development environment with Supabase CLI
- Configure row-level security policies
- Set up database migrations

### Week 2: Schema Migration

- Implement all tables from spec above
- Create RLS policies
- Seed validation corpus from CSV files
- Create basic database functions (e.g., `compute_age_from_birth_year`)
- Test queries from front-end

### Week 3: Client-Side Auth Integration

- Add Supabase client to STRIDE OS HTML
- Implement sign-up, sign-in, sign-out flows
- Build account creation UI (terms acceptance, privacy acceptance)
- Build forgot-password flow

### Week 4: Data Layer Migration

- Replace localStorage reads/writes with Supabase queries
- Implement offline-first caching (queue writes when offline, sync when online)
- Build initial-load sync from server to client
- Test multi-device sync

### Week 5: Privacy & Consent UI

- Build COPPA parental consent flow
- Build research opt-in flow
- Build data export feature
- Build account deletion feature
- Draft Terms of Service (plain language, lawyer review later)
- Draft Privacy Policy (plain language, lawyer review later)

### Week 6: Migration Path for Existing localStorage Users

- For coaches who used the app before sign-in existed:
- Detect localStorage data on sign-in
- Offer one-time migration to authenticated account
- Verify migration before purging localStorage

### Week 7: Polish & Soft Launch

- Test full flows end-to-end
- Polish error handling
- Add basic analytics (PostHog or similar — privacy-respecting)
- Soft launch to 10 coach friends

### Week 8+: Iterate

- Coach feedback drives v1.1 improvements

---

## OFFLINE BEHAVIOR

Critical for coach trust. The calculator must work without internet.

### Strategy: Optimistic Local + Background Sync

1. **All reads:** check local cache first, then Supabase
2. **All writes:** write to local cache immediately, queue for server sync
3. **When online:** background sync runs every 30 seconds
4. **When offline:** indicator visible, writes still work, sync resumes when online
5. **Conflict resolution:** last-write-wins for simple fields; manual resolution for race results

### Tooling

- IndexedDB for local cache (more capacity than localStorage)
- Service worker for offline detection
- Background sync API (if available) or polling

---

## PRIVACY FRAMEWORK SPECIFICATION

### Terms of Service (Plain Language)

The TOS will state:

- STRIDE OS provides reference calculations and analysis tools
- Coaches retain full responsibility for training decisions
- The platform does not provide medical, injury-prevention, or psychological advice
- Coaches certify they have authorization to enter athlete information
- For athletes under 13, COPPA-compliant parental consent is required
- Coaches own their data and can export/delete at any time
- STRIDE OS retains de-identified aggregate data for methodology improvement
- Service is provided "as is" without warranty

### Privacy Policy (Plain Language)

The Privacy Policy will state:

- What we collect: coach account info, athlete demographics and performance, optional check-in data
- Why we collect it: to provide the service, improve methodology
- Who we share with: nobody, except aggregated de-identified data with consenting research partners
- How long we keep it: while account is active + 30 days after deletion
- Where it's stored: Supabase (United States data centers; we will note region)
- How it's protected: encryption in transit and at rest, access controls
- User rights: access, correction, deletion, export, opt-out of research

### Lawyer Review

Both documents will be drafted in plain language and reviewed by an actual lawyer before any commercial use. For shipping to 10 coach friends as beta, plain-language versions are acceptable but should be clearly marked "Beta agreement."

---

## OPERATIONAL CONSIDERATIONS

### Backup Strategy

- Supabase performs automated daily backups (free tier: 7 days retention; paid: 30 days)
- Weekly manual exports of all data to encrypted cold storage (S3 or similar)
- Test restore procedure quarterly

### Monitoring

- Supabase dashboard for query performance, auth events, errors
- Uptime monitoring via UptimeRobot (free) or similar
- Error tracking via Sentry (free tier) or similar

### Cost Projections

| Stage | Coaches | Monthly Cost |
|---|---|---|
| v1 launch (10 coaches) | 10 | $0 (free tier) |
| Early growth (100 coaches) | 100 | $0–25 |
| Expansion (500 coaches) | 500 | $25–100 |
| Scale (5,000 coaches) | 5,000 | $200–500 |

Beyond 5,000 active coaches, evaluate Supabase Pro vs. self-hosting decision.

### Security Practices

- Never store passwords (Supabase handles auth hashing)
- Never log raw athlete data in access logs
- Audit access logs monthly
- Rotate Supabase service role keys quarterly
- Use Supabase's built-in rate limiting

---

## DECISIONS DEFERRED

These decisions are intentionally deferred until v1 ships and we have feedback:

1. **Pricing structure** — schema supports tiers, but pricing TBD based on coach feedback
2. **Subscription billing integration** — add when ready to charge (Stripe)
3. **Wearable integrations** — schema includes HRV fields but no integrations in v1
4. **Mobile app vs web app** — v1 is responsive web; native app evaluated later
5. **Multi-language support** — v1 English only
6. **International data residency** — v1 US-only data centers; add EU residency when needed

---

## SUCCESS CRITERIA

The backend implementation is successful when:

1. **10 coaches can sign up, add athletes, and use STRIDE OS** without losing data
2. **Multi-device sync works** (laptop ↔ phone)
3. **Offline mode works** for calculator and athlete data
4. **Privacy framework is in place** with TOS + Privacy Policy + consent flows
5. **No data loss incidents** in first 90 days
6. **Coach can export their full data** in JSON or CSV
7. **Account deletion fully removes identifying data** within 30 days

---

**Document Version:** 1.0
**Last Updated:** May 20, 2026
**Owner:** CoachLab
**Status:** Implementation specification — ready to build
**Companion documents:** *STRIDE OS Master Plan v2*, *CoachLab North Star*, *The Bridge Map*
