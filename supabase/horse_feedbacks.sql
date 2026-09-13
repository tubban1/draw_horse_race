-- Run this once in the Supabase SQL editor.
-- The Vercel API uses SUPABASE_SERVICE_ROLE_KEY server-side, so the table can
-- stay protected by RLS while the browser only talks to /api/feedback.
create table if not exists public.horse_feedbacks (
  id text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  rating smallint not null default 5 check (rating between 1 and 5),
  topic text not null default 'other' check (topic in ('idea', 'bug', 'share', 'other')),
  message text not null check (char_length(message) between 2 and 500),
  horse text not null default '',
  mode text not null default '',
  place smallint,
  time_seconds numeric(7, 2),
  combo smallint not null default 0 check (combo between 0 and 999)
);

create index if not exists horse_feedbacks_created_at_idx
  on public.horse_feedbacks (created_at desc);

alter table public.horse_feedbacks enable row level security;
