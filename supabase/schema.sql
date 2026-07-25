create extension if not exists pgcrypto;

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  name_en text default '',
  category text default 'other',
  quantity integer not null default 0 check (quantity >= 0),
  details text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists shared_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('exercise','workout','program','homework')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table equipment enable row level security;
alter table shared_items enable row level security;
grant all on table equipment to service_role;
grant all on table shared_items to service_role;
