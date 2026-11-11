create table if not exists public.biss_workout_tasks (
  id uuid primary key default gen_random_uuid(),
  arbox_schedule_id text not null,
  instructor_id uuid not null references public.biss_users(id),
  created_by uuid not null references public.biss_users(id),
  title text not null,
  starts_at timestamptz not null,
  frame jsonb not null,
  workout jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (arbox_schedule_id, instructor_id)
);

create index if not exists biss_workout_tasks_instructor_starts_idx
  on public.biss_workout_tasks(instructor_id,starts_at);
alter table public.biss_workout_tasks enable row level security;
revoke all on public.biss_workout_tasks from public,anon,authenticated;
grant select,insert,update on public.biss_workout_tasks to service_role;
