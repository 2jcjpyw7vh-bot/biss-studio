create table public.biss_visit_participants(
 id uuid primary key default gen_random_uuid(),visit_id uuid not null references public.biss_visits(id),
 user_id uuid not null references public.biss_users(id),invited_by uuid not null references public.biss_users(id),
 display_name text not null,contact_phone text not null default '',age_band text not null default 'unknown' check(age_band in ('unknown','minor','adult')),guardian_verified boolean not null default false,token_hash text unique,token_expires_at timestamptz,pending_email text,status text not null default 'invited' check(status in ('invited','accepted','removed')),
 arbox_verified boolean not null default false,health_verified boolean not null default false,
 introduction_completed boolean not null default false,verified_by uuid references public.biss_users(id),
 verified_at timestamptz,accepted_at timestamptz,created_at timestamptz not null default now(),
 last_sent_at timestamptz,send_count integer not null default 0 check(send_count between 0 and 5),
 unique(visit_id,user_id)
);
create unique index biss_visit_participants_phone_idx on public.biss_visit_participants(visit_id,contact_phone) where contact_phone<>'' and status<>'removed';
create index biss_visit_participants_user_idx on public.biss_visit_participants(user_id,status);
alter table public.biss_visit_participants enable row level security;
revoke all on public.biss_visit_participants from public,anon,authenticated;
grant select,insert,update on public.biss_visit_participants to service_role;

create or replace function public.studio_visit_participant(p_actor uuid,p_visit uuid,p_action text,p_value jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor public.biss_users%rowtype; visit public.biss_visits%rowtype; person public.biss_users%rowtype;
 participant public.biss_visit_participants%rowtype; target uuid; address text; begin
 select * into actor from public.biss_users where id=p_actor and status='active';if not found then return jsonb_build_object('error','denied');end if;
 select * into visit from public.biss_visits where id=p_visit for update;
 if not found or visit.status<>'confirmed' or visit.ends_at<=now() then return jsonb_build_object('error','closed');end if;
 if p_action='accept' then
  update public.biss_visit_participants set status='accepted',accepted_at=now() where visit_id=p_visit and user_id=p_actor and status='invited';
  if not found then return jsonb_build_object('error','missing');end if;
  return jsonb_build_object('saved',true);
 end if;
 if actor.role<>'manager' and actor.id<>visit.customer_id then return jsonb_build_object('error','denied');end if;
 if p_action='invite' then
  address=lower(btrim(p_value->>'email'));
  if address is null or length(address)>180 or address !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$' or coalesce(btrim(p_value->>'name'),'')='' then return jsonb_build_object('error','invalid');end if;
  if (select lower(email) from public.biss_users where id=visit.customer_id)=address then return jsonb_build_object('error','self');end if;
  if (select count(*) from public.biss_visit_participants where invited_by=p_actor and created_at>now()-interval '1 day')>=20 then return jsonb_build_object('error','limit');end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('biss_participant:'||address,0));
  select * into person from public.biss_users where lower(email)=address;
  if found and person.status not in ('active','invited') then return jsonb_build_object('error','invalid_recipient');end if;
  if found then
   select * into participant from public.biss_visit_participants where visit_id=p_visit and user_id=person.id;
   if found and participant.status<>'removed' then return jsonb_build_object('id',participant.id,'reused',true);end if;
  end if;
  if 1+(select count(*) from public.biss_visit_participants where visit_id=p_visit and status<>'removed')>=visit.party_size then return jsonb_build_object('error','capacity');end if;
  if person.id is null then
   insert into public.biss_users(full_name,email,phone,role,status,can_view_health) values(left(btrim(p_value->>'name'),120),address,left(coalesce(p_value->>'phone',''),40),'trainee','invited',false) returning * into person;
  end if;
  insert into public.biss_visit_participants(visit_id,user_id,invited_by,display_name,age_band) values(p_visit,person.id,p_actor,left(btrim(p_value->>'name'),120),case when p_value->>'age_band' in ('minor','adult') then p_value->>'age_band' else 'unknown' end)
   on conflict(visit_id,user_id) do update set status='invited',invited_by=excluded.invited_by,display_name=excluded.display_name,accepted_at=null,arbox_verified=false,health_verified=false,introduction_completed=false,verified_by=null,verified_at=null
   returning id into target;
  return jsonb_build_object('id',target);
 end if;
 select * into participant from public.biss_visit_participants where visit_id=p_visit and id=(p_value->>'id')::uuid for update;
 if not found or participant.status='removed' then return jsonb_build_object('error','missing');end if;
 if p_action='remove' then update public.biss_visit_participants set status='removed' where id=participant.id;return jsonb_build_object('saved',true);end if;
 if p_action='reserve_mail' then
  if participant.send_count>=5 or participant.last_sent_at>now()-interval '60 seconds' then return jsonb_build_object('error','limit');end if;
  update public.biss_visit_participants set last_sent_at=now(),send_count=send_count+1 where id=participant.id;
  return jsonb_build_object('saved',true);
 end if;
 if p_action='verify' then
  if actor.role<>'manager' then return jsonb_build_object('error','denied');end if;
  if coalesce(p_value->>'arbox_id','') !~ '^[0-9]{1,20}$' then return jsonb_build_object('error','invalid');end if;
  update public.biss_users set arbox_user_id=p_value->>'arbox_id' where id=participant.user_id and (arbox_user_id is null or arbox_user_id=p_value->>'arbox_id');
  if not found then return jsonb_build_object('error','identity');end if;
  update public.biss_visit_participants set arbox_verified=true,health_verified=coalesce((p_value->>'health')::boolean,false),introduction_completed=coalesce((p_value->>'introduction')::boolean,false),guardian_verified=coalesce((p_value->>'guardian')::boolean,false),verified_by=p_actor,verified_at=now() where id=participant.id;
  return jsonb_build_object('saved',true);
 end if;
 return jsonb_build_object('error','invalid');end $$;
