-- Applied to the Studio project only. Exercises are read through the server API.
alter table public.exercises enable row level security;
revoke all on table public.exercises from anon, authenticated;
grant select, insert, update, delete on table public.exercises to service_role;

