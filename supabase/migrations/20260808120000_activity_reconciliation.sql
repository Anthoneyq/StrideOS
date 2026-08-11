-- STRIDE OS · evidence-safe activity reconciliation
-- Raw provider rows remain recoverable. Coaches explicitly link a completion
-- to a plan, keep it separate, or hide it as a duplicate. No RPC infers
-- compliance, readiness, or intent.

alter table public.workouts
  add column if not exists completion_source text,
  add column if not exists completion_source_ref text,
  add column if not exists completion_workout_id uuid references public.workouts(id) on delete set null,
  add column if not exists reconciliation_status text not null default 'unreviewed',
  add column if not exists reconciled_into_workout_id uuid references public.workouts(id) on delete set null,
  add column if not exists duplicate_of_workout_id uuid references public.workouts(id) on delete set null,
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_by uuid references auth.users(id) on delete set null;

alter table public.workouts drop constraint if exists workouts_source_check;
alter table public.workouts add constraint workouts_source_check
  check (source in ('coach_entry','athlete_entry','strava','garmin','strava_csv','garmin_csv','manual_import'));

alter table public.workouts add constraint workouts_completion_source_check
  check (completion_source is null or completion_source in ('athlete_entry','strava','garmin','strava_csv','garmin_csv','manual_import'));

alter table public.workouts add constraint workouts_reconciliation_status_check
  check (reconciliation_status is null or reconciliation_status in ('unreviewed','linked','kept_separate','duplicate_ignored'));

create index if not exists idx_workouts_reconciliation_inbox
  on public.workouts (athlete_id, reconciliation_status, workout_date desc)
  where source in ('athlete_entry','strava','garmin','strava_csv','garmin_csv','manual_import');

-- Existing athlete policies predate explicit CSV provenance values.
drop policy if exists "Athletes can insert own workouts" on public.workouts;
create policy "Athletes can insert own workouts"
  on public.workouts for insert
  with check (
    exists (
      select 1 from public.athletes a
      where a.id = workouts.athlete_id and a.athlete_user_id = auth.uid()
    )
    and source in ('athlete_entry','strava','garmin','strava_csv','garmin_csv')
  );

drop policy if exists "Athletes can update own logged workouts" on public.workouts;
create policy "Athletes can update own logged workouts"
  on public.workouts for update
  using (
    exists (
      select 1 from public.athletes a
      where a.id = workouts.athlete_id and a.athlete_user_id = auth.uid()
    )
    and source in ('athlete_entry','strava','garmin','strava_csv','garmin_csv')
  );

-- Reconciliation provenance (completion_* and reconciliation bookkeeping) is
-- owned by the four reconciliation RPCs below, which mark their transaction
-- with a transaction-local GUC before writing. Outside those RPCs:
--   INSERT: provenance fields are normalized to their virgin state, so no
--           client payload can arrive pre-linked or pre-resolved.
--   UPDATE: any change to a provenance field is rejected, and while a plan is
--           linked its copied completion evidence is read-only. This is what
--           makes undo's reset safe — no newer manual evidence can exist on a
--           linked plan to erase, and no direct write can corrupt undo state.
create or replace function public.guard_linked_completion_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  via_rpc boolean :=
    coalesce(current_setting('stride.reconciliation_rpc', true), '') = '1';
begin
  if via_rpc then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.completion_source := null;
    new.completion_source_ref := null;
    new.completion_workout_id := null;
    new.reconciliation_status := 'unreviewed';
    new.reconciled_into_workout_id := null;
    new.duplicate_of_workout_id := null;
    new.reconciled_at := null;
    new.reconciled_by := null;
    return new;
  end if;
  if (new.completion_workout_id,new.completion_source,new.completion_source_ref,
      new.reconciliation_status,new.reconciled_into_workout_id,
      new.duplicate_of_workout_id,new.reconciled_at,new.reconciled_by)
     is distinct from
     (old.completion_workout_id,old.completion_source,old.completion_source_ref,
      old.reconciliation_status,old.reconciled_into_workout_id,
      old.duplicate_of_workout_id,old.reconciled_at,old.reconciled_by) then
    raise exception 'reconciliation provenance can only change through the reconciliation actions';
  end if;
  if old.completion_workout_id is not null
     and (new.total_distance_m,new.total_duration_sec,new.avg_pace_sec_per_km,
          new.avg_hr_bpm,new.max_hr_bpm,new.perceived_effort)
        is distinct from
        (old.total_distance_m,old.total_duration_sec,old.avg_pace_sec_per_km,
         old.avg_hr_bpm,old.max_hr_bpm,old.perceived_effort) then
    raise exception 'completion evidence came from a linked activity — undo the link before editing it';
  end if;
  return new;
end;
$$;

create trigger workouts_guard_linked_completion_evidence
  before insert or update on public.workouts
  for each row execute function public.guard_linked_completion_evidence();

create or replace function public.link_imported_workout_to_plan(
  imported_workout_id uuid,
  planned_workout_id uuid
)
returns public.workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  imported public.workouts;
  planned public.workouts;
  result public.workouts;
