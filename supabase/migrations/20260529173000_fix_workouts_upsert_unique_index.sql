-- STRIDE OS · Fix Strava workout upsert (partial-index ON CONFLICT bug)
-- ============================================================================
-- BUG: Both Edge Functions (strava-oauth-callback and strava-sync-activities)
-- import workouts with:
--
--     supabase.from('workouts').upsert(rows, {
--       onConflict: 'athlete_id,source,source_ref'
--     })
--
-- PostgREST turns that into:
--
--     INSERT INTO workouts (...) VALUES (...)
--     ON CONFLICT (athlete_id, source, source_ref) DO UPDATE SET ...
--
-- The only unique index on those columns was a PARTIAL index:
--
--     create unique index idx_workouts_source_ref
--       on public.workouts (athlete_id, source, source_ref)
--       where source_ref is not null;   -- <-- partial
--
-- PostgreSQL will NOT infer a partial unique index from a bare column list:
-- the ON CONFLICT target must also repeat the index's WHERE predicate, which
-- PostgREST's `onConflict` cannot emit. Result: every Strava import threw
--
--     42P10: there is no unique or exclusion constraint matching the
--            ON CONFLICT specification
--
-- i.e. Strava import + "Sync Now" were broken at runtime.
--
-- FIX: Replace the partial unique index with a FULL unique index on the same
-- columns. PostgreSQL treats NULLs as DISTINCT by default, so coach manual
-- entries (source='coach_entry', source_ref IS NULL) still never collide with
-- each other — behaviour is identical to the partial index for real data, but
-- now the index is inferable by ON CONFLICT and the upsert works.
--
-- Refs:
--   https://github.com/orgs/supabase/discussions/36532
--   https://betakuang.medium.com/why-postgresqls-on-conflict-cannot-find-my-partial-unique-index-552327b85e1
-- ============================================================================

drop index if exists public.idx_workouts_source_ref;

create unique index if not exists idx_workouts_source_ref
  on public.workouts (athlete_id, source, source_ref);
