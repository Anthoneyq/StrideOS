-- Protect billing fields, bind every athlete-owned record to its actual coach,
-- and serialize checkout creation across tabs/plans. No existing data is deleted.
begin;

revoke insert, update, delete, truncate, references, trigger on public.coaches from public, anon, authenticated;
grant update (display_name, team_name, team_color, research_opt_in, research_opt_in_at) on public.coaches to authenticated;
-- Profile creation/consent goes through the authenticated, server-controlled RPC.
revoke all on function public.apply_stripe_subscription(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription(text,text,text,text,text) to service_role;
revoke all on function public.expire_trials() from public, anon, authenticated;
grant execute on function public.expire_trials() to service_role;

create unique index if not exists athletes_id_coach_unique on public.athletes(id, coach_id);
-- NOT VALID deliberately allows rollout without deleting/rewriting historical
-- mismatches. New writes are checked immediately. Restrictive policies hide
-- old mismatches until an operator investigates them; validation follows audit.
do $$
declare tbl text;
begin
  foreach tbl in array array['workouts','athlete_session_checkins','athlete_checkins','coach_messages','race_plans','races','daily_checkins','predictions'] loop
    execute format('alter table public.%I add constraint %I foreign key (athlete_id, coach_id) references public.athletes(id, coach_id) not valid', tbl, tbl || '_athlete_coach_fk');
    execute format('create policy %I on public.%I as restrictive for all to authenticated using (exists (select 1 from public.athletes a where a.id = %I.athlete_id and a.coach_id = %I.coach_id)) with check (exists (select 1 from public.athletes a where a.id = %I.athlete_id and a.coach_id = %I.coach_id))', tbl || '_consistent_owner', tbl, tbl, tbl, tbl, tbl);
  end loop;
end $$;

create table public.checkout_locks (
  coach_id uuid primary key references public.coaches(id) on delete cascade,
  token uuid not null,
  expires_at timestamptz not null
);
alter table public.checkout_locks enable row level security;
revoke all on public.checkout_locks from public, anon, authenticated;
grant all on public.checkout_locks to service_role;

create function public.acquire_checkout_lock(owner_id uuid, lock_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare acquired uuid;
begin
  insert into public.checkout_locks(coach_id, token, expires_at)
  values(owner_id, lock_token, now() + interval '5 minutes')
  on conflict (coach_id) do update set token = excluded.token, expires_at = excluded.expires_at
    where checkout_locks.expires_at < now()
  returning token into acquired;
  return acquired is not null;
end $$;
revoke all on function public.acquire_checkout_lock(uuid,uuid) from public, anon, authenticated;
grant execute on function public.acquire_checkout_lock(uuid,uuid) to service_role;
commit;
