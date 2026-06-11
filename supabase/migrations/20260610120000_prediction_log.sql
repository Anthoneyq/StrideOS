-- ══════════════════════════════════════════════════════════════════════
-- PREDICTION LOG — prediction-vs-outcome calibration dataset
-- Every time a coach saves an athlete with a race anchor, the client logs
-- the ensemble's full forecast set here (engine-versioned). When the athlete
-- later races one of the predicted distances, the logged forecast can be
-- compared against the actual result (in `races`) to measure and recalibrate
-- engine accuracy. Write-once: clients insert and read, never update/delete.
-- NOTE: doc-verified only (no live DB in dev loop) — apply to a Supabase
-- staging branch before production.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.prediction_log (
  id                 uuid primary key default gen_random_uuid(),
  coach_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  athlete_client_ref text not null,
  engine_version     text not null default 'ensemble-2026-06-10',
  anchor_event       text,
  anchor_dist_m      integer not null check (anchor_dist_m > 0),
  anchor_sec         numeric not null check (anchor_sec > 0),
  weekly_mileage     integer,
  age_years          integer,
  -- [{distM, likelySec, ci95Low, ci95High, confidence}, ...]
  predictions        jsonb not null,
  created_at         timestamptz not null default now()
);

alter table public.prediction_log enable row level security;

create policy "coach inserts own prediction logs"
  on public.prediction_log for insert
  with check (coach_id = auth.uid());

create policy "coach reads own prediction logs"
  on public.prediction_log for select
  using (coach_id = auth.uid());

-- No update/delete policies: the log is append-only by design.

create index if not exists prediction_log_coach_athlete_idx
  on public.prediction_log (coach_id, athlete_client_ref, created_at desc);
