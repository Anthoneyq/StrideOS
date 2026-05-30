-- STRIDE OS workout log + scaffolding for athlete-owned accounts.
-- Phase 1: workouts table coach can write to per athlete.
-- Phase 2 prep: athlete_user_id on athletes so athletes can self-log later.
-- Phase 3 prep: strava_athlete_id + tokens so OAuth import has a home.

-- ============================================================
-- 1. WORKOUTS TABLE
-- ============================================================
-- One row per workout session. Coach-logged today; athlete-logged or
-- Strava-imported in later phases. The source column tracks origin.

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_ref text,

  -- WHEN
  workout_date date not null,
  workout_start_time text,           -- "06:30" optional

  -- WHAT WAS PRESCRIBED
  workout_type text not null
    check (workout_type in (
      'easy', 'long', 'steady', 'tempo', 'threshold',
      'critical_velocity', 'race_pace', 'vo2', 'speed', 'sprint',
      'recovery', 'rest', 'race', 'cross_training', 'strength', 'other'
    )),
  prescribed_distance_m numeric,
  prescribed_pace_sec_per_km numeric,
  prescribed_zone_label text,        -- e.g. "Threshold 93%"
  prescribed_notes text,             -- coach-written instructions

  -- WHAT HAPPENED
  total_distance_m numeric,
  total_duration_sec numeric,
  avg_pace_sec_per_km numeric,
  avg_hr_bpm integer,
  max_hr_bpm integer,
  perceived_effort integer check (perceived_effort is null or (perceived_effort between 1 and 10)),
  splits jsonb,                      -- array: [{rep_number, distance_m, time_sec, hr, notes}, ...]

  -- CONDITIONS
  weather jsonb,                     -- {tempF, humidity, wind_mph, ...}
  location text,

  -- COACH + ATHLETE NOTES
  coach_notes text,
  athlete_notes text,                -- exposed to athlete in Phase 2

  -- SOURCE TRACKING
  source text not null default 'coach_entry'
    check (source in ('coach_entry', 'athlete_entry', 'strava', 'garmin', 'manual_import')),
  source_ref text,                   -- e.g. strava activity id

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_workouts_athlete_id_date
  on public.workouts (athlete_id, workout_date desc)
  where deleted_at is null;
create index if not exists idx_workouts_coach_id
  on public.workouts (coach_id);
create unique index if not exists idx_workouts_source_ref
  on public.workouts (athlete_id, source, source_ref)
  where source_ref is not null;

-- Trigger to keep updated_at fresh.
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- Enable RLS and add policies.
alter table public.workouts enable row level security;

create policy "Coaches can read own athletes' workouts"
  on public.workouts for select
  using (auth.uid() = coach_id);

create policy "Coaches can insert workouts for own athletes"
  on public.workouts for insert
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from public.athletes a
      where a.id = workouts.athlete_id and a.coach_id = auth.uid()
    )
  );

create policy "Coaches can update own athletes' workouts"
  on public.workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Coaches can delete own athletes' workouts"
  on public.workouts for delete
  using (auth.uid() = coach_id);

-- ============================================================
-- 2. ATHLETE-OWNED ACCOUNTS (Phase 2 scaffolding)
-- ============================================================
-- An athlete row can be linked to a real auth user once the athlete
-- accepts a coach invitation. Until then athlete_user_id is null.

alter table public.athletes
  add column if not exists athlete_user_id uuid references auth.users(id) on delete set null,
  add column if not exists invite_email text,
  add column if not exists invite_sent_at timestamptz,
  add column if not exists invite_accepted_at timestamptz;

create unique index if not exists idx_athletes_athlete_user_id
  on public.athletes (athlete_user_id)
  where athlete_user_id is not null;

-- Add policy so a linked athlete user can SELECT their own row.
-- (Coach still owns + manages everything via existing policies.)
create policy "Athletes can read own athlete profile"
  on public.athletes for select
  using (auth.uid() = athlete_user_id);

create policy "Athletes can read own workouts"
  on public.workouts for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = workouts.athlete_id
        and a.athlete_user_id = auth.uid()
    )
  );

create policy "Athletes can insert own workouts"
  on public.workouts for insert
  with check (
    exists (
      select 1 from public.athletes a
      where a.id = workouts.athlete_id
        and a.athlete_user_id = auth.uid()
    )
    and source in ('athlete_entry', 'strava', 'garmin')
  );

create policy "Athletes can update own logged workouts"
  on public.workouts for update
  using (
    exists (
      select 1 from public.athletes a
      where a.id = workouts.athlete_id
        and a.athlete_user_id = auth.uid()
    )
    and source in ('athlete_entry', 'strava', 'garmin')
  );

-- ============================================================
-- 3. STRAVA TOKENS (Phase 3 scaffolding)
-- ============================================================
-- Each linked athlete can authorize Strava. Tokens are encrypted at
-- rest via Supabase's pgsodium / vault — for now we store raw and
-- protect via RLS (service role bypasses).

create table if not exists public.athlete_strava (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  strava_athlete_id bigint not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger athlete_strava_set_updated_at
  before update on public.athlete_strava
  for each row execute function public.set_updated_at();

alter table public.athlete_strava enable row level security;

-- Coach can see WHETHER an athlete is connected (no token access).
create policy "Coaches can see own athletes Strava link state"
  on public.athlete_strava for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_strava.athlete_id
        and a.coach_id = auth.uid()
    )
  );

-- Linked athlete can manage their own Strava connection.
create policy "Athletes manage own Strava connection"
  on public.athlete_strava for all
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_strava.athlete_id
        and a.athlete_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_strava.athlete_id
        and a.athlete_user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. RPC: link an invited athlete account to an athlete row
-- ============================================================
-- Called by the auth post-signup hook (or manually after magic-link
-- callback). Uses the athlete's invite_email and current auth user
-- email match to safely tie the records together.

create or replace function public.link_athlete_user(
  athlete_row_id uuid
)
returns public.athletes
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  invite_email text;
  result public.athletes;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to accept athlete invite';
  end if;

  select email into current_email from auth.users where id = auth.uid();
  select a.invite_email into invite_email from public.athletes a
    where a.id = athlete_row_id;

  if invite_email is null then
    raise exception 'no invite pending for this athlete';
  end if;

  if lower(current_email) != lower(invite_email) then
    raise exception 'signed-in email does not match invitation email';
  end if;

  update public.athletes
  set athlete_user_id = auth.uid(),
      invite_accepted_at = coalesce(invite_accepted_at, now()),
      updated_at = now()
  where id = athlete_row_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.link_athlete_user(uuid) to authenticated;
