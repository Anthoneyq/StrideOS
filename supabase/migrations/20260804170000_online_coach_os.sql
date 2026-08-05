-- STRIDE OS · Online Coach OS
-- Check-ins are athlete-reported context, not readiness scores.
-- Program assignments continue to use public.workouts so planned and completed
-- fields retain one existing source of truth.

create table if not exists public.athlete_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_ref text not null check (char_length(client_ref) between 1 and 180),
  week_of date not null,
  energy integer not null check (energy between 1 and 5),
  soreness integer not null check (soreness between 1 and 5),
  confidence integer not null check (confidence between 1 and 5),
  sleep_hours numeric check (sleep_hours is null or (sleep_hours between 0 and 24)),
  athlete_note text check (athlete_note is null or char_length(athlete_note) <= 2000),
  coach_response text check (coach_response is null or char_length(coach_response) <= 2000),
  submitted_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (athlete_id, client_ref)
);

create index if not exists idx_athlete_checkins_coach_submitted
  on public.athlete_checkins (coach_id, submitted_at desc);

create trigger athlete_checkins_set_updated_at
  before update on public.athlete_checkins
  for each row execute function public.set_updated_at();

alter table public.athlete_checkins enable row level security;

create policy "Coaches read own athlete checkins"
  on public.athlete_checkins for select
  using (auth.uid() = coach_id);

create policy "Coaches respond to own athlete checkins"
  on public.athlete_checkins for update
  using (auth.uid() = coach_id)
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from public.athletes a
      where a.id = athlete_checkins.athlete_id
        and a.coach_id = auth.uid()
    )
  );

create policy "Athletes read own checkins"
  on public.athlete_checkins for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_checkins.athlete_id
        and a.athlete_user_id = auth.uid()
    )
  );

-- Security-definer submission keeps the coach relationship authoritative and
-- prevents an athlete client from writing coach_response/responded_at.
create or replace function public.submit_athlete_checkin(
  athlete_row_id uuid,
  checkin_client_ref text,
  checkin_week_of date,
  reported_energy integer,
  reported_soreness integer,
  reported_confidence integer,
  reported_sleep_hours numeric default null,
  reported_note text default null
)
returns public.athlete_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  result public.athlete_checkins;
begin
  select a.coach_id into owner_id
  from public.athletes a
  where a.id = athlete_row_id
    and a.athlete_user_id = auth.uid()
    and a.deleted_at is null;

  if owner_id is null then
    raise exception 'athlete profile is not linked to this account';
  end if;

  if reported_energy not between 1 and 5
     or reported_soreness not between 1 and 5
     or reported_confidence not between 1 and 5
     or (reported_sleep_hours is not null and reported_sleep_hours not between 0 and 24) then
    raise exception 'invalid athlete-reported check-in values';
  end if;

  insert into public.athlete_checkins (
    athlete_id, coach_id, client_ref, week_of,
    energy, soreness, confidence, sleep_hours, athlete_note
  )
  values (
    athlete_row_id, owner_id, left(checkin_client_ref, 180), checkin_week_of,
    reported_energy, reported_soreness, reported_confidence,
    reported_sleep_hours, left(reported_note, 2000)
  )
  on conflict (athlete_id, client_ref) do update set
    week_of = excluded.week_of,
    energy = excluded.energy,
    soreness = excluded.soreness,
    confidence = excluded.confidence,
    sleep_hours = excluded.sleep_hours,
    athlete_note = excluded.athlete_note,
    submitted_at = now(),
    coach_response = null,
    responded_at = null
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.submit_athlete_checkin(uuid,text,date,integer,integer,integer,numeric,text) from public;
grant execute on function public.submit_athlete_checkin(uuid,text,date,integer,integer,integer,numeric,text) to authenticated;

create table if not exists public.training_plan_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_ref text not null check (char_length(client_ref) between 1 and 180),
  name text not null check (char_length(name) between 1 and 120),
  weeks integer not null check (weeks between 1 and 52),
  sessions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, client_ref)
);

create trigger training_plan_templates_set_updated_at
  before update on public.training_plan_templates
  for each row execute function public.set_updated_at();

alter table public.training_plan_templates enable row level security;

create policy "Coaches manage own training plan templates"
  on public.training_plan_templates for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create table if not exists public.race_plans (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_ref text not null check (char_length(client_ref) between 1 and 180),
  race_name text not null check (char_length(race_name) between 1 and 120),
  race_date date not null,
  distance_m numeric not null check (distance_m > 0),
  course_name text,
  course_adjustment_sec integer not null default 0
    check (course_adjustment_sec between -1800 and 7200),
  segment_text text check (segment_text is null or char_length(segment_text) <= 4000),
  carbs_per_hour numeric check (carbs_per_hour is null or carbs_per_hour between 0 and 200),
  fluid_oz_per_hour numeric check (fluid_oz_per_hour is null or fluid_oz_per_hour between 0 and 100),
  sodium_mg_per_hour numeric check (sodium_mg_per_hour is null or sodium_mg_per_hour between 0 and 3000),
  coach_notes text check (coach_notes is null or char_length(coach_notes) <= 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, client_ref)
);

create index if not exists idx_race_plans_coach_date
  on public.race_plans (coach_id, race_date);

create trigger race_plans_set_updated_at
  before update on public.race_plans
  for each row execute function public.set_updated_at();

alter table public.race_plans enable row level security;

create policy "Coaches manage own athlete race plans"
  on public.race_plans for all
  using (auth.uid() = coach_id)
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from public.athletes a
      where a.id = race_plans.athlete_id
        and a.coach_id = auth.uid()
    )
  );

create policy "Athletes read own race plans"
  on public.race_plans for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = race_plans.athlete_id
        and a.athlete_user_id = auth.uid()
    )
  );
