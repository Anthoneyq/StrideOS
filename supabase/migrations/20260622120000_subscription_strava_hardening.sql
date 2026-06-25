-- STRIDE OS production hardening after Supabase resume.
-- Fixes:
-- 1. subscription_tier legacy constraint mismatch (`free/individual/program/research`
--    vs current `trial/free/pro`)
-- 2. coach profile upsert missing required email
-- 3. Stripe webhook silently succeeding for unknown customers
-- 4. raw Strava token rows being selectable by coaches in the browser

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.coaches'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%subscription_tier%'
  loop
    execute format('alter table public.coaches drop constraint if exists %I', constraint_name);
  end loop;
end;
$$;

update public.coaches
set subscription_tier = case
  when subscription_tier in ('individual', 'program', 'research') then 'pro'
  when subscription_tier in ('trial', 'free', 'pro') then subscription_tier
  else 'free'
end;

alter table public.coaches
  alter column subscription_tier set default 'trial',
  alter column subscription_tier set not null;

alter table public.coaches
  add constraint coaches_subscription_tier_check
    check (subscription_tier in ('trial', 'free', 'pro'));

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
    case when is_new_coach then now() + interval '14 days' else null end
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

create or replace function public.apply_stripe_subscription(
  stripe_customer text,
  new_tier text,
  new_status text,
  new_interval text,
  subscription_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  if new_tier not in ('trial', 'free', 'pro') then
    raise exception 'invalid tier: %', new_tier;
  end if;

  update public.coaches
  set subscription_tier = new_tier,
      subscription_status = new_status,
      plan_interval = new_interval,
      stripe_subscription_id = subscription_id,
      updated_at = now()
  where stripe_customer_id = stripe_customer;

  get diagnostics affected_count = row_count;
  if affected_count = 0 then
    raise exception 'no coach found for stripe customer %', stripe_customer;
  end if;
end;
$$;

revoke execute on function public.apply_stripe_subscription(text, text, text, text, text) from public;
revoke execute on function public.apply_stripe_subscription(text, text, text, text, text) from authenticated;

drop policy if exists "Coaches can see own athletes Strava link state"
  on public.athlete_strava;

create or replace view public.athlete_strava_status
as
select
  s.athlete_id,
  s.strava_athlete_id,
  s.last_synced_at,
  s.created_at,
  s.updated_at
from public.athlete_strava s
where exists (
  select 1
  from public.athletes a
  where a.id = s.athlete_id
    and (
      a.coach_id = auth.uid()
      or a.athlete_user_id = auth.uid()
    )
);

grant select on public.athlete_strava_status to authenticated;

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

-- Service-role webhooks bypass RLS. No browser policies are intentionally added.
