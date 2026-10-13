-- Read-only production audit. Counts and metadata only; no athlete data output.
select version from supabase_migrations.schema_migrations order by version desc limit 8;
select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='coaches' and grantee in ('anon','authenticated') order by 1,2;
select grantee, column_name, privilege_type from information_schema.role_column_grants
where table_schema='public' and table_name='coaches' and grantee in ('anon','authenticated') and privilege_type <> 'SELECT' order by 1,2;
select p.proname, has_function_privilege('authenticated',p.oid,'EXECUTE') as client_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('apply_stripe_subscription','expire_trials','acquire_checkout_lock');
select conrelid::regclass as relation, conname, convalidated from pg_constraint
where conname like '%_athlete_coach_fk' order by 1;
select 'workouts' as relation, count(*) as inconsistent_rows from public.workouts c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null
union all select 'athlete_session_checkins', count(*) from public.athlete_session_checkins c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null
union all select 'athlete_checkins', count(*) from public.athlete_checkins c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null
union all select 'coach_messages', count(*) from public.coach_messages c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null
union all select 'race_plans', count(*) from public.race_plans c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null
union all select 'races', count(*) from public.races c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null
union all select 'daily_checkins', count(*) from public.daily_checkins c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null
union all select 'predictions', count(*) from public.predictions c left join public.athletes a on a.id=c.athlete_id and a.coach_id=c.coach_id where a.id is null;
