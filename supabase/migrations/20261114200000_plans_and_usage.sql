-- Plans (Free, Premium, Pro) and the monthly count of classes, used to enforce each plan's limits.

-- A student's paid plan. No row means Free. Only the payment system (service role) or the
-- dashboard can change it: students can read their plan but not edit it.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('free', 'premium', 'pro')),
  -- When the paid period ends; null means it does not expire (for example, a plan granted by hand).
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Students read their own plan"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

-- One row per class whose notes were written. Deleting a class does not delete its row, so a
-- limit cannot be reset; there is no update or delete policy for the same reason.
create table public.class_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  recording_seconds integer not null default 0 check (recording_seconds between 0 and 86400)
);

create index class_usage_user_created_idx on public.class_usage (user_id, created_at desc);

alter table public.class_usage enable row level security;

create policy "Students read their own usage"
  on public.class_usage for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students record their own usage"
  on public.class_usage for insert to authenticated
  with check ((select auth.uid()) = user_id);
