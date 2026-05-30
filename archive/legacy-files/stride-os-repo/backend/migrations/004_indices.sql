-- ═══════════════════════════════════════════════════════════════════════
-- STRIDE OS / CoachLab — Migration 004: Performance Indices
-- ═══════════════════════════════════════════════════════════════════════
-- Additional indices to optimize common query patterns.

-- Coach dashboard: "list all my athletes"
CREATE INDEX IF NOT EXISTS idx_athletes_active
  ON public.athletes(coach_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Athlete dashboard: "all races for this athlete, newest first"
CREATE INDEX IF NOT EXISTS idx_races_athlete_date
  ON public.races(athlete_id, race_date DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- Coach analytics: "all races logged in the last 90 days"
CREATE INDEX IF NOT EXISTS idx_races_recent
  ON public.races(created_at DESC)
  WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '90 days';

-- Prediction validation: "predictions that have actual results"
CREATE INDEX IF NOT EXISTS idx_predictions_validated_recent
  ON public.predictions(validated_at DESC, prediction_error_pct)
  WHERE validated_at IS NOT NULL;

-- Daily check-in lookup: "latest check-in for athlete X"
CREATE INDEX IF NOT EXISTS idx_checkins_latest
  ON public.daily_checkins(athlete_id, checkin_date DESC);

-- Corpus benchmarking: range queries by time
CREATE INDEX IF NOT EXISTS idx_corpus_time_lookup
  ON public.validation_corpus(event, sex, time_sec);

-- ───────────────────────────────────────────────────────────────────────
-- STATISTICS REFRESH (for query planner)
-- ───────────────────────────────────────────────────────────────────────
-- Supabase runs these automatically, but manual refresh after large imports:
-- ANALYZE public.validation_corpus;
-- ANALYZE public.population_benchmarks;
