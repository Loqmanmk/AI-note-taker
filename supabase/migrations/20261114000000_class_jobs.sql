-- Notes for a recording are written in the background: the class exists as 'processing' first,
-- then becomes 'ready' with its study pack, or 'failed' with a short reason.
alter table public.classes alter column pack drop not null;
alter table public.classes alter column title set default '';
alter table public.classes alter column subject set default '';

alter table public.classes
  add column status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  add column error text check (char_length(error) <= 500),
  add constraint classes_ready_has_pack check (status <> 'ready' or pack is not null);

-- The server finishes each job as the student, so students may update their own classes.
create policy "Students update their own classes"
  on public.classes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
