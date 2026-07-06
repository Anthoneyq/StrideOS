-- Linked athlete accounts need their own race rows to hydrate additional PRs
-- and performance-curve views. Coaches retain the existing manage policy.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'races'
      and policyname = 'Athletes can read own race history'
  ) then
    create policy "Athletes can read own race history"
      on public.races for select
      using (
        exists (
          select 1
          from public.athletes a
          where a.id = races.athlete_id
            and a.athlete_user_id = auth.uid()
        )
      );
  end if;
end;
$$;
