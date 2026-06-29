-- 30-day Pro trial (was 14 days).
-- Strategy decision 2026-06-29: longer trial so coaches load a full roster and
-- experience Squad Intelligence value before the clock runs out (data gravity).
--
-- Touches: (1) the trial grant in upsert_coach_profile, redefined here via
-- CREATE OR REPLACE (the applied 20260622120000 migration is left untouched);
-- (2) schedules the previously-defined-but-UNSCHEDULED expire_trials() so trials
-- actually flip to 'free' on expiry; (3) one-time backfill extending currently
-- active trials by 16 days so live beta coaches get the full 30.
-- Client reads trial_seconds_remaining from my_subscription, so the UI updates
-- automatically with no JS change.

-- ── (1) Trial grant: 14 → 30 days (function body otherwise verbatim) ──
create or replace function public.upsert_coach_profile(
  display_name text,
  team_name text default null,
  team_color text default '#ff4500',
  terms_accepted boolean default false,
  privacy_accepted boolean default false,
  research_opt_in boolean default false
)
returns public.coaches
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.coaches;
  is_new_coach boolean;
  jwt_email text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
begin
  if auth.uid() is null then
    raise exception 'must be signed in to upsert coach profile';
  end if;

  select not exists (select 1 from public.coaches where id = auth.uid())
    into is_new_coach;

  insert into public.coaches (
    id,
    email,
    display_name,
    team_name,
    team_color,
    terms_accepted_at,
    privacy_accepted_at,
    research_opt_in,
    subscription_tier,
    trial_ends_at
  )
  values (
    auth.uid(),
    jwt_email,
    coalesce(nullif(btrim(upsert_coach_profile.display_name), ''), 'Coach'),
    nullif(btrim(coalesce(upsert_coach_profile.team_name, '')), ''),
    coalesce(nullif(btrim(coalesce(upsert_coach_profile.team_color, '')), ''), '#ff4500'),
    case when upsert_coach_profile.terms_accepted then now() else null end,
    case when upsert_coach_profile.privacy_accepted then now() else null end,
    coalesce(upsert_coach_profile.research_opt_in, false),
    case when is_new_coach then 'trial' else 'free' end,
    case when is_new_coach then now() + interval '30 days' else null end
  )
  on conflict (id) do update set
    email = coalesce(nullif(excluded.email, ''), public.coaches.email),
    display_name = coalesce(nullif(btrim(excluded.display_name), ''), public.coaches.display_name),
    team_name = coalesce(nullif(btrim(coalesce(excluded.team_name, '')), ''), public.coaches.team_name),
    team_color = coalesce(nullif(btrim(coalesce(excluded.team_color, '')), ''), public.coaches.team_color),
    terms_accepted_at = coalesce(public.coaches.terms_accepted_at, excluded.terms_accepted_at),
    privacy_accepted_at = coalesce(public.coaches.privacy_accepted_at, excluded.privacy_accepted_at),
    research_opt_in = coalesce(excluded.research_opt_in, public.coaches.research_opt_in)
  returning * into result;

  return result;
end;
$$;

-- ── (2) Schedule the daily trial-expiry sweep (expire_trials already exists) ──
-- Guarded: if pg_cron isn't available in this project the migration still
-- succeeds (it just logs a notice); enable pg_cron in the Supabase dashboard
-- and re-run this block if so.
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('expire-trials-daily')
      where exists (select 1 from cron.job where jobname = 'expire-trials-daily');
    perform cron.schedule('expire-trials-daily', '0 8 * * *', $job$ select public.expire_trials(); $job$);
    raise notice 'expire-trials-daily scheduled (08:00 UTC daily).';
  else
    raise notice 'pg_cron not installed; skipped scheduling expire-trials-daily. Enable pg_cron and re-run.';
  end if;
exception when others then
  raise notice 'Could not schedule expire-trials-daily: %', sqlerrm;
end
$cron$;

-- ── (3) One-time backfill: give currently-active trials the full 30 days ──
-- Filter trial_ends_at > now() so already-expired trials are never resurrected.
update public.coaches
set trial_ends_at = trial_ends_at + interval '16 days',
    updated_at = now()
where subscription_tier = 'trial'
  and trial_ends_at is not null
  and trial_ends_at > now();
