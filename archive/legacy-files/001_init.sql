-- ═══════════════════════════════════════════════════════════════════════
-- STRIDE OS / CoachLab — Migration 001: Core Schema
-- ═══════════════════════════════════════════════════════════════════════
-- Creates the foundational tables: coaches, athletes, races, predictions.
-- Run after creating a fresh Supabase project. Supabase Auth (`auth.users`)
-- already exists; we create a `coaches` table that references it 1:1.

-- ───────────────────────────────────────────────────────────────────────
-- COACHES — public profile linked to auth.users
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  team_name TEXT,
  team_color TEXT,

  -- Subscription tier (controls what features are unlocked)
  subscription_tier TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'individual', 'program', 'research')),

  -- Research participation (opt-in only, never default)
  research_opt_in BOOLEAN DEFAULT FALSE,
  research_opt_in_at TIMESTAMPTZ,

  -- Legal acceptance (required for account creation)
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  privacy_accepted_at TIMESTAMPTZ NOT NULL,
  terms_version TEXT DEFAULT '1.0',
  privacy_version TEXT DEFAULT '1.0',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.coaches IS 'Coach profile linked 1:1 to Supabase auth.users';

-- ───────────────────────────────────────────────────────────────────────
-- ATHLETES — each athlete belongs to one coach (v1; multi-coach in v2+)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

  -- Identification (private, never shared externally)
  display_name TEXT NOT NULL,
  external_id TEXT,                       -- coach's own ID system if any

  -- Demographics (used for analysis; can be de-identified for research)
  birth_year INT,
  age_years INT,
  grade TEXT,
  sex TEXT CHECK (sex IN ('M', 'F', 'X', NULL)),

  -- Training context
  training_age_years NUMERIC,
  weekly_mileage_avg NUMERIC,
  primary_event TEXT,
  secondary_events TEXT[],

  -- Primary race PR (the calculator anchor)
  race_distance TEXT,
  race_distance_m NUMERIC,
  race_time TEXT,
  race_time_sec NUMERIC,
  race_date DATE,
  race_location TEXT,
  race_start_time TEXT,

  -- Optional baseline metrics (Path B — captured silently for v2+ analysis)
  resting_hr_baseline INT,
  hrv_rmssd_baseline INT,
  typical_sleep_hours NUMERIC,

  -- Settings
  guardrail_setting TEXT DEFAULT 'auto'
    CHECK (guardrail_setting IN ('auto', 'conservative', 'standard', 'aggressive')),

  -- COPPA / parental consent (required for under-13)
  parental_consent_received BOOLEAN DEFAULT FALSE,
  parental_consent_at TIMESTAMPTZ,
  parental_consent_method TEXT,           -- 'email', 'signed_form', etc.

  -- Athlete-level research opt-out (default: inherits from coach)
  research_opt_out BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_athletes_coach ON public.athletes(coach_id) WHERE deleted_at IS NULL;
COMMENT ON TABLE public.athletes IS 'Athlete profiles. Schema captures Path B fields even if v1 UI does not yet display them.';

