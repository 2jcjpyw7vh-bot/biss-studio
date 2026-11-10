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

