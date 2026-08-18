-- STRIDE OS · pre/post workout athlete reports
-- These rows are athlete-reported context. They are not readiness scores,
-- diagnoses, injury predictions, or automatic training prescriptions.

create table if not exists public.athlete_session_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_ref text not null check (char_length(client_ref) between 1 and 180),
  session_date date not null,

  -- PRE-WORKOUT REPORT
  sleep_quality integer not null check (sleep_quality between 1 and 5),
  training_readiness integer not null check (training_readiness between 1 and 5),
  total_stress integer not null check (total_stress between 1 and 5),
  pre_health_status text not null
    check (pre_health_status in ('no', 'unsure', 'yes')),
  pre_concern_type text
    check (pre_concern_type is null or pre_concern_type in ('pain_injury', 'illness', 'both', 'other')),
  pre_note text check (pre_note is null or char_length(pre_note) <= 1000),
  pre_submitted_at timestamptz not null default now(),

  -- POST-WORKOUT REPORT
  whole_session_effort integer
    check (whole_session_effort is null or whole_session_effort between 1 and 5),
  expectation_outcome integer
    check (expectation_outcome is null or expectation_outcome between 1 and 5),
  post_health_status text
    check (post_health_status is null or post_health_status in ('no', 'unsure', 'yes')),
  post_note text check (post_note is null or char_length(post_note) <= 1000),
  post_submitted_at timestamptz,

  coach_response text check (coach_response is null or char_length(coach_response) <= 2000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, client_ref),
  check (
    (post_submitted_at is null and whole_session_effort is null and expectation_outcome is null and post_health_status is null)
    or
    (post_submitted_at is not null and whole_session_effort is not null and expectation_outcome is not null and post_health_status is not null)
  )
);

create index if not exists idx_athlete_session_checkins_coach_date
  on public.athlete_session_checkins (coach_id, session_date desc, pre_submitted_at desc);

create index if not exists idx_athlete_session_checkins_athlete_open
  on public.athlete_session_checkins (athlete_id, pre_submitted_at desc)
  where post_submitted_at is null;

create trigger athlete_session_checkins_set_updated_at
  before update on public.athlete_session_checkins
  for each row execute function public.set_updated_at();

alter table public.athlete_session_checkins enable row level security;

create policy "Coaches read own athlete session checkins"
  on public.athlete_session_checkins for select
  using (auth.uid() = coach_id);

create policy "Coaches respond to own athlete session checkins"
  on public.athlete_session_checkins for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Athletes read own session checkins"
  on public.athlete_session_checkins for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_session_checkins.athlete_id
        and a.athlete_user_id = auth.uid()
        and a.deleted_at is null
    )
  );

create or replace function public.submit_athlete_preworkout_checkin(
  athlete_row_id uuid,
  checkin_client_ref text,
  checkin_session_date date,
  reported_sleep_quality integer,
  reported_training_readiness integer,
  reported_total_stress integer,
  reported_health_status text,
  reported_concern_type text default null,
  reported_note text default null
)
returns public.athlete_session_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  result public.athlete_session_checkins;
begin
  select a.coach_id into owner_id
  from public.athletes a
  where a.id = athlete_row_id
    and a.athlete_user_id = auth.uid()
    and a.deleted_at is null;

  if owner_id is null then
    raise exception 'athlete profile is not linked to this account';
  end if;
  if reported_sleep_quality not between 1 and 5
     or reported_training_readiness not between 1 and 5
     or reported_total_stress not between 1 and 5
     or reported_health_status not in ('no', 'unsure', 'yes')
     or (reported_concern_type is not null and reported_concern_type not in ('pain_injury', 'illness', 'both', 'other')) then
    raise exception 'invalid athlete-reported pre-workout values';
  end if;

  insert into public.athlete_session_checkins (
    athlete_id, coach_id, client_ref, session_date,
    sleep_quality, training_readiness, total_stress,
    pre_health_status, pre_concern_type, pre_note
  ) values (
    athlete_row_id, owner_id, left(checkin_client_ref, 180), checkin_session_date,
    reported_sleep_quality, reported_training_readiness, reported_total_stress,
    reported_health_status, reported_concern_type, left(reported_note, 1000)
  )
  on conflict (athlete_id, client_ref) do update set
    session_date = excluded.session_date,
    sleep_quality = excluded.sleep_quality,
    training_readiness = excluded.training_readiness,
    total_stress = excluded.total_stress,
    pre_health_status = excluded.pre_health_status,
    pre_concern_type = excluded.pre_concern_type,
    pre_note = excluded.pre_note,
    pre_submitted_at = now(),
    coach_response = null,
    responded_at = null
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.submit_athlete_preworkout_checkin(uuid,text,date,integer,integer,integer,text,text,text) from public;
grant execute on function public.submit_athlete_preworkout_checkin(uuid,text,date,integer,integer,integer,text,text,text) to authenticated;

