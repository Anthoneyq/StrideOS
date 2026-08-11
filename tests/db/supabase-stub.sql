-- Minimal Supabase-managed surface for running the migration chain on a plain
-- local Postgres. Provides ONLY what the migrations reference: the auth schema
-- (users, uid(), jwt()) and the three client roles with Supabase-like grants.
-- auth.uid()/auth.jwt() read session GUCs so tests can impersonate any user:
--   select set_config('test.uid', '<uuid>', false);
--   select set_config('test.jwt', '{"email":"x@y"}', false);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;

-- Supabase grants client roles access to public objects by default; RLS is
-- what actually restricts rows. Mirror that here, including for objects the
-- migrations create later.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
