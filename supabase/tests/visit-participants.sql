begin;
do $$
declare payer uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); coach uuid:=gen_random_uuid(); guest uuid;
 v uuid:=gen_random_uuid(); pid uuid; r jsonb; address text:=gen_random_uuid()||'@example.invalid';
begin
 if has_table_privilege('anon','public.biss_visit_participants','SELECT') or has_table_privilege('authenticated','public.biss_visit_participants','SELECT') then raise exception 'public participant access';end if;
 if has_function_privilege('authenticated','public.studio_visit_participant(uuid,uuid,text,jsonb)','EXECUTE') then raise exception 'public invitation RPC';end if;
 insert into public.biss_users(id,full_name,email,role,status,can_view_health) values(payer,'QA payer',payer||'@example.invalid','trainee','active',false),(stranger,'QA stranger',stranger||'@example.invalid','trainee','active',false),(coach,'QA manager',coach||'@example.invalid','manager','active',false);
 insert into public.biss_visits(id,customer_id,arbox_booking_id,title,service_kind,starts_at,ends_at,party_size,included_items,address,verified_by)
 values(v,payer,'qa-'||v,'QA two places','workout','2099-02-01 10:00Z','2099-02-01 11:00Z',2,'["QA visit"]','QA',coach);
 r:=public.studio_visit_participant(stranger,v,'invite',jsonb_build_object('name','Guest','email',address));if r->>'error'<>'denied' then raise exception 'stranger invited';end if;
 r:=public.studio_visit_participant(payer,v,'invite',jsonb_build_object('name','Payer','email',payer||'@example.invalid'));if r->>'error'<>'self' then raise exception 'self invitation';end if;
 r:=public.studio_visit_participant(payer,v,'invite',jsonb_build_object('name','Guest','email',address));if r->>'id' is null then raise exception 'invite failed: %',r;end if;pid:=(r->>'id')::uuid;
 select user_id into guest from public.biss_visit_participants where id=pid;
 if not exists(select 1 from public.biss_users where id=guest and role='trainee' and status='invited' and can_view_health=false) then raise exception 'unsafe new profile';end if;
 r:=public.studio_visit_participant(payer,v,'invite',jsonb_build_object('name','Guest','email',address));if (r->>'id')::uuid<>pid then raise exception 'duplicate invitation';end if;
 r:=public.studio_visit_participant(payer,v,'invite',jsonb_build_object('name','Overflow','email',gen_random_uuid()||'@example.invalid'));if r->>'error'<>'capacity' then raise exception 'oversold capacity';end if;
 r:=public.studio_visit_participant(payer,v,'reserve_mail',jsonb_build_object('id',pid));if r->>'saved'<>'true' then raise exception 'first mail';end if;
 r:=public.studio_visit_participant(payer,v,'reserve_mail',jsonb_build_object('id',pid));if r->>'error'<>'limit' then raise exception 'mail spam';end if;
 r:=public.studio_visit_participant(stranger,v,'accept','{}');if r->>'error'<>'missing' then raise exception 'stranger accepted';end if;
 update public.biss_users set status='active' where id=guest;
 r:=public.studio_visit_participant(guest,v,'accept','{}');if r->>'saved'<>'true' then raise exception 'guest could not accept';end if;
 if exists(select 1 from public.biss_visit_participants where id=pid and (arbox_verified or health_verified or introduction_completed)) then raise exception 'accept auto-approved training';end if;
 r:=public.studio_visit_participant(payer,v,'verify',jsonb_build_object('id',pid,'arbox_id','999999999999999999','health',true,'introduction',true));if r->>'error'<>'denied' then raise exception 'payer verified health';end if;
 begin update public.biss_visits set party_size=1 where id=v;raise exception 'capacity reduction allowed';exception when check_violation then null;end;
 r:=public.studio_visit_participant(payer,v,'remove',jsonb_build_object('id',pid));if r->>'saved'<>'true' then raise exception 'remove failed';end if;
 if exists(select 1 from public.biss_visit_participants where visit_id=v and user_id=guest and status='accepted') then raise exception 'revocation failed';end if;
 r:=public.studio_visit_participant(payer,v,'invite',jsonb_build_object('name','Guest','email',address));
 update public.biss_users set status='active' where id=guest;
 r:=public.studio_visit_participant(guest,v,'accept','{}');
 update public.biss_visits set customer_id=stranger where id=v;
 if exists(select 1 from public.biss_visit_participants where visit_id=v and status<>'removed') then raise exception 'old guests retained access after purchaser changed';end if;
end $$;
rollback;
select 'PASS: owner/recipient authorization, no privilege grants, no overselling, idempotency, mail rate limiting, acceptance, revocation, capacity guard, purchaser transfer; fixtures rolled back' as result;
