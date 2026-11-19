alter table public.biss_visits add column activities jsonb check(activities is null or (jsonb_typeof(activities)='array' and activities <@ '["workout","dj","leisure"]'::jsonb));
create or replace function public.studio_create_visit(p_visit jsonb,p_manager_id uuid)
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
 insert into public.biss_visits(id,customer_id,arbox_booking_id,title,service_kind,activities,starts_at,ends_at,party_size,included_items,address,instructions,equipment_notes,verified_by)
 values((p_visit->>'id')::uuid,(p_visit->>'customer_id')::uuid,p_visit->>'arbox_booking_id',p_visit->>'title',p_visit->>'service_kind',p_visit->'activities',(p_visit->>'starts_at')::timestamptz,(p_visit->>'ends_at')::timestamptz,(p_visit->>'party_size')::integer,p_visit->'included_items',p_visit->>'address',p_visit->>'instructions',p_visit->>'equipment_notes',p_manager_id);
 return 'saved';
end $$;
revoke all on function public.studio_create_visit(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.studio_create_visit(jsonb,uuid) to service_role;

