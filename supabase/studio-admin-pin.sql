-- Applied to the Studio project only. Server-side PIN recovery settings.
create table if not exists public.biss_admin_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

alter table public.biss_admin_settings enable row level security;
revoke all on table public.biss_admin_settings from anon, authenticated;
grant select, insert, update on table public.biss_admin_settings to service_role;

comment on table public.biss_admin_settings is
  'Server-only Studio settings. Values such as PIN hashes must never be returned to clients.';