revoke all on function public.studio_visit_participant(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.studio_visit_participant(uuid,uuid,text,jsonb) to service_role;

create function public.studio_visit_participant_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.customer_id is distinct from old.customer_id or new.status='cancelled' then
  update public.biss_visit_participants set status='removed' where visit_id=new.id and status<>'removed';
 elsif new.party_size<1+(select count(*) from public.biss_visit_participants where visit_id=new.id and status<>'removed') then
  raise exception 'Remove extra participants before reducing booking capacity' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function public.studio_visit_participant_guard() from public,anon,authenticated;
grant execute on function public.studio_visit_participant_guard() to service_role;
create trigger biss_visit_participant_guard after update of customer_id,status,party_size on public.biss_visits for each row execute function public.studio_visit_participant_guard();

create function public.studio_phone_participant(p_actor uuid,p_visit uuid,p_name text,p_phone text,p_age text,p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor public.biss_users%rowtype; visit public.biss_visits%rowtype; target uuid; begin
 select * into actor from public.biss_users where id=p_actor and status='active';if not found then return jsonb_build_object('error','denied');end if;
 select * into visit from public.biss_visits where id=p_visit for update;
 if not found or visit.status<>'confirmed' or visit.ends_at<=now() then return jsonb_build_object('error','closed');end if;
 if actor.role<>'manager' and actor.id<>visit.customer_id then return jsonb_build_object('error','denied');end if;
 if p_phone !~ '^[1-9][0-9]{7,14}$' or p_hash !~ '^[a-f0-9]{64}$' or coalesce(btrim(p_name),'')='' or p_age not in ('unknown','minor','adult') then return jsonb_build_object('error','invalid');end if;
 select id into target from public.biss_visit_participants where visit_id=p_visit and contact_phone=p_phone and status<>'removed';
 if target is not null then return jsonb_build_object('id',target,'reused',true);end if;
 if (select count(*) from public.biss_visit_participants where invited_by=p_actor and created_at>now()-interval '1 day')>=20 then return jsonb_build_object('error','limit');end if;
 if 1+(select count(*) from public.biss_visit_participants where visit_id=p_visit and status<>'removed')>=visit.party_size then return jsonb_build_object('error','capacity');end if;
 insert into public.biss_visit_participants(visit_id,invited_by,display_name,contact_phone,age_band,token_hash,token_expires_at) values(p_visit,p_actor,left(btrim(p_name),120),p_phone,p_age,p_hash,least(visit.ends_at,now()+interval '7 days')) returning id into target;
 return jsonb_build_object('id',target);
end $$;
revoke all on function public.studio_phone_participant(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.studio_phone_participant(uuid,uuid,text,text,text,text) to service_role;

create function public.studio_claim_participant(p_hash text,p_action text,p_email text,p_user uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare invitation public.biss_visit_participants%rowtype; person public.biss_users%rowtype; begin
 select * into invitation from public.biss_visit_participants where token_hash=p_hash for update;
 if not found or invitation.status<>'invited' or invitation.token_expires_at<=now() then return jsonb_build_object('error','expired');end if;
 if not exists(select 1 from public.biss_visits where id=invitation.visit_id and status='confirmed' and ends_at>now()) then return jsonb_build_object('error','expired');end if;
 if p_action='email' then
  if invitation.send_count>=5 or invitation.last_sent_at>now()-interval '60 seconds' then return jsonb_build_object('error','limit');end if;
  if p_email is null or length(p_email)>180 or p_email !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$' then return jsonb_build_object('error','invalid');end if;
  if exists(select 1 from public.biss_visits v join public.biss_users u on u.id=v.customer_id where v.id=invitation.visit_id and lower(u.email)=p_email) then return jsonb_build_object('error','self');end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('biss_participant:'||p_email,0));
  select * into person from public.biss_users where lower(email)=p_email;
  if found and person.status not in ('active','invited') then return jsonb_build_object('error','invalid');end if;
  if person.id is null then insert into public.biss_users(full_name,email,role,status,can_view_health) values(invitation.display_name,p_email,'trainee','invited',false);end if;
  update public.biss_visit_participants set pending_email=p_email,last_sent_at=now(),send_count=send_count+1 where id=invitation.id;
  return jsonb_build_object('saved',true);
 end if;
 if p_action='accept' then
  select * into person from public.biss_users where id=p_user and status='active' and lower(email)=invitation.pending_email;
  if not found then return jsonb_build_object('error','identity');end if;
  if exists(select 1 from public.biss_visit_participants where visit_id=invitation.visit_id and user_id=p_user and id<>invitation.id) then return jsonb_build_object('error','duplicate');end if;
  update public.biss_visit_participants set user_id=person.id,status='accepted',accepted_at=now(),token_hash=null,token_expires_at=null where id=invitation.id;
  return jsonb_build_object('saved',true,'visit_id',invitation.visit_id);
 end if;
 return jsonb_build_object('error','invalid');end $$;
revoke all on function public.studio_claim_participant(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.studio_claim_participant(text,text,text,uuid) to service_role;
