-- STRIDE OS / CoachLab initial Supabase schema.
-- Run this once in Supabase SQL Editor or with `supabase db push`.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.try_numeric(value text)
returns numeric
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::numeric;
exception when others then
  return null;
end;
$$;

create or replace function public.try_int(value text)
returns integer
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::integer;
exception when others then
  return null;
end;
$$;

create or replace function public.try_date(value text)
returns date
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::date;
exception when others then
  return null;
end;
$$;

create or replace function public.try_timestamptz(value text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.parse_time_to_seconds(time_text text)
returns numeric
language plpgsql
immutable
as $$
declare
  parts text[];
  part_count integer;
begin
  if time_text is null or btrim(time_text) = '' then
    return null;
  end if;

  parts := string_to_array(btrim(time_text), ':');
  part_count := array_length(parts, 1);

  if part_count = 1 then
    return public.try_numeric(parts[1]);
  elsif part_count = 2 then
    return public.try_numeric(parts[1]) * 60 + public.try_numeric(parts[2]);
  elsif part_count = 3 then
    return public.try_numeric(parts[1]) * 3600
      + public.try_numeric(parts[2]) * 60
      + public.try_numeric(parts[3]);
  end if;

  return null;
exception when others then
  return null;
end;
$$;

create table public.event_distances (
  event text primary key,
  distance_m numeric not null check (distance_m > 0),
  event_family text not null check (event_family in ('Sprint', 'Hybrid', 'Middle', 'Distance', 'Other')),
  sort_order integer not null
);

insert into public.event_distances (event, distance_m, event_family, sort_order) values
  ('100m', 100, 'Sprint', 10),
  ('200m', 200, 'Sprint', 20),
  ('400m', 400, 'Sprint', 30),
  ('800m', 800, 'Hybrid', 40),
  ('1500m', 1500, 'Middle', 45),
  ('1600m', 1600, 'Middle', 50),
  ('Mile', 1609, 'Middle', 60),
  ('3000m', 3000, 'Distance', 65),
  ('3200m', 3200, 'Distance', 70),
  ('2 Mile', 3218, 'Distance', 80),
  ('5K', 5000, 'Distance', 90),
  ('10K', 10000, 'Distance', 100),
  ('Half Marathon', 21097.5, 'Distance', 110),
  ('Marathon', 42195, 'Distance', 120)
on conflict (event) do nothing;

create or replace function public.event_distance_m(event_name text)
returns numeric
language sql
stable
as $$
  select ed.distance_m
  from public.event_distances ed
  where ed.event = event_name
  limit 1;
$$;

create table public.coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  team_name text,
  team_color text,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'individual', 'program', 'research')),
  research_opt_in boolean not null default false,
  research_opt_in_at timestamptz,
  terms_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_ref text,

  display_name text not null,
  external_id text,

  birth_year integer,
  age_years integer check (age_years is null or age_years between 0 and 120),
  grade text,
  sex text check (sex is null or sex in ('M', 'F', 'X')),

  training_age_years numeric check (training_age_years is null or training_age_years >= 0),
  weekly_mileage_avg numeric check (weekly_mileage_avg is null or weekly_mileage_avg >= 0),
  primary_event text,
  secondary_events text[] not null default '{}',

  race_distance text,
  race_distance_m numeric,
  race_time text,
  race_time_sec numeric,
  race_date date,
  race_location text,
  race_start_time text,
  race_weather jsonb,

  guardrail_setting text not null default 'auto',

  parental_consent_received boolean not null default false,
  parental_consent_at timestamptz,
  research_opt_out boolean not null default false,

  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index idx_athletes_coach_client_ref
  on public.athletes (coach_id, client_ref)
  where client_ref is not null;
create index idx_athletes_coach_id on public.athletes (coach_id);
create index idx_athletes_deleted_at on public.athletes (deleted_at);

create table public.races (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  source_ref text,

  event text not null,
  distance_m numeric not null check (distance_m > 0),
  time_text text not null,
  time_sec numeric not null check (time_sec > 0),

  race_date date,
  race_location text,
  race_start_time text,
  race_meet_name text,
  race_level text,
  placement integer,

  temperature_f numeric,
  humidity_pct numeric,
  dew_point_f numeric,
  wind_mph numeric,
  altitude_ft numeric,
  aqi integer,
  weather_source text,
  raw_weather jsonb,

  reliability text not null default 'high'
    check (reliability in ('high', 'moderate', 'low', 'excluded')),
  reliability_notes text,

  coach_notes text,
  taper_status text,
  execution_notes text,

  source text not null default 'coach_entry',
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_races_athlete_id on public.races (athlete_id);
create index idx_races_coach_id on public.races (coach_id);
create index idx_races_race_date on public.races (race_date desc);
create unique index idx_races_source_ref
  on public.races (athlete_id, source, source_ref)
  where source_ref is not null;

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,

  checkin_date date not null,

  recovery_rating integer check (recovery_rating between 1 and 10),
  fatigue_rating integer check (fatigue_rating between 1 and 10),
  motivation_rating integer check (motivation_rating between 1 and 10),
  soreness_rating integer check (soreness_rating between 1 and 10),

  sleep_hours numeric check (sleep_hours is null or sleep_hours >= 0),
  sleep_quality integer check (sleep_quality between 1 and 10),

  resting_hr integer,
  hrv_rmssd integer,

  session_description text,
  session_intensity integer check (session_intensity between 1 and 10),
  session_duration_min numeric check (session_duration_min is null or session_duration_min >= 0),

  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (athlete_id, checkin_date)
);

