begin;
do $$
declare payer uuid:=gen_random_uuid(); manager uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); guest uuid;
 v uuid:=gen_random_uuid(); pid uuid; r jsonb; address text:=gen_random_uuid()||'@example.invalid'; h text:=repeat('a',64);
begin
 if has_function_privilege('anon','public.studio_claim_participant(text,text,text,uuid)','EXECUTE') then raise exception 'public claim RPC';end if;
 insert into public.biss_users(id,full_name,email,role,status,can_view_health) values(payer,'QA payer',payer||'@example.invalid','trainee','active',false),(manager,'QA manager',manager||'@example.invalid','manager','active',false),(stranger,'QA stranger',stranger||'@example.invalid','trainee','active',false);
 insert into public.biss_visits(id,customer_id,arbox_booking_id,title,service_kind,starts_at,ends_at,party_size,included_items,address,verified_by) values(v,payer,'qa-'||v,'QA phone invite','workout','2099-03-01 10:00Z','2099-03-01 11:00Z',2,'["QA"]','QA',manager);
 r:=public.studio_phone_participant(stranger,v,'Guest','972520000000','minor',h);if r->>'error'<>'denied' then raise exception 'stranger phone invite';end if;
 r:=public.studio_phone_participant(payer,v,'Guest','972520000000','minor',h);if r->>'id' is null then raise exception 'phone invite failed: %',r;end if;pid:=(r->>'id')::uuid;
 if not exists(select 1 from public.biss_visit_participants where id=pid and user_id is null and age_band='minor' and guardian_verified=false) then raise exception 'premature account/guardian approval';end if;
 r:=public.studio_claim_participant(repeat('b',64),'email',address);if r->>'error'<>'expired' then raise exception 'wrong token';end if;
 r:=public.studio_claim_participant(h,'email',payer||'@example.invalid');if r->>'error'<>'self' then raise exception 'payer email allowed as guest';end if;
 r:=public.studio_claim_participant(h,'email',address);if r->>'saved'<>'true' then raise exception 'guest email step failed: %',r;end if;
 select id into guest from public.biss_users where email=address;
 r:=public.studio_claim_participant(h,'accept','',stranger);if r->>'error'<>'identity' then raise exception 'wrong account accepted';end if;
 r:=public.studio_claim_participant(h,'accept','',guest);if r->>'error'<>'identity' then raise exception 'unverified invited profile accepted';end if;
 update public.biss_users set status='active' where id=guest;
 r:=public.studio_claim_participant(h,'accept','',guest);if r->>'saved'<>'true' then raise exception 'verified guest could not accept';end if;
 if not exists(select 1 from public.biss_visit_participants where id=pid and user_id=guest and status='accepted' and token_hash is null and not health_verified and not introduction_completed and not guardian_verified) then raise exception 'claim leaked token or approved training';end if;
 r:=public.studio_claim_participant(h,'accept','',guest);if r->>'error'<>'expired' then raise exception 'token reused';end if;
 r:=public.studio_visit_participant(payer,v,'verify',jsonb_build_object('id',pid,'arbox_id','999999999999999998','guardian',true));if r->>'error'<>'denied' then raise exception 'payer approved guardian';end if;
 r:=public.studio_visit_participant(manager,v,'verify',jsonb_build_object('id',pid,'arbox_id','999999999999999998','health',true,'introduction',false,'guardian',true));if r->>'saved'<>'true' then raise exception 'manager review failed: %',r;end if;
 if not exists(select 1 from public.biss_visit_participants where id=pid and guardian_verified and not introduction_completed) then raise exception 'review inferred introduction';end if;
end $$;
rollback;
select 'PASS: phone-only minor invitation, token isolation, email ownership, account activation, single use, guardian review boundaries; all fixtures rolled back' as result;
