create table public.biss_visits (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.biss_users(id),
 arbox_booking_id text not null unique check(length(arbox_booking_id) between 1 and 120),
 title text not null check(length(title) between 1 and 180),
 service_kind text not null check(service_kind in ('workout','dj','leisure','mixed')),
 starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'confirmed' check(status in ('confirmed','cancelled','completed')),
 party_size integer not null check(party_size between 1 and 12),
 resource_key text not null default 'studio' check(resource_key='studio'),
 included_items jsonb not null check(jsonb_typeof(included_items)='array' and jsonb_array_length(included_items) between 1 and 20),
 address text not null default 'הזורעים 6 מושב היוגב',
 instructions text not null default '',equipment_notes text not null default '',
 verification_method text not null default 'manager_arbox' check(verification_method='manager_arbox'),
 verified_by uuid not null references public.biss_users(id),verified_at timestamptz not null default now(),
 preferences jsonb not null default '{}'::jsonb,revision integer not null default 1,
 created_at timestamptz not null default now(),
 check(ends_at>=starts_at+interval '15 minutes' and ends_at<=starts_at+interval '12 hours')
);
create index biss_visits_customer_start_idx on public.biss_visits(customer_id,starts_at desc);
create index biss_visits_resource_start_idx on public.biss_visits(resource_key,starts_at) where status='confirmed';
alter table public.biss_visits enable row level security;
revoke all on public.biss_visits from public,anon,authenticated;
grant select,insert,update,delete on public.biss_visits to service_role;
create function public.studio_create_visit(p_visit jsonb,p_manager_id uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare existing public.biss_visits%rowtype; begin
 if not exists(select 1 from public.biss_users where id=p_manager_id and role='manager' and status='active') then return 'denied'; end if;
 if not exists(select 1 from public.biss_users where id=(p_visit->>'customer_id')::uuid and role='trainee' and status='active') then return 'invalid_customer'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('biss_studio_visit',0));
 select * into existing from public.biss_visits where arbox_booking_id=p_visit->>'arbox_booking_id' or id=(p_visit->>'id')::uuid;
 if found then
  if existing.id=(p_visit->>'id')::uuid and existing.customer_id=(p_visit->>'customer_id')::uuid and existing.arbox_booking_id=p_visit->>'arbox_booking_id' then return 'saved'; end if;
  return 'duplicate';
 end if;
 if exists(select 1 from public.biss_visits where status='confirmed' and resource_key='studio' and starts_at<(p_visit->>'ends_at')::timestamptz and ends_at>(p_visit->>'starts_at')::timestamptz) then return 'overlap'; end if;
 insert into public.biss_visits(id,customer_id,arbox_booking_id,title,service_kind,starts_at,ends_at,party_size,included_items,address,instructions,equipment_notes,verified_by)
 values((p_visit->>'id')::uuid,(p_visit->>'customer_id')::uuid,p_visit->>'arbox_booking_id',p_visit->>'title',p_visit->>'service_kind',(p_visit->>'starts_at')::timestamptz,(p_visit->>'ends_at')::timestamptz,(p_visit->>'party_size')::integer,p_visit->'included_items',p_visit->>'address',p_visit->>'instructions',p_visit->>'equipment_notes',p_manager_id);
 return 'saved';
end $$;
revoke all on function public.studio_create_visit(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.studio_create_visit(jsonb,uuid) to service_role;
