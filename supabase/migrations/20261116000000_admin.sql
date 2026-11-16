-- Admin console: app-wide settings, a history of admin actions, and how each class was processed
-- (for the AI cost estimate). Only the server (service role) reads or writes the two new tables:
-- RLS is on with no policies, so students cannot see them.

create table public.app_settings (
  key text primary key check (char_length(key) <= 100),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text check (char_length(updated_by) <= 320)
);
alter table public.app_settings enable row level security;

create table public.admin_audit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_email text not null check (char_length(admin_email) <= 320),
  action text not null check (char_length(action) <= 100),
  target text check (char_length(target) <= 320),
  details jsonb
);
create index admin_audit_created_idx on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security;

-- How the notes were written: from a transcript (speech-to-text then text), from the audio, or from text.
alter table public.class_usage
  add column ai_path text check (ai_path in ('transcript', 'audio', 'text'));
