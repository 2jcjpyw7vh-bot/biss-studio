create table if not exists public.biss_studio_playlists (
  id uuid primary key default gen_random_uuid(),
  workout_type text not null check (workout_type in ('classic','functional','functional-hiit','barre','bone-strength')),
  title text not null check (char_length(title) between 1 and 120),
  url text not null,
  created_by uuid references public.biss_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workout_type,url)
);
create index if not exists biss_studio_playlists_type_created_idx
  on public.biss_studio_playlists(workout_type,created_at desc,id desc);
alter table public.biss_studio_playlists enable row level security;
revoke all on public.biss_studio_playlists from public,anon,authenticated;
grant select,insert on public.biss_studio_playlists to service_role;
