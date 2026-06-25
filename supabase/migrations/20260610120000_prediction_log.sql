-- ══════════════════════════════════════════════════════════════════════
-- PREDICTION LOG — prediction-vs-outcome calibration dataset
-- Every time a coach saves an athlete with a race anchor, the client logs
-- the displayed, source-excluded forecast set here (engine/source-versioned). When the athlete
-- later races one of the predicted distances, the logged forecast can be
-- compared against the actual result (in `races`) to measure and recalibrate
-- engine accuracy. Write-once: clients insert and read, never update/delete.
-- NOTE: doc-verified only (no live DB in dev loop) — apply to a Supabase
-- staging branch before production.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.parse_time_to_seconds(time_text text)
returns numeric
language plpgsql
immutable
as $$
declare
  parts text[];
  part_count integer;
  h numeric;
  m numeric;
  s numeric;
begin
  if time_text is null or btrim(time_text) = '' then
    return null;
  end if;

  parts := string_to_array(btrim(time_text), ':');
  part_count := array_length(parts, 1);

  if part_count = 1 then
    s := public.try_numeric(parts[1]);
    if s is null or s <= 0 then
      return null;
    end if;
    return s;
  elsif part_count = 2 then
    m := public.try_numeric(parts[1]);
    s := public.try_numeric(parts[2]);
    if m is null or s is null or m < 0 or s < 0 or s >= 60 then
      return null;
    end if;
    return m * 60 + s;
  elsif part_count = 3 then
    h := public.try_numeric(parts[1]);
    m := public.try_numeric(parts[2]);
    s := public.try_numeric(parts[3]);
    if h is null or m is null or s is null or h < 0 or m < 0 or s < 0 or m >= 60 or s >= 60 then
      return null;
    end if;
    return h * 3600 + m * 60 + s;
  end if;

  return null;
exception when others then
  return null;
end;
$$;

insert into public.event_distances (event, distance_m, event_family, sort_order) values
  ('100m', 100, 'Sprint', 10),
  ('200m', 200, 'Sprint', 20),
  ('400m', 400, 'Sprint', 30),
  ('800m', 800, 'Hybrid', 40),
  ('1500m', 1500, 'Middle', 45),
  ('1600m', 1600, 'Middle', 50),
  ('Mile', 1609, 'Middle', 60),
  ('3000m', 3000, 'Middle', 65),
  ('3200m', 3200, 'Middle', 70),
  ('2 Mile', 3218, 'Middle', 80),
  ('5K', 5000, 'Distance', 90),
  ('8K', 8000, 'Distance', 95),
  ('10K', 10000, 'Distance', 100),
  ('Half Marathon', 21097, 'Distance', 110),
  ('Marathon', 42195, 'Distance', 120)
on conflict (event) do update set
  distance_m = excluded.distance_m,
  event_family = excluded.event_family,
  sort_order = excluded.sort_order;

create table if not exists public.prediction_log (
  id                 uuid primary key default gen_random_uuid(),
  coach_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  athlete_client_ref text not null,
  engine_version     text not null default 'ensemble-2026-06-20-source-excluded',
  source_version     text not null default 'sources-2026-06-20-norwegian-method-applied',
  anchor_event       text,
  anchor_dist_m      integer not null check (anchor_dist_m > 0),
  anchor_sec         numeric not null check (anchor_sec > 0),
  weekly_mileage     integer,
  age_years          integer,
  -- [{distM, label, likelySec, aggressiveSec, conservativeSec, confidence,
  --   rangeLowSec, rangeHighSec, rangeMethod, modelLowSec, modelHighSec, modelAgreement,
  --   anchorDistM, anchorEvent, anchorSec, anchorSource, anchorFreshness,
  --   targetDomain, reasons}, ...]
  predictions        jsonb not null,
  source_provenance  jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

alter table public.prediction_log
  add column if not exists source_version text not null default 'sources-2026-06-20-norwegian-method-applied';

alter table public.prediction_log
  add column if not exists source_provenance jsonb not null default '{}'::jsonb;

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
