-- Study packs saved for each signed-in student.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) <= 500),
  subject text not null check (char_length(subject) <= 200),
  pack jsonb not null check (jsonb_typeof(pack) = 'object'),
  -- The publishable key is public, so signed-in users can call this table directly: cap what one row may hold.
  constraint classes_pack_size check (octet_length(pack::text) <= 500000)
);

create index classes_user_created_idx on public.classes (user_id, created_at desc);

-- Each student sees and manages only their own classes. Classes are never edited, so there is no update policy.
alter table public.classes enable row level security;

create policy "Students read their own classes"
  on public.classes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students add their own classes"
  on public.classes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students delete their own classes"
  on public.classes for delete to authenticated
  using ((select auth.uid()) = user_id);
