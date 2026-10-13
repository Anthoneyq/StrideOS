-- Restore the 30-day Pro trial that a migration collision silently removed.
--
-- WHAT HAPPENED
-- 20260629181500_trial_30_days.sql created upsert_coach_profile WITH the trial
-- grant (subscription_tier 'trial' + trial_ends_at now() + 30 days).
-- 20260701150000_privacy_deletion_hardening.sql then re-declared a function of
-- the IDENTICAL signature, so `create or replace` replaced it — but that body
-- had been re-derived from the pre-trial May version and its INSERT column list
-- omitted subscription_tier and trial_ends_at entirely.
--
-- CONSEQUENCE, live since 2026-07-01: every new coach landed on
-- subscription_tier 'trial' (the column default) with trial_ends_at NULL.
-- my_subscription computes has_pro_access as
--   subscription_tier = 'trial' and trial_ends_at > now()
-- and NULL > now() is NULL, so has_pro_access was FALSE on day one. The signup
-- page promises "no credit card · 30-day Pro trial included"; the product
-- delivered a locked 3-athlete free account. expire_trials() requires
-- trial_ends_at is not null, so these coaches were never even released to
-- 'free' — they sat in a trial that had never started and could never end.
--
-- THIS MIGRATION
--   1. Re-creates upsert_coach_profile with the 20260701150000 privacy body
--      (consent gate, research_opt_in_at stamp, deleted_at revival) PLUS the
--      trial grant, back on `security definer` as the June version was.
--   2. Backfills every coach stranded without a trial end date.
--   3. Adds a CHECK constraint so this class of regression fails loudly at the
--      database instead of silently shipping a dead trial for two months.
--
-- Regression coverage: tests/db/rls-trigger-tests.sql cases 15, 16 and 17.
-- Run with tests/db/run-db-tests.sh.

-- ── (1) The function ────────────────────────────────────────────────────────
-- security definer (not invoker): the body pins every write to auth.uid(), and
-- it must keep working if UPDATE on public.coaches is later narrowed to a
-- column grant list to stop coaches self-granting 'pro'.
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
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  jwt_email text := coalesce(auth.jwt() ->> 'email', uid::text);
  is_new_coach boolean;
  row_out public.coaches;
begin
  if uid is null then
    raise exception 'Must be signed in to create a coach profile';
  end if;

  if not terms_accepted or not privacy_accepted then
    raise exception 'Terms and privacy policy must be accepted';
  end if;

  select not exists (select 1 from public.coaches where id = uid) into is_new_coach;

  insert into public.coaches (
    id,
    email,
    display_name,
    team_name,
    team_color,
    research_opt_in,
    research_opt_in_at,
    terms_accepted_at,
    privacy_accepted_at,
    subscription_tier,
    trial_ends_at
  ) values (
    uid,
    jwt_email,
    nullif(btrim(display_name), ''),
    nullif(btrim(team_name), ''),
    nullif(btrim(team_color), ''),
    research_opt_in,
    case when research_opt_in then now() else null end,
    now(),
    now(),
    case when is_new_coach then 'trial' else 'free' end,
    case when is_new_coach then now() + interval '30 days' else null end
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
    -- subscription_tier and trial_ends_at are deliberately ABSENT from this
    -- list. Two failures depend on it: a paying coach editing their team name
    -- must not be knocked back to a trial, and nobody may mint a fresh 30-day
    -- trial by calling the profile upsert again.
  returning * into row_out;

  return row_out;
end;
$$;

grant execute on function public.upsert_coach_profile(text, text, text, boolean, boolean, boolean) to authenticated;

-- ── (2) Backfill the stranded cohort ────────────────────────────────────────
-- Any row marked 'trial' with no end date is a coach who was promised a trial
-- and never received one. The clock starts now, because it never started at
-- signup and they have had no usable trial to spend.
--
-- POLICY LINE — change this one expression if you would rather date the trial
-- from signup (`created_at + interval '30 days'`), which gives nothing back to
-- anyone who signed up more than 30 days ago.
do $backfill$
declare
  n integer;
begin
  update public.coaches
  set trial_ends_at = now() + interval '30 days',
      updated_at = now()
  where subscription_tier = 'trial'
    and trial_ends_at is null
    and deleted_at is null;
  get diagnostics n = row_count;
  raise notice 'restored a 30-day trial for % coach(es) stranded by the 2026-07-01 regression', n;

  -- Deleted accounts get an honest terminal state instead of a phantom trial.
  update public.coaches
  set subscription_tier = 'free',
      updated_at = now()
  where subscription_tier = 'trial'
    and trial_ends_at is null
    and deleted_at is not null;
end
$backfill$;

-- ── (3) Make the failure impossible to ship silently again ──────────────────
-- A trial with no end date is not a trial. Any future code path that tries to
-- create one now raises instead of quietly granting a locked account.
alter table public.coaches
  drop constraint if exists coaches_trial_requires_end_date;

alter table public.coaches
  add constraint coaches_trial_requires_end_date
  check (subscription_tier <> 'trial' or trial_ends_at is not null)
  not valid;

alter table public.coaches
  validate constraint coaches_trial_requires_end_date;
