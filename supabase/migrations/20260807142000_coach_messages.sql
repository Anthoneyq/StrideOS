-- STRIDE OS · decision-linked coach messages
-- `published` means available inside the linked athlete's STRIDE portal.
-- It does not claim email, SMS, push delivery, or that the athlete opened it.

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  client_ref text not null check (char_length(client_ref) between 1 and 180),
  subject text not null check (char_length(subject) between 1 and 160),
  body text not null check (char_length(body) between 1 and 4000),
  context_type text not null default 'general'
    check (context_type in ('general','workout','race','checkin')),
  context_ref text check (context_ref is null or char_length(context_ref) <= 180),
  context_date date,
  context_label text check (context_label is null or char_length(context_label) <= 240),
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, client_ref),
  check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  )
);

create index if not exists idx_coach_messages_coach_updated
  on public.coach_messages (coach_id, updated_at desc);
create index if not exists idx_coach_messages_athlete_published
  on public.coach_messages (athlete_id, published_at desc)
  where status = 'published';

create trigger coach_messages_set_updated_at
  before update on public.coach_messages
  for each row execute function public.set_updated_at();

-- A message is born unread, and a coach edit — including moving it to a
-- different athlete — invalidates the prior read receipt. A standalone read_at
-- change is accepted only from the linked athlete and can only move
-- null -> timestamp.
create or replace function public.guard_coach_message_read_receipt()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.read_at := null;
    return new;
  end if;
  if (new.athlete_id,new.subject,new.body,new.context_type,new.context_ref,new.context_date,new.context_label,new.status,new.published_at)
     is distinct from
     (old.athlete_id,old.subject,old.body,old.context_type,old.context_ref,old.context_date,old.context_label,old.status,old.published_at) then
    new.read_at := null;
  elsif new.read_at is distinct from old.read_at then
    if old.read_at is not null or new.read_at is null or new.status <> 'published'
       or not exists (
         select 1 from public.athletes a
         where a.id = new.athlete_id and a.athlete_user_id = auth.uid()
       ) then
      raise exception 'only the linked athlete can mark a published message read';
    end if;
  end if;
  return new;
end;
$$;

create trigger coach_messages_guard_read_receipt
  before insert or update on public.coach_messages
  for each row execute function public.guard_coach_message_read_receipt();

alter table public.coach_messages enable row level security;

create policy "Coaches read own messages"
  on public.coach_messages for select
  using (auth.uid() = coach_id);

create policy "Coaches create messages for own athletes"
  on public.coach_messages for insert
  with check (
    auth.uid() = coach_id
    and read_at is null
    and exists (
      select 1 from public.athletes a
      where a.id = coach_messages.athlete_id
        and a.coach_id = auth.uid()
        and a.deleted_at is null
    )
  );

create policy "Coaches update own messages"
  on public.coach_messages for update
  using (auth.uid() = coach_id)
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from public.athletes a
      where a.id = coach_messages.athlete_id
        and a.coach_id = auth.uid()
        and a.deleted_at is null
    )
  );

create policy "Coaches delete own drafts"
  on public.coach_messages for delete
  using (auth.uid() = coach_id and status = 'draft');

create policy "Athletes read own published messages"
  on public.coach_messages for select
  using (
    status = 'published'
    and exists (
      select 1 from public.athletes a
      where a.id = coach_messages.athlete_id
        and a.athlete_user_id = auth.uid()
        and a.deleted_at is null
    )
  );

create or replace function public.mark_coach_message_read(message_row_id uuid)
returns public.coach_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.coach_messages;
begin
  update public.coach_messages m
  set read_at = coalesce(m.read_at, now())
  where m.id = message_row_id
    and m.status = 'published'
    and exists (
      select 1 from public.athletes a
      where a.id = m.athlete_id
        and a.athlete_user_id = auth.uid()
        and a.deleted_at is null
    )
  returning * into result;

  if result.id is null then
    raise exception 'published message not found for this athlete';
  end if;
  return result;
end;
$$;

revoke execute on function public.mark_coach_message_read(uuid) from public;
grant execute on function public.mark_coach_message_read(uuid) to authenticated;

-- Keep the account-level privacy controls complete as Online Coach OS grows.
-- Athlete-linked rows also cascade when athletes are deleted; the explicit
-- deletes document the contract and cover any historical FK drift.
create or replace function public.request_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Must be signed in to request account deletion';
  end if;

  delete from public.coach_messages where coach_id = uid;
  delete from public.athlete_checkins where coach_id = uid;
  delete from public.race_plans where coach_id = uid;
  delete from public.training_plan_templates where coach_id = uid;
  delete from public.athletes where coach_id = uid;
  delete from public.races where coach_id = uid;
  delete from public.workouts where coach_id = uid;
  delete from public.daily_checkins where coach_id = uid;
  delete from public.predictions where coach_id = uid;
  delete from public.prediction_log where coach_id = uid;
  delete from public.local_imports where coach_id = uid;
  update public.coaches set deleted_at = now() where id = uid;
  return true;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.export_coach_data()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'coach', (select to_jsonb(c) from public.coaches c where c.id = auth.uid()),
    'athletes', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.athletes a where a.coach_id = auth.uid()), '[]'::jsonb),
    'races', coalesce((select jsonb_agg(to_jsonb(r) order by r.race_date nulls last, r.created_at) from public.races r where r.coach_id = auth.uid()), '[]'::jsonb),
    'workouts', coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at) from public.workouts w where w.coach_id = auth.uid()), '[]'::jsonb),
    'daily_checkins', coalesce((select jsonb_agg(to_jsonb(d) order by d.checkin_date) from public.daily_checkins d where d.coach_id = auth.uid()), '[]'::jsonb),
    'athlete_checkins', coalesce((select jsonb_agg(to_jsonb(ci) order by ci.submitted_at) from public.athlete_checkins ci where ci.coach_id = auth.uid()), '[]'::jsonb),
    'coach_messages', coalesce((select jsonb_agg(to_jsonb(cm) order by cm.created_at) from public.coach_messages cm where cm.coach_id = auth.uid()), '[]'::jsonb),
    'training_plan_templates', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.training_plan_templates t where t.coach_id = auth.uid()), '[]'::jsonb),
    'race_plans', coalesce((select jsonb_agg(to_jsonb(rp) order by rp.created_at) from public.race_plans rp where rp.coach_id = auth.uid()), '[]'::jsonb),
    'predictions', coalesce((select jsonb_agg(to_jsonb(p) order by p.predicted_at) from public.predictions p where p.coach_id = auth.uid()), '[]'::jsonb)
  );
$$;
