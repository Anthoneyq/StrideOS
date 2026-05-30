-- ═══════════════════════════════════════════════════════════════════════
-- STRIDE OS / CoachLab — Row-Level Security Policies
-- ═══════════════════════════════════════════════════════════════════════
-- Enforces: coaches can only see their own data. Validation corpus is read-only
-- public. Population benchmarks are read-only public.
--
-- Run AFTER all migration files (001-004) have been applied.

-- ───────────────────────────────────────────────────────────────────────
-- COACHES — see/update only own profile
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_select_own"
  ON public.coaches FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "coaches_update_own"
  ON public.coaches FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "coaches_insert_self"
  ON public.coaches FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Coaches cannot delete their own row directly; deletion is soft-delete via
-- account deletion flow (handled by edge function with admin privileges).

-- ───────────────────────────────────────────────────────────────────────
-- ATHLETES — coaches see only their own athletes
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes_all_own"
  ON public.athletes FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- ───────────────────────────────────────────────────────────────────────
-- RACES — same constraint via coach_id
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "races_all_own"
  ON public.races FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- ───────────────────────────────────────────────────────────────────────
-- DAILY CHECK-INS — same constraint
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_all_own"
  ON public.daily_checkins FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- ───────────────────────────────────────────────────────────────────────
-- PREDICTIONS — same constraint
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_all_own"
  ON public.predictions FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- ───────────────────────────────────────────────────────────────────────
-- ACCESS LOG — coaches see their own access history; cannot modify
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_log_select_own"
  ON public.access_log FOR SELECT
  USING (auth.uid() = coach_id);

-- INSERT is handled by trigger/edge function with elevated privileges.

-- ───────────────────────────────────────────────────────────────────────
-- VALIDATION CORPUS — read-only public
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.validation_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corpus_public_read"
  ON public.validation_corpus FOR SELECT
  TO authenticated, anon
  USING (true);

-- Writes restricted to service role only (data import jobs).

-- ───────────────────────────────────────────────────────────────────────
-- POPULATION BENCHMARKS — read-only public
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.population_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmarks_public_read"
  ON public.population_benchmarks FOR SELECT
  TO authenticated, anon
  USING (true);

-- ───────────────────────────────────────────────────────────────────────
-- DONE
-- ───────────────────────────────────────────────────────────────────────
-- Security model summary:
--   - Each coach sees only their own coaches/athletes/races/checkins/predictions row
--   - Validation corpus + benchmarks are publicly readable (no PII in them)
--   - All sensitive operations (account deletion, corpus imports) go through
--     edge functions with service role privileges, not direct user access
--   - Anonymous users can read benchmarks for the free calculator tier
