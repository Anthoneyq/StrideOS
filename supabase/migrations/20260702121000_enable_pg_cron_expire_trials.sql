-- Ensure trial expiry actually runs in production.
--
-- The 20260629181500 migration schedules expire_trials only if pg_cron is
-- already installed. Production did not have pg_cron enabled, so the migration
-- succeeded but skipped the schedule. This migration makes the dependency
-- explicit and then installs/replaces the daily expiry job.

create extension if not exists pg_cron;

do $cron$
begin
  perform cron.unschedule('expire-trials-daily')
    where exists (select 1 from cron.job where jobname = 'expire-trials-daily');

  perform cron.schedule(
    'expire-trials-daily',
    '0 8 * * *',
    $job$ select public.expire_trials(); $job$
  );
end
$cron$;
