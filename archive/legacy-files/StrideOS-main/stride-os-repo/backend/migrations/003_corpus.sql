-- ═══════════════════════════════════════════════════════════════════════
-- STRIDE OS / CoachLab — Migration 003: Validation Corpus
-- ═══════════════════════════════════════════════════════════════════════
-- Reference datasets used for empirical calibration and population benchmarks.
-- Read-only from the application's perspective. Populated via CSV imports.
--
-- Current corpus (n=1,817):
--   UIL Texas State Meet (2023-2025): 1,299 records, ages 12-18
--   NCAA D1 (2024):                   284 records, ages 18-22
--   WMA / USATF Masters (2024):       234 records, ages 35-95

CREATE TABLE public.validation_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Athlete identity (from public records; not associated with STRIDE accounts)
  athlete_name TEXT,
  school_or_country TEXT,
  age_group TEXT,
  grade TEXT,
  classification TEXT,                    -- UIL 1A-6A, etc.
  division TEXT,                          -- NCAA D1, etc.
  sex TEXT,

  -- Result
  event TEXT NOT NULL,
  distance_m NUMERIC,
  time_mark TEXT,
  time_sec NUMERIC,
  place INT,

  -- Meet context
  meet_level TEXT,                        -- 'state', 'national', 'WMA', etc.
  meet_name TEXT,
  meet_year INT,
  meet_date DATE,

  -- Source
  data_source TEXT NOT NULL,              -- 'UIL', 'TFRRS', 'WMA', etc.
  source_url TEXT,
  reliability TEXT DEFAULT 'high'
    CHECK (reliability IN ('high', 'moderate', 'low')),

  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for common query patterns
CREATE INDEX idx_corpus_event_sex ON public.validation_corpus(event, sex);
CREATE INDEX idx_corpus_age_event ON public.validation_corpus(age_group, event);
CREATE INDEX idx_corpus_meet_level ON public.validation_corpus(meet_level);
CREATE INDEX idx_corpus_source_year ON public.validation_corpus(data_source, meet_year);

-- ───────────────────────────────────────────────────────────────────────
-- POPULATION BENCHMARKS (aggregated from validation_corpus)
-- ───────────────────────────────────────────────────────────────────────
-- Precomputed percentile distributions for fast lookup during predictions.
-- Refreshed via scheduled job after corpus updates.

CREATE TABLE public.population_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  distance_m NUMERIC,
  sex TEXT,
  age_group TEXT,
  classification TEXT,                    -- HS/college/masters subgroup

  -- Percentile distribution (50th = median)
  p01_sec NUMERIC,                        -- elite
  p10_sec NUMERIC,
  p25_sec NUMERIC,
  p50_sec NUMERIC,                        -- median
  p75_sec NUMERIC,
  p90_sec NUMERIC,
  p99_sec NUMERIC,                        -- slowest qualifier

  n_records INT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event, sex, age_group, classification)
);

CREATE INDEX idx_benchmarks_lookup ON public.population_benchmarks(event, sex, age_group);

COMMENT ON TABLE public.validation_corpus IS 'Reference race results from UIL, NCAA, WMA public records. n=1,817 across ages 12-95.';
COMMENT ON TABLE public.population_benchmarks IS 'Precomputed percentile distributions for fast benchmarking during predictions.';