create or replace function public.submit_athlete_postworkout_checkin(
  checkin_client_ref text,
  reported_whole_session_effort integer,
  reported_expectation_outcome integer,
  reported_health_status text,
  reported_note text default null
)
returns public.athlete_session_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.athlete_session_checkins;
begin
  if reported_whole_session_effort not between 1 and 5
     or reported_expectation_outcome not between 1 and 5
     or reported_health_status not in ('no', 'unsure', 'yes') then
    raise exception 'invalid athlete-reported post-workout values';
  end if;

  update public.athlete_session_checkins c
  set whole_session_effort = reported_whole_session_effort,
      expectation_outcome = reported_expectation_outcome,
      post_health_status = reported_health_status,
      post_note = left(reported_note, 1000),
      post_submitted_at = now(),
      coach_response = null,
      responded_at = null
  where c.client_ref = left(checkin_client_ref, 180)
    and exists (
      select 1 from public.athletes a
      where a.id = c.athlete_id
        and a.athlete_user_id = auth.uid()
        and a.deleted_at is null
    )
  returning * into result;

  if result.id is null then
    raise exception 'pre-workout check-in not found for this athlete';
  end if;
  return result;
end;
$$;

revoke execute on function public.submit_athlete_postworkout_checkin(text,integer,integer,text,text) from public;
grant execute on function public.submit_athlete_postworkout_checkin(text,integer,integer,text,text) to authenticated;

-- Include the new athlete-owned reports in the coach's existing privacy export.
create or replace function public.export_coach_data()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'coach', (select to_jsonb(c) from public.coaches c where c.id = auth.uid()),
    'athletes', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.athletes a where a.coach_id = auth.uid()), '[]'::jsonb),
    'races', coalesce((select jsonb_agg(to_jsonb(r) order by r.race_date nulls last, r.created_at) from public.races r where r.coach_id = auth.uid()), '[]'::jsonb),
    'workouts', coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at) from public.workouts w where w.coach_id = auth.uid()), '[]'::jsonb),
    'daily_checkins', coalesce((select jsonb_agg(to_jsonb(d) order by d.checkin_date) from public.daily_checkins d where d.coach_id = auth.uid()), '[]'::jsonb),
    'athlete_checkins', coalesce((select jsonb_agg(to_jsonb(ci) order by ci.submitted_at) from public.athlete_checkins ci where ci.coach_id = auth.uid()), '[]'::jsonb),
    'athlete_session_checkins', coalesce((select jsonb_agg(to_jsonb(sci) order by sci.pre_submitted_at) from public.athlete_session_checkins sci where sci.coach_id = auth.uid()), '[]'::jsonb),
    'coach_messages', coalesce((select jsonb_agg(to_jsonb(cm) order by cm.created_at) from public.coach_messages cm where cm.coach_id = auth.uid()), '[]'::jsonb),
    'training_plan_templates', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.training_plan_templates t where t.coach_id = auth.uid()), '[]'::jsonb),
    'race_plans', coalesce((select jsonb_agg(to_jsonb(rp) order by rp.created_at) from public.race_plans rp where rp.coach_id = auth.uid()), '[]'::jsonb),
    'predictions', coalesce((select jsonb_agg(to_jsonb(p) order by p.predicted_at) from public.predictions p where p.coach_id = auth.uid()), '[]'::jsonb)
  );
$$;
