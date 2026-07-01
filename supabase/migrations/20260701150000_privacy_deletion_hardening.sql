-- ══════════════════════════════════════════════════════════════════════
-- Privacy hardening (2026-07-01 review pass)
--
-- Closes three gaps in the account-deletion / data-export path shipped
-- with the Data & Privacy UI:
--
-- 1) request_account_deletion only soft-deleted coaches/athletes/races.
--    It left workouts (Strava training data), athlete_strava (LIVE OAuth
--    tokens), daily_checkins, predictions, prediction_log and
--    local_imports (raw roster snapshots) fully intact — all of it
--    potentially minors' PII. Now: athlete rows are HARD-deleted so the
--    existing ON DELETE CASCADE FKs wipe every athlete-linked table
--    (races, workouts, athlete_strava, daily_checkins, predictions),
--    coach-scoped stores are deleted explicitly, and only the coach row
--    itself is soft-deleted (kept for Stripe customer linkage / audit).
--    prediction_log is append-only by design (no delete policy), so this
--    runs as SECURITY DEFINER — deletion is the one sanctioned bypass.
--
-- 2) export_coach_data omitted workouts entirely, while the UI promises
--    "everything tied to your coach account". Now included.
--
-- 3) Signing back in after deletion hit a zombie state: upsert_coach_profile
--    updated the soft-deleted coach row without clearing deleted_at, so
--    every load returned nothing while saves reported success. Re-accepting
--    the terms now revives the coach row (athletes are gone — fresh start).
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.request_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Must be signed in to request account deletion';
  end if;

  -- Hard-delete athletes: cascades to races, workouts, athlete_strava
  -- (revokes stored Strava tokens), daily_checkins and predictions.
  delete from public.athletes where coach_id = uid;

  -- Coach-scoped rows not keyed by athlete_id (and belt-and-braces for
  -- any athlete-keyed rows that predate the cascade FKs).
  delete from public.races where coach_id = uid;
  delete from public.workouts where coach_id = uid;
  delete from public.daily_checkins where coach_id = uid;
  delete from public.predictions where coach_id = uid;
  delete from public.prediction_log where coach_id = uid;
  delete from public.local_imports where coach_id = uid;

  -- Coach row is soft-deleted only: the Stripe webhook still needs the
  -- customer→coach mapping to process a post-deletion cancellation.
  update public.coaches set deleted_at = now() where id = uid;

  return true;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

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
    'workouts', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.created_at)
      from public.workouts w
      where w.coach_id = auth.uid()
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
    end,
    -- Re-accepting terms after an account deletion revives the profile
    -- (the previous roster is gone — this is a fresh start, not a restore).
    deleted_at = null,
    terms_accepted_at = now(),
    privacy_accepted_at = now()
  returning * into row_out;

  return row_out;
end;
$$;
