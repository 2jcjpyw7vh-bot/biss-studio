create table if not exists public.biss_saved_workouts (
  owner_id uuid not null references public.biss_users(id) on delete cascade,
  id uuid not null,
  workout_payload jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (owner_id, id)
);
create index if not exists biss_saved_workouts_owner_date_idx on public.biss_saved_workouts(owner_id, saved_at desc);
alter table public.biss_saved_workouts enable row level security;
revoke all on public.biss_saved_workouts from public, anon, authenticated;
grant select, insert, update on public.biss_saved_workouts to service_role;
