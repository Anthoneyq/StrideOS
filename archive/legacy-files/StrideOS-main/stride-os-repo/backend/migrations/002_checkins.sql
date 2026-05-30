-- ═══════════════════════════════════════════════════════════════════════
-- STRIDE OS / CoachLab — Migration 002: Daily Check-Ins
-- ═══════════════════════════════════════════════════════════════════════
-- Optional daily data capture per Path B (full schema, lean UI surface).
-- v1 STRIDE OS does NOT analyze this data. Captured silently for v2+ analysis.

CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id),

  checkin_date DATE NOT NULL,

  -- Subjective state (1-10 scales)
  recovery_rating INT CHECK (recovery_rating BETWEEN 1 AND 10),
  fatigue_rating INT CHECK (fatigue_rating BETWEEN 1 AND 10),
  motivation_rating INT CHECK (motivation_rating BETWEEN 1 AND 10),
  soreness_rating INT CHECK (soreness_rating BETWEEN 1 AND 10),
  mood_rating INT CHECK (mood_rating BETWEEN 1 AND 10),

  -- Sleep
  sleep_hours NUMERIC,
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 10),
  sleep_disruptions INT,

  -- HRV (if reported by athlete via wearable or manual entry)
  resting_hr INT,
  hrv_rmssd INT,

  -- Training session details
  session_description TEXT,
  session_intensity INT CHECK (session_intensity BETWEEN 1 AND 10),
  session_duration_min NUMERIC,
  session_type TEXT,                       -- 'easy', 'tempo', 'intervals', 'long', 'race', 'rest'

  -- External factors
  weather_notes TEXT,
  illness_flag BOOLEAN DEFAULT FALSE,
  injury_flag BOOLEAN DEFAULT FALSE,
  travel_flag BOOLEAN DEFAULT FALSE,

  -- Notes (free text)
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One check-in per athlete per day
  UNIQUE(athlete_id, checkin_date)
);

CREATE INDEX idx_checkins_athlete_date ON public.daily_checkins(athlete_id, checkin_date DESC);

CREATE TRIGGER trg_checkins_updated_at BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.daily_checkins IS 'Optional daily athlete check-ins. Path B: captured in v1, analyzed in v2+.';
