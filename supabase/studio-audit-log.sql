create table if not exists public.biss_audit_log (id bigint generated always as identity primary key,action text not null,entity_type text not null,entity_id text not null default '',label text not null default '',metadata jsonb not null default '{}'::jsonb,actor text not null default 'admin_pin',created_at timestamptz not null default now());
create index if not exists biss_audit_created_idx on public.biss_audit_log(created_at desc);
create index if not exists biss_audit_entity_idx on public.biss_audit_log(entity_type,entity_id,created_at desc);
alter table public.biss_audit_log enable row level security;
revoke all on public.biss_audit_log from anon,authenticated;
grant all on public.biss_audit_log to service_role;

