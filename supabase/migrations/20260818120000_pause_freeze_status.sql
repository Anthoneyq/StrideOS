-- Pause / Freeze retention tiers (2026-08-18).
--
-- Adds 'frozen' as a legal subscription_status. A frozen coach is on the
-- $1.99/mo data-storage price: tier 'free' (no Pro access), but the status
-- lets the UI say "Frozen — your data is safe" and offer Unfreeze instead
-- of a generic upgrade pitch. Pause (the free month) needs no new status:
-- Stripe keeps the subscription 'active' while collection is paused.
--
-- The status check constraint was created inline by
-- 20260522190000_add_subscription_tiers.sql, so its name is
-- auto-generated — find and drop it by inspecting pg_constraint, the same
-- way that migration normalized the legacy tier constraint.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'coaches'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%subscription_status%'
  loop
    execute format('alter table public.coaches drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.coaches
  add constraint coaches_subscription_status_check
  check (subscription_status is null or subscription_status in (
    'active', 'trialing', 'past_due', 'canceled', 'unpaid',
    'incomplete', 'incomplete_expired', 'paused', 'frozen'
  ));
