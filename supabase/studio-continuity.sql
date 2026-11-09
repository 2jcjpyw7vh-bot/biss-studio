-- BISS Studio only. Do not reuse these tables for Vineyard data.
create extension if not exists pgcrypto;

create table if not exists public.biss_groups (
  id uuid primary key default gen_random_uuid(), name text not null, level text not null default 'מעורב',
  music_style text not null default '', playlist_url text not null default '', arbox_group_id text unique,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.biss_sessions (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.biss_groups(id) on delete cascade,
  starts_at timestamptz not null, title text not null, instructor_name text not null default '', workout_summary text not null default '',
  playlist_url text not null default '', status text not null default 'planned' check (status in ('planned','completed','cancelled')),
  arbox_session_id text unique, created_at timestamptz not null default now()
);
create table if not exists public.biss_adaptations (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.biss_groups(id) on delete cascade,
  member_name text not null, category text not null, guidance text not null, source text not null default 'manual',
  valid_until date, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.biss_handoffs (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.biss_sessions(id) on delete cascade,
  note text not null, author_name text not null default '', created_at timestamptz not null default now()
);
create index if not exists biss_sessions_group_starts_idx on public.biss_sessions(group_id,starts_at desc);
create index if not exists biss_adaptations_group_active_idx on public.biss_adaptations(group_id,active);
create index if not exists biss_handoffs_session_created_idx on public.biss_handoffs(session_id,created_at desc);
alter table public.biss_groups enable row level security;
alter table public.biss_sessions enable row level security;
alter table public.biss_adaptations enable row level security;
alter table public.biss_handoffs enable row level security;
revoke all on public.biss_groups,public.biss_sessions,public.biss_adaptations,public.biss_handoffs from anon,authenticated;
grant all on public.biss_groups,public.biss_sessions,public.biss_adaptations,public.biss_handoffs to service_role;