create index idx_daily_checkins_coach_date on public.daily_checkins (coach_id, checkin_date desc);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,

  input_distance_m numeric not null,
  input_time_sec numeric not null,
  input_race_id uuid references public.races(id),

  target_distance_m numeric not null,

  prediction_riegel_sec numeric,
  prediction_cameron_sec numeric,
  prediction_vdot_sec numeric,
  prediction_vickers_sec numeric,
  prediction_purdy_sec numeric,
  prediction_ensemble_sec numeric,
  ci_95_low_sec numeric,
  ci_95_high_sec numeric,
  agreement_score numeric,
  confidence_label text,

  actual_race_id uuid references public.races(id),
  actual_time_sec numeric,
  prediction_error_sec numeric,
  prediction_error_pct numeric,

  metadata jsonb not null default '{}'::jsonb,
  predicted_at timestamptz not null default now(),
  validated_at timestamptz
);

create index idx_predictions_athlete_predicted_at on public.predictions (athlete_id, predicted_at desc);
create index idx_predictions_coach_predicted_at on public.predictions (coach_id, predicted_at desc);

create table public.validation_corpus (
  id uuid primary key default gen_random_uuid(),
  athlete_name text,
  school_or_country text,
  age_group text,
  grade text,
  classification text,
  division text,
  event text not null,
  time_mark text,
  time_sec numeric,
  place integer,
  sex text,
  meet_level text,
  meet_name text,
  meet_year integer,
  data_source text not null,
  reliability text not null default 'high',
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

create index idx_corpus_event_sex on public.validation_corpus (event, sex);
create index idx_corpus_age_event on public.validation_corpus (age_group, event);

create table public.access_log (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.coaches(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create index idx_access_log_coach_occurred_at on public.access_log (coach_id, occurred_at desc);

create table public.local_imports (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  source_key text not null default 'strideOS_v5',
  payload jsonb not null,
  imported_athlete_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_local_imports_coach_created_at on public.local_imports (coach_id, created_at desc);

create trigger coaches_set_updated_at
before update on public.coaches
for each row execute function public.set_updated_at();

create trigger athletes_set_updated_at
before update on public.athletes
for each row execute function public.set_updated_at();

create trigger races_set_updated_at
before update on public.races
for each row execute function public.set_updated_at();

create trigger daily_checkins_set_updated_at
before update on public.daily_checkins
for each row execute function public.set_updated_at();

alter table public.event_distances enable row level security;
alter table public.coaches enable row level security;
alter table public.athletes enable row level security;
alter table public.races enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.predictions enable row level security;
alter table public.validation_corpus enable row level security;
alter table public.access_log enable row level security;
alter table public.local_imports enable row level security;

create policy "Anyone can read event distances"
  on public.event_distances for select
  using (true);

create policy "Coaches can create own profile"
  on public.coaches for insert
  with check (auth.uid() = id);

create policy "Coaches can read own profile"
  on public.coaches for select
  using (auth.uid() = id);

create policy "Coaches can update own profile"
  on public.coaches for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Coaches can manage own athletes"
  on public.athletes for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Coaches can manage own races"
  on public.races for all
  using (
    auth.uid() = coach_id
    and exists (
      select 1
      from public.athletes a
      where a.id = races.athlete_id
        and a.coach_id = auth.uid()
    )
  )
  with check (
    auth.uid() = coach_id
    and exists (
      select 1
      from public.athletes a
      where a.id = races.athlete_id
        and a.coach_id = auth.uid()
    )
  );

create policy "Coaches can manage own checkins"
  on public.daily_checkins for all
  using (
    auth.uid() = coach_id
    and exists (
      select 1
      from public.athletes a
      where a.id = daily_checkins.athlete_id
        and a.coach_id = auth.uid()
    )
  )
  with check (
    auth.uid() = coach_id
    and exists (
      select 1
      from public.athletes a
      where a.id = daily_checkins.athlete_id
        and a.coach_id = auth.uid()
    )
  );

create policy "Coaches can manage own predictions"
  on public.predictions for all
  using (
    auth.uid() = coach_id
    and exists (
      select 1
      from public.athletes a
      where a.id = predictions.athlete_id
        and a.coach_id = auth.uid()
    )
  )
  with check (
    auth.uid() = coach_id
    and exists (
      select 1
      from public.athletes a
      where a.id = predictions.athlete_id
        and a.coach_id = auth.uid()
    )
  );

create policy "Coaches can insert own access log entries"
  on public.access_log for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can read own access log entries"
  on public.access_log for select
  using (auth.uid() = coach_id);

create policy "Coaches can manage own import snapshots"
  on public.local_imports for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create or replace function public.upsert_coach_profile(
  display_name text,
  team_name text default null,
  team_color text default null,
  terms_accepted boolean default false,
  privacy_accepted boolean default false,
  research_opt_in boolean default false
)
returns public.coaches
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  jwt_email text := coalesce(auth.jwt() ->> 'email', uid::text);
  row_out public.coaches;
begin
  if uid is null then
    raise exception 'Must be signed in to create a coach profile';
  end if;

  if not terms_accepted or not privacy_accepted then
    raise exception 'Terms and privacy policy must be accepted';
  end if;

  insert into public.coaches (
    id,
    email,
    display_name,
    team_name,
    team_color,
    research_opt_in,
    research_opt_in_at,
    terms_accepted_at,
    privacy_accepted_at
  ) values (
    uid,
    jwt_email,
    nullif(btrim(display_name), ''),
    nullif(btrim(team_name), ''),
    nullif(btrim(team_color), ''),
    research_opt_in,
    case when research_opt_in then now() else null end,
    now(),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    team_name = excluded.team_name,
    team_color = excluded.team_color,
    research_opt_in = excluded.research_opt_in,
    research_opt_in_at = case
      when excluded.research_opt_in and public.coaches.research_opt_in_at is null then now()
      when not excluded.research_opt_in then null
      else public.coaches.research_opt_in_at
    end
  returning * into row_out;

  return row_out;
end;
$$;

create or replace function public.import_local_athlete(local_athlete jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  athlete_uuid uuid;
  pr_event text;
  pr_time text;
  primary_event text := nullif(local_athlete ->> 'raceDistance', '');
  primary_time text := nullif(local_athlete ->> 'raceTime', '');
  primary_distance numeric := public.event_distance_m(primary_event);
  primary_time_sec numeric := public.parse_time_to_seconds(primary_time);
begin
  if uid is null then
    raise exception 'Must be signed in to import local athlete data';
  end if;

  if not exists (select 1 from public.coaches where id = uid) then
    raise exception 'Create a coach profile before importing athlete data';
  end if;

  insert into public.athletes (
    coach_id,
    client_ref,
    display_name,
    age_years,
    grade,
    sex,
    training_age_years,
    weekly_mileage_avg,
    primary_event,
    secondary_events,
    race_distance,
    race_distance_m,
    race_time,
    race_time_sec,
    race_date,
    race_location,
    race_start_time,
    race_weather,
    guardrail_setting,
    metadata,
    created_at,
    updated_at
  ) values (
    uid,
    nullif(local_athlete ->> 'id', ''),
    coalesce(nullif(local_athlete ->> 'name', ''), 'Imported athlete'),
    public.try_int(local_athlete ->> 'age'),
    nullif(local_athlete ->> 'grade', ''),
    nullif(local_athlete ->> 'sex', ''),
    coalesce(public.try_numeric(local_athlete ->> 'trainingAge'), 0),
    public.try_numeric(local_athlete ->> 'weeklyMileage'),
    nullif(local_athlete ->> 'primaryEvent', ''),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(local_athlete -> 'secondaryEvents', '[]'::jsonb))),
      '{}'::text[]
    ),
    primary_event,
    primary_distance,
    primary_time,
    primary_time_sec,
    public.try_date(local_athlete ->> 'raceDate'),
    nullif(local_athlete ->> 'raceLocation', ''),
    nullif(local_athlete ->> 'raceStartTime', ''),
    nullif(local_athlete -> 'raceWeather', 'null'::jsonb),
    coalesce(nullif(local_athlete ->> 'guardrail', ''), 'auto'),
    jsonb_build_object('local_storage_payload', local_athlete),
    coalesce(public.try_timestamptz(local_athlete ->> 'createdAt'), now()),
    coalesce(public.try_timestamptz(local_athlete ->> 'updatedAt'), now())
  )
  on conflict (coach_id, client_ref) where client_ref is not null do update set
    display_name = excluded.display_name,
    age_years = excluded.age_years,
    grade = excluded.grade,
    sex = excluded.sex,
    training_age_years = excluded.training_age_years,
    weekly_mileage_avg = excluded.weekly_mileage_avg,
    primary_event = excluded.primary_event,
    secondary_events = excluded.secondary_events,
    race_distance = excluded.race_distance,
    race_distance_m = excluded.race_distance_m,
    race_time = excluded.race_time,
    race_time_sec = excluded.race_time_sec,
    race_date = excluded.race_date,
    race_location = excluded.race_location,
    race_start_time = excluded.race_start_time,
    race_weather = excluded.race_weather,
    guardrail_setting = excluded.guardrail_setting,
    metadata = excluded.metadata
  returning id into athlete_uuid;

  if primary_event is not null and primary_time_sec is not null and primary_distance is not null then
    insert into public.races (
      athlete_id,
      coach_id,
      source_ref,
      event,
      distance_m,
      time_text,
      time_sec,
      race_date,
      race_location,
      race_start_time,
      raw_weather,
      source,
      metadata
    ) values (
      athlete_uuid,
      uid,
      'primary:' || primary_event,
      primary_event,
      primary_distance,
      primary_time,
      primary_time_sec,
      public.try_date(local_athlete ->> 'raceDate'),
      nullif(local_athlete ->> 'raceLocation', ''),
      nullif(local_athlete ->> 'raceStartTime', ''),
      nullif(local_athlete -> 'raceWeather', 'null'::jsonb),
      'local_storage_import',
      jsonb_build_object('primary', true)
    )
    on conflict (athlete_id, source, source_ref) where source_ref is not null do update set
      time_text = excluded.time_text,
      time_sec = excluded.time_sec,
      race_date = excluded.race_date,
      race_location = excluded.race_location,
      race_start_time = excluded.race_start_time,
      raw_weather = excluded.raw_weather,
      metadata = excluded.metadata;
  end if;

  for pr_event, pr_time in
    select key, value
    from jsonb_each_text(coalesce(local_athlete -> 'additionalPRs', '{}'::jsonb))
  loop
    if public.parse_time_to_seconds(pr_time) is not null
       and public.event_distance_m(pr_event) is not null
       and pr_event is distinct from primary_event then
      insert into public.races (
        athlete_id,
        coach_id,
        source_ref,
        event,
        distance_m,
        time_text,
        time_sec,
        source,
        metadata
      ) values (
        athlete_uuid,
        uid,
        'additional:' || pr_event,
        pr_event,
        public.event_distance_m(pr_event),
        pr_time,
        public.parse_time_to_seconds(pr_time),
        'local_storage_import',
        jsonb_build_object('primary', false)
      )
      on conflict (athlete_id, source, source_ref) where source_ref is not null do update set
        time_text = excluded.time_text,
        time_sec = excluded.time_sec,
        metadata = excluded.metadata;
    end if;
  end loop;

  return athlete_uuid;
end;
$$;

create or replace function public.import_local_storage(payload jsonb, source_key text default 'strideOS_v5')
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  batch_id uuid;
  athlete_payload jsonb;
  imported_count integer := 0;
begin
  if uid is null then
    raise exception 'Must be signed in to import local storage data';
  end if;

  if not exists (select 1 from public.coaches where id = uid) then
    raise exception 'Create a coach profile before importing local storage data';
  end if;

  insert into public.local_imports (coach_id, source_key, payload)
  values (uid, source_key, payload)
  returning id into batch_id;

  for athlete_payload in
    select value
    from jsonb_array_elements(coalesce(payload -> 'athletes', '[]'::jsonb))
  loop
    perform public.import_local_athlete(athlete_payload);
    imported_count := imported_count + 1;
  end loop;

  update public.local_imports
  set imported_athlete_count = imported_count
  where id = batch_id;

  return jsonb_build_object(
    'batch_id', batch_id,
    'imported_athlete_count', imported_count
  );
end;
$$;

create or replace function public.export_coach_data()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'coach', (
      select to_jsonb(c)
      from public.coaches c
      where c.id = auth.uid()
    ),
    'athletes', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at)
      from public.athletes a
      where a.coach_id = auth.uid()
    ), '[]'::jsonb),
    'races', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.race_date nulls last, r.created_at)
      from public.races r
      where r.coach_id = auth.uid()
    ), '[]'::jsonb),
    'daily_checkins', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.checkin_date)
      from public.daily_checkins d
      where d.coach_id = auth.uid()
    ), '[]'::jsonb),
    'predictions', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.predicted_at)
      from public.predictions p
      where p.coach_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

create or replace function public.request_account_deletion()
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Must be signed in to request account deletion';
  end if;

  update public.coaches set deleted_at = now() where id = uid;
  update public.athletes set deleted_at = now() where coach_id = uid;
  update public.races set deleted_at = now() where coach_id = uid;

  return true;
end;
$$;
