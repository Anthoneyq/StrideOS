-- Executable database tests for the coach-message read-receipt contract and
-- evidence-safe activity reconciliation. Runs against a throwaway cluster via
-- tests/db/run-db-tests.sh after the full migration chain + supabase-stub.
-- Every block raises on failure; psql runs with ON_ERROR_STOP=1.

\set ON_ERROR_STOP on
\set QUIET on

-- ── Fixtures (as table owner; RLS not yet in play) ──────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c0a0', 'coach@test.local'),
  ('00000000-0000-0000-0000-00000000a0a1', 'athlete1@test.local'),
  ('00000000-0000-0000-0000-00000000a0a2', 'athlete2@test.local');

insert into public.coaches (id, email, display_name, terms_accepted_at, privacy_accepted_at)
values ('00000000-0000-0000-0000-00000000c0a0', 'coach@test.local', 'Test Coach', now(), now());

insert into public.athletes (id, coach_id, display_name, athlete_user_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c0a0', 'Athlete One', '00000000-0000-0000-0000-00000000a0a1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000c0a0', 'Athlete Two', '00000000-0000-0000-0000-00000000a0a2');

-- ════════════════════════════════════════════════════════════════════════════
-- 1. A coach cannot forge read_at at INSERT time
-- ════════════════════════════════════════════════════════════════════════════
select set_config('test.uid', '00000000-0000-0000-0000-00000000c0a0', false);
set role authenticated;

insert into public.coach_messages
  (coach_id, athlete_id, client_ref, subject, body, status, published_at, read_at)
values
  ('00000000-0000-0000-0000-00000000c0a0', '00000000-0000-0000-0000-0000000000a1',
   'msg-forge', 'Forged', 'Trying to arrive pre-read.', 'published', now(), now());

do $$
declare r timestamptz;
begin
  select read_at into r from public.coach_messages where client_ref = 'msg-forge';
  if r is not null then
    raise exception 'FAIL 1: coach forged read_at during INSERT';
  end if;
end $$;
\echo PASS 1: read_at is forced null on coach insert

-- ════════════════════════════════════════════════════════════════════════════
-- 2. A coach cannot forge read_at by UPDATE
-- ════════════════════════════════════════════════════════════════════════════
do $$
begin
  update public.coach_messages set read_at = now() where client_ref = 'msg-forge';
  raise exception 'FAIL 2: coach set read_at directly';
exception when others then
  if sqlerrm not like '%only the linked athlete%' then raise; end if;
end $$;
\echo PASS 2: coach UPDATE of read_at is rejected

-- ════════════════════════════════════════════════════════════════════════════
-- 3. An athlete cannot write the table directly (no UPDATE policy)
-- ════════════════════════════════════════════════════════════════════════════
select set_config('test.uid', '00000000-0000-0000-0000-00000000a0a1', false);
do $$
declare n int;
begin
  update public.coach_messages set read_at = now() where client_ref = 'msg-forge';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 3: athlete updated coach_messages directly';
  end if;
end $$;
\echo PASS 3: athlete direct UPDATE touches zero rows

-- ════════════════════════════════════════════════════════════════════════════
-- 4. The linked athlete marks read via RPC; receipt is idempotent
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare m public.coach_messages; first_read timestamptz;
begin
  select * into m from public.coach_messages where client_ref = 'msg-forge';
  m := public.mark_coach_message_read(m.id);
  if m.read_at is null then raise exception 'FAIL 4: RPC did not record read_at'; end if;
  first_read := m.read_at;
  perform pg_sleep(0.01);
  m := public.mark_coach_message_read(m.id);
  if m.read_at <> first_read then raise exception 'FAIL 4: second RPC moved read_at'; end if;
end $$;
\echo PASS 4: linked athlete RPC records read_at once

-- ════════════════════════════════════════════════════════════════════════════
-- 5. The wrong athlete's RPC is rejected
-- ════════════════════════════════════════════════════════════════════════════
select set_config('test.uid', '00000000-0000-0000-0000-00000000a0a2', false);
do $$
declare mid uuid;
begin
  reset role;  -- read the id as owner; the RPC check is what's under test
  select id into mid from public.coach_messages where client_ref = 'msg-forge';
  set role authenticated;
  perform public.mark_coach_message_read(mid);
  raise exception 'FAIL 5: unlinked athlete recorded a read receipt';
exception when others then
  if sqlerrm not like '%published message not found%' then raise; end if;
end $$;
\echo PASS 5: unlinked athlete RPC is rejected

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Reassigning the message to another athlete invalidates the receipt
-- ════════════════════════════════════════════════════════════════════════════
select set_config('test.uid', '00000000-0000-0000-0000-00000000c0a0', false);
update public.coach_messages
  set athlete_id = '00000000-0000-0000-0000-0000000000a2'
  where client_ref = 'msg-forge';
do $$
declare r timestamptz;
begin
  select read_at into r from public.coach_messages where client_ref = 'msg-forge';
  if r is not null then
    raise exception 'FAIL 6: athlete reassignment preserved the old athlete''s receipt';
  end if;
end $$;
\echo PASS 6: athlete reassignment clears read_at

-- ════════════════════════════════════════════════════════════════════════════
-- 7. RPC on a draft is rejected
-- ════════════════════════════════════════════════════════════════════════════
insert into public.coach_messages (coach_id, athlete_id, client_ref, subject, body, status)
values ('00000000-0000-0000-0000-00000000c0a0', '00000000-0000-0000-0000-0000000000a1',
        'msg-draft', 'Draft', 'Not yet published.', 'draft');
select set_config('test.uid', '00000000-0000-0000-0000-00000000a0a1', false);
do $$
declare mid uuid;
begin
  reset role;
  select id into mid from public.coach_messages where client_ref = 'msg-draft';
  set role authenticated;
  perform public.mark_coach_message_read(mid);
  raise exception 'FAIL 7: draft accepted a read receipt';
exception when others then
  if sqlerrm not like '%published message not found%' then raise; end if;
end $$;
\echo PASS 7: draft RPC is rejected

reset role;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Reconciliation: link copies evidence and retires the raw activity
-- ════════════════════════════════════════════════════════════════════════════
insert into public.workouts (id, athlete_id, coach_id, workout_date, workout_type, prescribed_distance_m, prescribed_notes, source)
values ('00000000-0000-0000-0000-0000000091a0'::uuid, '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-00000000c0a0', current_date, 'easy', 8000, 'Easy 8k', 'coach_entry');
insert into public.workouts (id, athlete_id, coach_id, workout_date, workout_type, total_distance_m, total_duration_sec, avg_pace_sec_per_km, source, source_ref)
values ('00000000-0000-0000-0000-00000000e1a0'::uuid, '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-00000000c0a0', current_date, 'easy', 8100, 2430, 300, 'strava', 'act-1');

select set_config('test.uid', '00000000-0000-0000-0000-00000000c0a0', false);
set role authenticated;
select public.link_imported_workout_to_plan(
  '00000000-0000-0000-0000-00000000e1a0'::uuid,
  '00000000-0000-0000-0000-0000000091a0'::uuid);
reset role;

do $$
declare plan public.workouts; act public.workouts;
begin
  select * into plan from public.workouts where id = '00000000-0000-0000-0000-0000000091a0';
  select * into act from public.workouts where id = '00000000-0000-0000-0000-00000000e1a0';
  if plan.total_distance_m is distinct from 8100 or plan.completion_workout_id is distinct from act.id
     or plan.completion_source is distinct from 'strava' then
    raise exception 'FAIL 8: link did not copy completion evidence with provenance';
  end if;
  if act.reconciliation_status <> 'linked' or act.deleted_at is null then
    raise exception 'FAIL 8: raw activity was not retired as linked';
  end if;
end $$;
\echo PASS 8: link copies evidence and retires the raw activity

-- ════════════════════════════════════════════════════════════════════════════
-- 9. Linked completion evidence is read-only until undo
-- ════════════════════════════════════════════════════════════════════════════
do $$
begin
  update public.workouts set total_distance_m = 9999
    where id = '00000000-0000-0000-0000-0000000091a0';
  raise exception 'FAIL 9: linked completion evidence was editable';
exception when others then
  if sqlerrm not like '%undo the link before editing%' then raise; end if;
end $$;
\echo PASS 9: editing linked completion evidence is rejected

-- ════════════════════════════════════════════════════════════════════════════
-- 10. Non-evidence fields on a linked plan stay editable
-- ════════════════════════════════════════════════════════════════════════════
update public.workouts set prescribed_notes = 'Easy 8k — keep HR low'
  where id = '00000000-0000-0000-0000-0000000091a0';
\echo PASS 10: prescription edits on a linked plan still work

-- ════════════════════════════════════════════════════════════════════════════
-- 11. Undo restores both rows, then manual editing reopens
-- ════════════════════════════════════════════════════════════════════════════
select set_config('test.uid', '00000000-0000-0000-0000-00000000c0a0', false);
set role authenticated;
select public.undo_workout_reconciliation('00000000-0000-0000-0000-00000000e1a0'::uuid);
reset role;

do $$
declare plan public.workouts; act public.workouts;
begin
  select * into plan from public.workouts where id = '00000000-0000-0000-0000-0000000091a0';
  select * into act from public.workouts where id = '00000000-0000-0000-0000-00000000e1a0';
  if plan.total_distance_m is not null or plan.total_duration_sec is not null
     or plan.completion_source is not null or plan.completion_workout_id is not null then
    raise exception 'FAIL 11: undo left copied evidence on the plan';
  end if;
  if plan.prescribed_notes <> 'Easy 8k — keep HR low' then
    raise exception 'FAIL 11: undo erased a prescription edit made while linked';
  end if;
  if act.reconciliation_status <> 'unreviewed' or act.deleted_at is not null
     or act.total_distance_m is distinct from 8100 then
    raise exception 'FAIL 11: undo did not restore the raw activity';
  end if;
end $$;

update public.workouts set total_distance_m = 8200
  where id = '00000000-0000-0000-0000-0000000091a0';
do $$
declare d numeric;
begin
  select total_distance_m into d from public.workouts where id = '00000000-0000-0000-0000-0000000091a0';
  if d is distinct from 8200 then raise exception 'FAIL 11: manual evidence editing did not reopen after undo'; end if;
end $$;
\echo PASS 11: undo restores both rows and reopens manual editing

-- ════════════════════════════════════════════════════════════════════════════
-- 12. Provenance bypass: direct writes cannot clear/replace link state
-- ════════════════════════════════════════════════════════════════════════════
-- Re-link the pair (plan evidence from test 11 must be cleared first — that is
-- an unlinked plan, so evidence editing is legitimately open).
update public.workouts set total_distance_m = null
  where id = '00000000-0000-0000-0000-0000000091a0';
select set_config('test.uid', '00000000-0000-0000-0000-00000000c0a0', false);
set role authenticated;
select public.link_imported_workout_to_plan(
  '00000000-0000-0000-0000-00000000e1a0'::uuid,
  '00000000-0000-0000-0000-0000000091a0'::uuid);

-- 12a. authenticated coach clears completion_workout_id directly → rejected
do $$
begin
  update public.workouts set completion_workout_id = null
    where id = '00000000-0000-0000-0000-0000000091a0';
  raise exception 'FAIL 12a: coach cleared linked provenance directly';
exception when others then
  if sqlerrm not like '%reconciliation provenance can only change%' then raise; end if;
end $$;

-- 12b. authenticated coach swaps completion_workout_id to another row → rejected
do $$
begin
  update public.workouts set completion_workout_id = '00000000-0000-0000-0000-0000000091a0'
    where id = '00000000-0000-0000-0000-0000000091a0';
  raise exception 'FAIL 12b: coach replaced linked provenance directly';
exception when others then
  if sqlerrm not like '%reconciliation provenance can only change%' then raise; end if;
end $$;

-- 12c. authenticated coach forges reconciliation_status on the raw activity → rejected
do $$
begin
  update public.workouts set reconciliation_status = 'unreviewed', deleted_at = null
    where id = '00000000-0000-0000-0000-00000000e1a0';
  raise exception 'FAIL 12c: coach reopened a resolved activity directly';
exception when others then
  if sqlerrm not like '%reconciliation provenance can only change%' then raise; end if;
end $$;

-- 12d. the same bypass is closed for the table owner too (trigger, not RLS)
reset role;
do $$
begin
  update public.workouts set completion_workout_id = null
    where id = '00000000-0000-0000-0000-0000000091a0';
  raise exception 'FAIL 12d: owner cleared linked provenance outside the RPCs';
exception when others then
  if sqlerrm not like '%reconciliation provenance can only change%' then raise; end if;
end $$;
\echo PASS 12: direct provenance writes are rejected for client roles and owner

-- ════════════════════════════════════════════════════════════════════════════
-- 13. INSERT cannot arrive pre-linked or pre-resolved
-- ════════════════════════════════════════════════════════════════════════════
select set_config('test.uid', '00000000-0000-0000-0000-00000000c0a0', false);
set role authenticated;
insert into public.workouts
  (id, athlete_id, coach_id, workout_date, workout_type, total_distance_m, source, source_ref,
   reconciliation_status, completion_source, completion_workout_id, reconciled_at)
values
  ('00000000-0000-0000-0000-00000000f0a9'::uuid, '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-00000000c0a0', current_date, 'easy', 5000, 'coach_entry', null,
   'linked', 'strava', '00000000-0000-0000-0000-00000000e1a0', now());
do $$
declare w public.workouts;
begin
  select * into w from public.workouts where id = '00000000-0000-0000-0000-00000000f0a9';
  if w.reconciliation_status <> 'unreviewed' or w.completion_source is not null
     or w.completion_workout_id is not null or w.reconciled_at is not null then
    raise exception 'FAIL 13: an INSERT arrived pre-linked/pre-resolved';
  end if;
end $$;
\echo PASS 13: forged provenance on INSERT is normalized to virgin state

-- ════════════════════════════════════════════════════════════════════════════
-- 14. The RPCs still work with the guard installed (undo round-trip again)
-- ════════════════════════════════════════════════════════════════════════════
select public.undo_workout_reconciliation('00000000-0000-0000-0000-00000000e1a0'::uuid);
reset role;
do $$
declare plan public.workouts; act public.workouts;
begin
  select * into plan from public.workouts where id = '00000000-0000-0000-0000-0000000091a0';
  select * into act from public.workouts where id = '00000000-0000-0000-0000-00000000e1a0';
  if plan.completion_workout_id is not null or act.reconciliation_status <> 'unreviewed'
     or act.deleted_at is not null then
    raise exception 'FAIL 14: the provenance guard broke the sanctioned undo path';
  end if;
end $$;
\echo PASS 14: sanctioned RPC transitions pass the provenance guard

\echo ALL DATABASE TESTS PASSED
