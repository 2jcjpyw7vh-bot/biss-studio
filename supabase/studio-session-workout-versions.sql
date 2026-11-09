alter table public.biss_sessions add column if not exists workout_payload jsonb;
alter table public.biss_sessions add column if not exists workout_version integer not null default 0;
alter table public.biss_sessions add column if not exists workout_saved_at timestamptz;

