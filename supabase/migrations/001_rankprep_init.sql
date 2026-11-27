-- RankPrep schema. Every table is private per user via RLS.

create table if not exists public.rp_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  exam text not null default 'JEE' check (exam in ('C8', 'C9', 'C10', 'C11', 'C12', 'JEE', 'NEET')),
  board text check (board in ('Kerala SCERT', 'CBSE', 'ICSE')),
  exam_dates jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb, -- xp, daily activity, daily goal
  updated_at timestamptz not null default now()
);

create table if not exists public.rp_syllabus (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  chapter int not null,
  done_at timestamptz not null default now(),
  primary key (user_id, subject, chapter)
);

create table if not exists public.rp_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam text not null,
  label text not null default 'Mixed test',
  marks int not null,
  max int not null,
  correct int not null,
  wrong int not null,
  skipped int not null,
  by_subject jsonb not null default '{}'::jsonb,
  by_chapter jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rp_attempts_user_created on public.rp_attempts (user_id, created_at desc);

create table if not exists public.rp_pip_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists rp_pip_messages_user_created on public.rp_pip_messages (user_id, created_at desc);

alter table public.rp_profiles enable row level security;
alter table public.rp_syllabus enable row level security;
alter table public.rp_attempts enable row level security;
alter table public.rp_pip_messages enable row level security;

create policy "own profile" on public.rp_profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own syllabus" on public.rp_syllabus for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own attempts" on public.rp_attempts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own pip messages" on public.rp_pip_messages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