-- ───────────────────────────────────────────────────────────────────────
-- RACES — every performance the coach logs for an athlete
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id),

  -- Result
  event TEXT NOT NULL,
  distance_m NUMERIC NOT NULL,
  time_text TEXT NOT NULL,
  time_sec NUMERIC NOT NULL,
  placement INT,

  -- Race context
  race_date DATE,
  race_location TEXT,
  race_meet_name TEXT,
  race_level TEXT
    CHECK (race_level IN ('practice', 'time_trial', 'dual_meet',
                          'invitational', 'district', 'regional',
                          'state', 'national', 'conference',
                          'championship', 'unknown', NULL)),

  -- Environmental conditions (auto-pulled or manually entered)
  temperature_f NUMERIC,
  humidity_pct NUMERIC,
  dew_point_f NUMERIC,
  wind_mph NUMERIC,
  altitude_ft NUMERIC,
  aqi INT,
  weather_source TEXT,                    -- 'NOAA', 'Open-Meteo', 'manual'

  -- Reliability tier (per Galpin-style data reliability framework)
  reliability TEXT DEFAULT 'high'
    CHECK (reliability IN ('high', 'moderate', 'low', 'excluded')),
  reliability_notes TEXT,

  -- Coach context
  coach_notes TEXT,
  taper_status TEXT,                      -- 'fresh', 'mid-block', 'fatigued', etc.
  execution_notes TEXT,                   -- post-race coaching notes
  is_pr BOOLEAN DEFAULT FALSE,
  is_season_best BOOLEAN DEFAULT FALSE,

  -- Source / verification
  source TEXT DEFAULT 'coach_entry'
    CHECK (source IN ('coach_entry', 'imported_csv', 'imported_tfrrs',
                      'imported_uil', 'imported_milesplit', 'athlete_entry')),
  verified BOOLEAN DEFAULT FALSE,
  source_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_races_athlete ON public.races(athlete_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_races_coach ON public.races(coach_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_races_date ON public.races(race_date DESC NULLS LAST) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.races IS 'Performance log. Includes reliability tier per Galpin-style data validation framework.';

-- ───────────────────────────────────────────────────────────────────────
-- PREDICTIONS — log of every prediction the ensemble makes
-- ───────────────────────────────────────────────────────────────────────
-- Used to validate model accuracy over time (predicted vs. actual).
-- This is the foundation of the "more data = better predictions" promise.
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id),

  -- Source race used as the anchor
  input_distance_m NUMERIC NOT NULL,
  input_time_sec NUMERIC NOT NULL,
  input_race_id UUID REFERENCES public.races(id),

  -- Target
  target_distance_m NUMERIC NOT NULL,
  target_event TEXT,

  -- Predicted values (Conservative/Likely/Aggressive — see Comprehensive Findings)
  prediction_likely_sec NUMERIC,
  prediction_conservative_sec NUMERIC,
  prediction_aggressive_sec NUMERIC,

  -- Individual formula outputs (for audit + retraining)
  prediction_riegel_sec NUMERIC,
  prediction_cameron_sec NUMERIC,
  prediction_vdot_sec NUMERIC,
  prediction_vickers_sec NUMERIC,
  prediction_purdy_sec NUMERIC,

  -- Personal fatigue exponent applied (if athlete had multi-PR data)
  personal_k NUMERIC,
  personal_k_blend_pct NUMERIC,           -- how much weight personal vs ensemble

  -- Confidence
  confidence_score NUMERIC,
  confidence_label TEXT
    CHECK (confidence_label IN ('Very High', 'High', 'Medium', 'Low',
                                'Very Low', 'Exploratory', NULL)),
  confidence_reasons TEXT[],

  -- Event domain classification
  source_domain TEXT,
  target_domain TEXT,
  is_cross_domain BOOLEAN DEFAULT FALSE,

  -- Validation (filled in when actual result comes in)
  actual_race_id UUID REFERENCES public.races(id),
  actual_time_sec NUMERIC,
  prediction_error_sec NUMERIC,
  prediction_error_pct NUMERIC,
  validated_at TIMESTAMPTZ,

  predicted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_athlete ON public.predictions(athlete_id);
CREATE INDEX idx_predictions_validated ON public.predictions(validated_at) WHERE validated_at IS NOT NULL;

COMMENT ON TABLE public.predictions IS 'Audit log of all predictions made. Validated against actual race results over time for model improvement.';

-- ───────────────────────────────────────────────────────────────────────
-- ACCESS LOG — for privacy compliance and security audit
-- ───────────────────────────────────────────────────────────────────────
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

CREATE INDEX idx_access_log_coach_time ON public.access_log(coach_id, occurred_at DESC);

COMMENT ON TABLE public.access_log IS 'Audit trail for data access. Athlete data details are NOT logged here — only metadata.';

-- ───────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coaches_updated_at BEFORE UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_athletes_updated_at BEFORE UPDATE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_races_updated_at BEFORE UPDATE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────
-- DONE
-- ───────────────────────────────────────────────────────────────────────
-- Next: run 002_checkins.sql for optional Daily Check-In support
-- Next: run 003_corpus.sql for validation corpus tables
-- Next: run 004_indices.sql for query performance indices
-- Next: run policies/rls.sql to enable row-level security
