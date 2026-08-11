-- ============================================================================
-- RACE HISTORY — make the races upsert reachable from the client
--
-- The Coach Brief's "behind their best" signal needs the SEQUENCE of an
-- athlete's results, not their best one. Until now the only writer to
-- public.races was the local-storage import RPC, which mirrors the PR fields
-- under fixed source_refs ('primary:<event>' / 'additional:<event>') and
-- OVERWRITES them on conflict. That is correct for a PR mirror and useless as
-- history: one row per event, always the latest best, and a PR by definition
-- never moves backwards. Meet results that were slower than a standing PR were
-- shown in the import preview and then discarded entirely.
--
-- Meet apply now writes every dated matched result as its own row under
-- source='meet_import', source_ref='meet:<date>:<event>:<time>'. Re-importing
-- the same meet upserts the same rows instead of duplicating them.
--
-- That upsert requires an ON CONFLICT target PostgREST can infer, and races
-- carries the same partial-index defect that broke the Strava workout import in
-- 20260529173000:
--
--     create unique index idx_races_source_ref
--       on public.races (athlete_id, source, source_ref)
--       where source_ref is not null;   -- <-- partial
--
-- PostgreSQL will not infer a partial unique index from a bare column list, and
-- PostgREST's `onConflict` cannot emit the WHERE predicate, so the insert would
-- fail at runtime with:
--
--     42P10: there is no unique or exclusion constraint matching the
--            ON CONFLICT specification
--
-- FIX: same as the workouts fix — a FULL unique index on the same columns.
-- PostgreSQL treats NULLs as DISTINCT by default, so rows with a NULL
-- source_ref still never collide with each other. Behaviour is identical for
-- real data; the difference is that ON CONFLICT can now infer it.
-- ============================================================================

drop index if exists public.idx_races_source_ref;

create unique index if not exists idx_races_source_ref
  on public.races (athlete_id, source, source_ref);

-- History reads are always "this athlete, ordered by date".
create index if not exists idx_races_athlete_date
  on public.races (athlete_id, race_date desc)
  where deleted_at is null;
