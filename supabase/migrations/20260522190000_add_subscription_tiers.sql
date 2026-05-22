-- STRIDE OS subscription tiers.
-- Adds free / trial / pro tier tracking to the coaches table so the app
-- can gate features and Stripe webhooks can sync subscription state.

-- 1. Add subscription columns to coaches.
alter table public.coaches
  add column if not exists subscription_tier text
    not null default 'trial'
    check (subscription_tier in ('trial', 'free', 'pro')),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text
    check (subscription_status is null or subscription_status in (
      'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'
    )),
  add column if not exists plan_interval text
    check (plan_interval is null or plan_interval in ('monthly', 'annual'));

create unique index if not exists idx_coaches_stripe_customer_id
  on public.coaches (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_coaches_trial_ends_at
  on public.coaches (trial_ends_at)
  where subscription_tier = 'trial';

-- 2. Update upsert_coach_profile to default new coaches to a 14-day trial.
-- Existing coaches keep whatever tier they have.
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
begin
  if auth.uid() is null then
    raise exception 'must be signed in to upsert coach profile';
  end if;

  select not exists (select 1 from public.coaches where id = auth.uid())
    into is_new_coach;

  insert into public.coaches (
    id,
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
    coalesce(nullif(btrim(upsert_coach_profile.display_name), ''), 'Coach'),
    nullif(btrim(coalesce(upsert_coach_profile.team_name, '')), ''),
    coalesce(nullif(btrim(coalesce(upsert_coach_profile.team_color, '')), ''), '#ff4500'),
    case when upsert_coach_profile.terms_accepted then now() else null end,
    case when upsert_coach_profile.privacy_accepted then now() else null end,
    coalesce(upsert_coach_profile.research_opt_in, false),
    case when is_new_coach then 'trial' else null end,
    case when is_new_coach then now() + interval '14 days' else null end
  )
  on conflict (id) do update set
    display_name = coalesce(nullif(btrim(excluded.display_name), ''), public.coaches.display_name),
    team_name = coalesce(nullif(btrim(coalesce(excluded.team_name, '')), ''), public.coaches.team_name),
    team_color = coalesce(nullif(btrim(coalesce(excluded.team_color, '')), ''), public.coaches.team_color),
    terms_accepted_at = coalesce(public.coaches.terms_accepted_at, excluded.terms_accepted_at),
    privacy_accepted_at = coalesce(public.coaches.privacy_accepted_at, excluded.privacy_accepted_at),
    research_opt_in = coalesce(excluded.research_opt_in, public.coaches.research_opt_in)
    -- NOTE: never overwrite subscription_tier/trial_ends_at on update; those
    -- are managed by the Stripe webhook and the daily trial-expiry cron.
  returning * into result;

  return result;
end;
$$;

-- 3. View helper for the app to read its own subscription state cheaply.
create or replace view public.my_subscription
with (security_invoker = true)
as
select
  c.id as coach_id,
  c.subscription_tier,
  c.trial_ends_at,
  c.subscription_status,
  c.plan_interval,
  case
    when c.subscription_tier = 'pro' then true
    when c.subscription_tier = 'trial' and c.trial_ends_at > now() then true
    else false
  end as has_pro_access,
  case
    when c.subscription_tier = 'trial' and c.trial_ends_at is not null
      then greatest(0, extract(epoch from (c.trial_ends_at - now()))::integer)
    else null
  end as trial_seconds_remaining
from public.coaches c
where c.id = auth.uid();

grant select on public.my_subscription to authenticated;

-- 4. Daily job to flip expired trials to free.
-- Will be scheduled by Phase F via pg_cron once the cron extension is enabled.
create or replace function public.expire_trials()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  update public.coaches
  set subscription_tier = 'free',
      updated_at = now()
  where subscription_tier = 'trial'
    and trial_ends_at is not null
    and trial_ends_at <= now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

-- 5. Stripe webhook RPC for the Edge Function to call.
-- Updates a coach by stripe_customer_id without needing service-role access
-- from inside the function (we pass through via signed JWT). The webhook
-- function itself runs with the service role and bypasses RLS.
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
end;
$$;

revoke execute on function public.apply_stripe_subscription(text, text, text, text, text) from public;
revoke execute on function public.apply_stripe_subscription(text, text, text, text, text) from authenticated;
-- Only the service role (used by the Edge Function) can apply Stripe updates.

-- 6. Backfill: any existing coaches without a tier set get a 14-day trial too.
-- Since this is beta with very few users, treat early adopters generously.
update public.coaches
set subscription_tier = 'trial',
    trial_ends_at = now() + interval '14 days'
where subscription_tier is null
   or (subscription_tier = 'trial' and trial_ends_at is null);
