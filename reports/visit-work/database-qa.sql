begin;
do $qa$
declare manager_id uuid; client_id uuid; visit_id uuid:=gen_random_uuid(); row jsonb; result text;
begin
insert into public.biss_users(full_name,email,role,status) values ('QA manager visit','visit-manager@example.invalid','manager','active') returning id into manager_id;
insert into public.biss_users(full_name,email,role,status) values ('QA client visit','visit-client@example.invalid','trainee','active') returning id into client_id;
row=jsonb_build_object('id',visit_id,'customer_id',client_id,'arbox_booking_id','QA visit rollback','title','DJ three hours','service_kind','dj','starts_at',now()+interval '30 days','ends_at',now()+interval '30 days 3 hours','party_size',2,'included_items',jsonb_build_array('DJ use - 3h'),'address','QA','instructions','','equipment_notes','');
select public.studio_create_visit(row,client_id) into result;
if result<>'denied' then raise exception 'non-manager accepted'; end if;
select public.studio_create_visit(row,manager_id) into result;
if result<>'saved' then raise exception 'create failed %',result; end if;
select public.studio_create_visit(row,manager_id) into result;
if result<>'saved' then raise exception 'retry failed'; end if;
select public.studio_create_visit(row||jsonb_build_object('id',gen_random_uuid()),manager_id) into result;
if result<>'duplicate' then raise exception 'source duplication accepted'; end if;
select public.studio_create_visit(row||jsonb_build_object('id',gen_random_uuid(),'arbox_booking_id','QA overlap'),manager_id) into result;
if result<>'overlap' then raise exception 'overlap accepted'; end if;
if has_table_privilege('anon','public.biss_visits','SELECT') or has_table_privilege('authenticated','public.biss_visits','SELECT') or has_function_privilege('anon','public.studio_create_visit(jsonb,uuid)','EXECUTE') then raise exception 'private visit privilege exposed'; end if;
update public.biss_visits set status='cancelled' where id=visit_id;
select public.studio_create_visit(row||jsonb_build_object('id',gen_random_uuid(),'arbox_booking_id','QA released slot'),manager_id) into result;
if result<>'saved' then raise exception 'cancelled slot not released'; end if;
end $qa$;
rollback;
select 'PASS: manager-only creation; idempotent retry; duplicate source blocked; overlap blocked; cancelled slot released; private grants; all fixtures rolled back' as qa;
