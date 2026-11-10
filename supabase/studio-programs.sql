-- BISS Studio only: trainer-approved programs and self-service equipment eligibility.
create table if not exists public.biss_programs (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.biss_users(id) on delete cascade,
  coach_id uuid references public.biss_users(id) on delete set null,
  title text not null, summary text not null default '', program_payload jsonb not null default '{}'::jsonb,
  equipment_access boolean not null default false,
  status text not null default 'active' check (status in ('draft','active','paused','completed')),
  approved_at timestamptz, starts_on date, ends_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists biss_programs_trainee_status_idx on public.biss_programs(trainee_id,status,created_at desc);
alter table public.biss_programs enable row level security;
revoke all on public.biss_programs from anon,authenticated;
grant all on public.biss_programs to service_role;

create table if not exists public.biss_training_runs (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.biss_users(id) on delete cascade,
  program_id uuid not null references public.biss_programs(id) on delete cascade,
  session_index integer not null check (session_index>=0 and session_index<100),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(), completed_at timestamptz,
  duration_seconds integer check (duration_seconds is null or (duration_seconds>=0 and duration_seconds<=21600)),
  created_at timestamptz not null default now()
);
create index if not exists biss_training_runs_trainee_program_idx on public.biss_training_runs(trainee_id,program_id,created_at desc);
alter table public.biss_training_runs enable row level security;
revoke all on public.biss_training_runs from anon,authenticated;
grant all on public.biss_training_runs to service_role;

