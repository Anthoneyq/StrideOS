\set ON_ERROR_STOP on
reset role;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000c099','review-other@test.local');
insert into public.coaches(id,email,display_name,subscription_tier,terms_accepted_at,privacy_accepted_at)
values ('00000000-0000-0000-0000-00000000c099','review-other@test.local','Other Coach','free',now(),now());
insert into public.athletes(id,coach_id,display_name)
values ('00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-00000000c099','Other Athlete');
insert into public.athlete_session_checkins(athlete_id,coach_id,client_ref,session_date,sleep_quality,training_readiness,total_stress,pre_health_status)
values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000c0a0','launch-review',current_date,3,3,3,'no');
select set_config('test.uid','00000000-0000-0000-0000-00000000c0a0',false);
set role authenticated;
do $$ begin
  begin
    update public.workouts set athlete_id='00000000-0000-0000-0000-000000000099' where id='00000000-0000-0000-0000-00000000f0a9';
    raise exception 'cross-coach workout reassignment succeeded';
  exception when insufficient_privilege or foreign_key_violation then null; end;
  begin
    update public.athlete_session_checkins set athlete_id='00000000-0000-0000-0000-000000000099' where client_ref='launch-review';
    raise exception 'cross-coach checkin reassignment succeeded';
  exception when insufficient_privilege or foreign_key_violation then null; end;
  -- Valid changes still work, including reassignment within the same coach.
  update public.workouts set athlete_id='00000000-0000-0000-0000-0000000000a2', coach_notes='Valid edit' where id='00000000-0000-0000-0000-00000000f0a9';
  if not found then raise exception 'valid workout edit blocked'; end if;
  update public.athlete_session_checkins set coach_response='Valid response' where client_ref='launch-review';
  if not found then raise exception 'valid response blocked'; end if;
end $$;
\echo PASS launch: cross-account relations denied, legitimate writes allowed
select set_config('test.uid','00000000-0000-0000-0000-00000000c099',false);
do $$ begin
  begin
    update public.coaches set subscription_tier='pro' where id=auth.uid();
    raise exception 'self-upgrade succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.coaches set stripe_customer_id='cus_fake',trial_ends_at=now()+interval '1 year' where id=auth.uid();
    raise exception 'billing identity write succeeded';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.coaches where id=auth.uid();
    raise exception 'direct profile delete bypassed lifecycle';
  exception when insufficient_privilege then null; end;
  begin
    perform public.apply_stripe_subscription('cus_fake','pro','active','annual','sub_fake');
    raise exception 'client billing RPC succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.acquire_checkout_lock(auth.uid(),gen_random_uuid());
    raise exception 'client checkout lock succeeded';
  exception when insufficient_privilege then null; end;
  update public.coaches set display_name='Allowed Name' where id=auth.uid();
  if not found then raise exception 'profile edit blocked'; end if;
end $$;
\echo PASS launch: profile billing fields and server RPCs protected
reset role;
-- The FK is defense in depth, including privileged imports.
do $$ begin
  begin
    insert into public.workouts(athlete_id,coach_id,workout_date,workout_type)
    values('00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-00000000c0a0',current_date,'easy');
    raise exception 'privileged mismatched relation inserted';
  exception when foreign_key_violation then null; end;
end $$;
set role service_role;
do $$ begin
  if not public.acquire_checkout_lock('00000000-0000-0000-0000-00000000c099',gen_random_uuid()) then raise exception 'first lock failed'; end if;
  if public.acquire_checkout_lock('00000000-0000-0000-0000-00000000c099',gen_random_uuid()) then raise exception 'second lock succeeded'; end if;
  update public.checkout_locks set expires_at=now()-interval '1 second';
  if not public.acquire_checkout_lock('00000000-0000-0000-0000-00000000c099',gen_random_uuid()) then raise exception 'expired lock not recovered'; end if;
  update public.coaches set subscription_tier='pro' where id='00000000-0000-0000-0000-00000000c099';
  if not found then raise exception 'service billing update blocked'; end if;
end $$;
\echo PASS launch: privileged integrity checks and checkout lease recovery
reset role;
-- A fresh database is clean; validate all ownership constraints to prove it.
do $$ declare r record; begin
  for r in select conrelid::regclass as tbl,conname from pg_constraint where conname like '%_athlete_coach_fk' loop
    execute format('alter table %s validate constraint %I',r.tbl,r.conname);
  end loop;
end $$;
\echo ALL LAUNCH SECURITY TESTS PASSED