begin
  select * into imported from public.workouts where id = imported_workout_id for update;
  select * into planned from public.workouts where id = planned_workout_id for update;

  if uid is null or imported.id is null or planned.id is null
     or imported.coach_id <> uid or planned.coach_id <> uid
     or imported.athlete_id <> planned.athlete_id then
    raise exception 'workouts are not available to this coach';
  end if;
  if imported.source not in ('athlete_entry','strava','garmin','strava_csv','garmin_csv','manual_import')
     or imported.deleted_at is not null
     or coalesce(imported.reconciliation_status,'unreviewed') <> 'unreviewed'
     or not (imported.total_distance_m is not null or imported.total_duration_sec is not null
             or imported.avg_hr_bpm is not null or imported.max_hr_bpm is not null
             or imported.perceived_effort is not null) then
    raise exception 'imported completion is not eligible for reconciliation';
  end if;
  if planned.source <> 'coach_entry' or planned.deleted_at is not null
     or not (planned.prescribed_distance_m is not null or planned.prescribed_pace_sec_per_km is not null
             or planned.prescribed_zone_label is not null or planned.prescribed_notes is not null)
     or planned.total_distance_m is not null or planned.total_duration_sec is not null
     or planned.avg_hr_bpm is not null or planned.max_hr_bpm is not null
     or planned.perceived_effort is not null or planned.completion_workout_id is not null then
    raise exception 'selected plan already has completion evidence or is not a plan';
  end if;
  if abs(planned.workout_date - imported.workout_date) > 7 then
    raise exception 'plan and completion are more than seven days apart';
  end if;

  perform set_config('stride.reconciliation_rpc', '1', true);

  update public.workouts set
    total_distance_m = imported.total_distance_m,
    total_duration_sec = imported.total_duration_sec,
    avg_pace_sec_per_km = imported.avg_pace_sec_per_km,
    avg_hr_bpm = imported.avg_hr_bpm,
    max_hr_bpm = imported.max_hr_bpm,
    perceived_effort = imported.perceived_effort,
    completion_source = imported.source,
    completion_source_ref = imported.source_ref,
    completion_workout_id = imported.id
  where id = planned.id
  returning * into result;

  update public.workouts set
    reconciliation_status = 'linked',
    reconciled_into_workout_id = planned.id,
    duplicate_of_workout_id = null,
    reconciled_at = now(),
    reconciled_by = uid,
    deleted_at = now()
  where id = imported.id;

  return result;
end;
$$;

create or replace function public.ignore_duplicate_workout(
  duplicate_workout_id uuid,
  canonical_workout_id uuid
)
returns public.workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  duplicate_row public.workouts;
  canonical_row public.workouts;
  result public.workouts;
begin
  select * into duplicate_row from public.workouts where id = duplicate_workout_id for update;
  select * into canonical_row from public.workouts where id = canonical_workout_id for update;
  if uid is null or duplicate_row.id is null or canonical_row.id is null
     or duplicate_row.id = canonical_row.id
     or duplicate_row.coach_id <> uid or canonical_row.coach_id <> uid
     or duplicate_row.athlete_id <> canonical_row.athlete_id
     or duplicate_row.source not in ('athlete_entry','strava','garmin','strava_csv','garmin_csv','manual_import')
     or duplicate_row.deleted_at is not null
     or coalesce(duplicate_row.reconciliation_status,'unreviewed') <> 'unreviewed'
     or not (canonical_row.total_distance_m is not null or canonical_row.total_duration_sec is not null) then
    raise exception 'duplicate relationship is not eligible';
  end if;
  perform set_config('stride.reconciliation_rpc', '1', true);
  update public.workouts set
    reconciliation_status='duplicate_ignored',duplicate_of_workout_id=canonical_row.id,
    reconciled_into_workout_id=null,reconciled_at=now(),reconciled_by=uid,deleted_at=now()
  where id=duplicate_row.id returning * into result;
  return result;
end;
$$;

create or replace function public.keep_workout_separate(activity_workout_id uuid)
returns public.workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.workouts;
begin
  perform set_config('stride.reconciliation_rpc', '1', true);
  update public.workouts set
    reconciliation_status='kept_separate',reconciled_into_workout_id=null,
    duplicate_of_workout_id=null,reconciled_at=now(),reconciled_by=uid
  where id=activity_workout_id and coach_id=uid and deleted_at is null
    and source in ('athlete_entry','strava','garmin','strava_csv','garmin_csv','manual_import')
    and coalesce(reconciliation_status,'unreviewed')='unreviewed'
  returning * into result;
  if result.id is null then raise exception 'activity is not available for reconciliation'; end if;
  return result;
end;
$$;

create or replace function public.undo_workout_reconciliation(activity_workout_id uuid)
returns public.workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  activity public.workouts;
  result public.workouts;
begin
  select * into activity from public.workouts where id=activity_workout_id for update;
  if uid is null or activity.id is null or activity.coach_id <> uid
     or activity.reconciliation_status not in ('linked','kept_separate','duplicate_ignored') then
    raise exception 'resolved activity is not available to this coach';
  end if;
  perform set_config('stride.reconciliation_rpc', '1', true);
  if activity.reconciliation_status='linked' then
    update public.workouts set
      total_distance_m=null,total_duration_sec=null,avg_pace_sec_per_km=null,
      avg_hr_bpm=null,max_hr_bpm=null,perceived_effort=null,
      completion_source=null,completion_source_ref=null,completion_workout_id=null
    where id=activity.reconciled_into_workout_id and coach_id=uid
      and completion_workout_id=activity.id;
  end if;
  update public.workouts set
    reconciliation_status='unreviewed',reconciled_into_workout_id=null,
    duplicate_of_workout_id=null,reconciled_at=null,reconciled_by=null,deleted_at=null
  where id=activity.id returning * into result;
  return result;
end;
$$;

revoke execute on function public.link_imported_workout_to_plan(uuid,uuid) from public;
revoke execute on function public.ignore_duplicate_workout(uuid,uuid) from public;
revoke execute on function public.keep_workout_separate(uuid) from public;
revoke execute on function public.undo_workout_reconciliation(uuid) from public;
grant execute on function public.link_imported_workout_to_plan(uuid,uuid) to authenticated;
grant execute on function public.ignore_duplicate_workout(uuid,uuid) to authenticated;
grant execute on function public.keep_workout_separate(uuid) to authenticated;
grant execute on function public.undo_workout_reconciliation(uuid) to authenticated;
