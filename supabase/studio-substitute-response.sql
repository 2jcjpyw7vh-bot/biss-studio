create or replace function public.studio_respond_to_substitute(p_token uuid, p_decision text)
returns table(result text, offer_id uuid)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  target_session uuid;
  selected_offer public.biss_substitute_offers%rowtype;
  selected_session public.biss_sessions%rowtype;
  assigned_name text;
begin
  if p_decision is null or p_decision not in ('accepted','declined') then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select o.session_id into target_session from public.biss_substitute_offers o where o.token=p_token;
  if not found then
    return query select 'missing'::text, null::uuid;
    return;
  end if;

  select s.* into selected_session from public.biss_sessions s where s.id=target_session for update;
  select o.* into selected_offer from public.biss_substitute_offers o where o.token=p_token for update;
  if not found then
    return query select 'missing'::text, null::uuid;
    return;
  end if;

  if selected_offer.status<>'pending' or selected_offer.expires_at<=now()
     or selected_session.status<>'planned' or selected_session.starts_at<=now() then
    return query select 'closed'::text, selected_offer.id;
    return;
  end if;

  if p_decision='accepted' then
    if exists(select 1 from public.biss_substitute_offers o where o.session_id=target_session and o.status='accepted')
      or exists(select 1 from public.biss_recruitment_applications a where a.approved_ids @> array[target_session]) then
      return query select 'closed'::text, selected_offer.id;
      return;
    end if;
    select u.full_name into assigned_name from public.biss_users u
      where u.id=selected_offer.instructor_id and u.status='active' and u.role in ('instructor','manager') for share;
    if not found then
      return query select 'unavailable'::text, selected_offer.id;
      return;
    end if;
    update public.biss_sessions set instructor_id=selected_offer.instructor_id,instructor_name=assigned_name where id=target_session;
    update public.biss_substitute_offers set status='cancelled',responded_at=now()
      where session_id=target_session and id<>selected_offer.id and status='pending';
  end if;
  update public.biss_substitute_offers set status=p_decision,responded_at=now() where id=selected_offer.id;
  return query select 'saved'::text, selected_offer.id;
end;
$function$;

revoke all on function public.studio_respond_to_substitute(uuid,text) from public,anon,authenticated;
grant execute on function public.studio_respond_to_substitute(uuid,text) to service_role;

create or replace function public.studio_create_substitute_offer(
  p_session uuid, p_instructor uuid, p_hours integer, p_message text, p_show_workout boolean
)
returns table(result text, offer_id uuid, offer_token uuid)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  selected_session public.biss_sessions%rowtype;
  selected_offer public.biss_substitute_offers%rowtype;
  offer_expiry timestamptz;
  show_plan boolean;
begin
  select s.* into selected_session from public.biss_sessions s where s.id=p_session for update;
  if not found or selected_session.status<>'planned' or selected_session.starts_at<=now() then
    return query select 'invalid_session'::text,null::uuid,null::uuid;
    return;
  end if;
  perform 1 from public.biss_users u
    where u.id=p_instructor and u.status='active' and u.role in ('instructor','manager') for share;
  if not found then
    return query select 'invalid_instructor'::text,null::uuid,null::uuid;
    return;
  end if;
  if exists(select 1 from public.biss_substitute_offers o where o.session_id=p_session and o.status='accepted')
    or exists(select 1 from public.biss_recruitment_applications a where a.approved_ids @> array[p_session]) then
    return query select 'already_assigned'::text,null::uuid,null::uuid;
    return;
  end if;

  select o.* into selected_offer from public.biss_substitute_offers o
    where o.session_id=p_session and o.instructor_id=p_instructor for update;
  if selected_offer.status='pending' and selected_offer.expires_at>now() then
    return query select 'reused'::text,selected_offer.id,selected_offer.token;
    return;
  end if;
  offer_expiry:=least(selected_session.starts_at,now()+make_interval(hours=>case when p_hours in (24,48,72) then p_hours else 48 end));
  show_plan:=coalesce(p_show_workout,false) and (selected_session.workout_summary<>'' or selected_session.playlist_url<>'');
  if selected_offer.id is null then
    insert into public.biss_substitute_offers(session_id,instructor_id,status,message,show_workout,expires_at)
      values(p_session,p_instructor,'pending',left(coalesce(p_message,''),1200),show_plan,offer_expiry)
      returning * into selected_offer;
  else
    update public.biss_substitute_offers
      set token=gen_random_uuid(),status='pending',message=left(coalesce(p_message,''),1200),
          show_workout=show_plan,expires_at=offer_expiry,responded_at=null
      where id=selected_offer.id returning * into selected_offer;
  end if;
  return query select 'created'::text,selected_offer.id,selected_offer.token;
end;
$function$;

revoke all on function public.studio_create_substitute_offer(uuid,uuid,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.studio_create_substitute_offer(uuid,uuid,integer,text,boolean) to service_role;
