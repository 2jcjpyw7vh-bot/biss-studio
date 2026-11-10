-- BISS Studio only: internal directory and substitute assignment workflow.
create table if not exists public.biss_users (
  id uuid primary key default gen_random_uuid(), full_name text not null, email text not null default '', phone text not null default '',
  role text not null check (role in ('manager','instructor','trainee')), status text not null default 'active' check (status in ('invited','active','inactive')),
  can_view_health boolean not null default false, arbox_user_id text unique, auth_user_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create unique index if not exists biss_users_email_unique on public.biss_users(lower(email)) where email<>'';
alter table public.biss_users add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists biss_users_auth_user_id_unique on public.biss_users(auth_user_id) where auth_user_id is not null;
alter table public.biss_sessions add column if not exists instructor_id uuid references public.biss_users(id) on delete set null;
create index if not exists biss_sessions_instructor_idx on public.biss_sessions(instructor_id,starts_at);
create table if not exists public.biss_substitute_offers (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.biss_sessions(id) on delete cascade,
  instructor_id uuid not null references public.biss_users(id) on delete cascade, token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','cancelled')),
  message text not null default '', show_workout boolean not null default false, expires_at timestamptz not null default (now()+interval '48 hours'), responded_at timestamptz, created_at timestamptz not null default now(),
  unique(session_id,instructor_id)
);
create index if not exists biss_offers_session_idx on public.biss_substitute_offers(session_id,status);
create index if not exists biss_offers_instructor_idx on public.biss_substitute_offers(instructor_id,status);
alter table public.biss_substitute_offers add column if not exists show_workout boolean not null default false;
alter table public.biss_substitute_offers drop constraint if exists biss_substitute_offers_status_check;
alter table public.biss_substitute_offers add constraint biss_substitute_offers_status_check check (status in ('pending','accepted','declined','expired','cancelled'));
alter table public.biss_users enable row level security;
alter table public.biss_substitute_offers enable row level security;
revoke all on public.biss_users,public.biss_substitute_offers from anon,authenticated;
grant all on public.biss_users,public.biss_substitute_offers to service_role;

