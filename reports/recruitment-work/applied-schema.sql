alter table public.biss_recruitment_applications
add column if not exists insurance_mime text,
add column if not exists insurance_base64 text,
add column if not exists insurance_valid_until date,
add column if not exists documents_reviewed_at timestamptz;
alter table public.biss_recruitment_applications add constraint recruitment_insurance_file check (
(insurance_mime is null and insurance_base64 is null) or
(insurance_mime in ('application/pdf','image/jpeg','image/png') and insurance_base64 is not null and length(insurance_base64)<=4194304));
CREATE OR REPLACE FUNCTION public.studio_apply_recruitment(p_token uuid, p_details jsonb, p_session_ids uuid[])
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  posting public.biss_recruitment_posts%rowtype;
  matched integer;
begin
  select p.* into posting from public.biss_recruitment_posts p where p.token=p_token for update;
  if not found or posting.status<>'open' then return 'closed'; end if;
  if p_details->'professional_insurance' is distinct from 'true'::jsonb or coalesce(btrim(p_details->>'qualifications'),'')=''
    or (posting.terms->>'experience'<>'' and p_details->>'experience'='') then return 'invalid'; end if;
  if posting.terms->>'documentPolicy'='1' then
    if coalesce(p_details->>'insurance_valid_until','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return 'invalid'; end if;
    if (posting.terms->>'requireCertificate'='true' and coalesce(p_details->>'certificate_base64','')='')
      or (posting.terms->>'requireInsurance'='true' and coalesce(p_details->>'insurance_base64','')='') then return 'invalid'; end if;
    if exists(select 1 from jsonb_array_elements(posting.terms->'slots') slot where (slot->>'id')::uuid=any(p_session_ids)
      and ((slot->>'startsAt')::timestamptz at time zone 'Asia/Jerusalem')::date>(p_details->>'insurance_valid_until')::date) then return 'invalid'; end if;
  end if;
  if exists(select 1 from public.biss_recruitment_applications a where a.post_id=posting.id and a.email=p_details->>'email') then
    if exists(select 1 from public.biss_recruitment_applications a where a.post_id=posting.id and a.email=p_details->>'email' and not a.professional_insurance) then
      return 'existing';
    end if;
    return 'saved';
  end if;
  if (select count(*) from public.biss_recruitment_applications where post_id=posting.id)>=150 then return 'closed'; end if;
  select count(*) into matched
    from jsonb_array_elements(posting.terms->'slots') slot
    join public.biss_sessions s on s.id=(slot->>'id')::uuid
    where s.id=any(p_session_ids) and s.status='planned' and s.starts_at>now()
      and s.starts_at=(slot->>'startsAt')::timestamptz
      and s.instructor_id::text is not distinct from slot->>'originalInstructorId'
      and s.instructor_name is not distinct from slot->>'originalInstructorName'
      and not exists(select 1 from public.biss_substitute_offers o where o.session_id=s.id and o.status='accepted')
      and not exists(select 1 from public.biss_recruitment_applications a where a.approved_ids @> array[s.id]);
  if matched=0 or matched<>cardinality(p_session_ids) then return 'unavailable'; end if;
  insert into public.biss_recruitment_applications(post_id,name,email,phone,qualifications,experience,note,requested_ids,professional_insurance,certificate_mime,certificate_base64,insurance_mime,insurance_base64,insurance_valid_until)
    values(posting.id,p_details->>'name',p_details->>'email',p_details->>'phone',p_details->>'qualifications',p_details->>'experience',p_details->>'note',p_session_ids,true,p_details->>'certificate_mime',p_details->>'certificate_base64',p_details->>'insurance_mime',p_details->>'insurance_base64',nullif(p_details->>'insurance_valid_until','')::date);
  return 'saved';
end;
$function$;

CREATE OR REPLACE FUNCTION public.studio_approve_recruitment(p_application_id uuid, p_session_ids uuid[])
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  posting public.biss_recruitment_posts%rowtype;
  application public.biss_recruitment_applications%rowtype;
  scheduled public.biss_sessions%rowtype;
  picked uuid;
  slot jsonb;
begin
  select p.* into posting from public.biss_recruitment_posts p
    join public.biss_recruitment_applications a on a.post_id=p.id
    where a.id=p_application_id for update of p;
  if not found then return 'missing'; end if;
  select a.* into application from public.biss_recruitment_applications a where a.id=p_application_id for update;
  if cardinality(p_session_ids)=0 or p_session_ids is null or not (p_session_ids <@ application.requested_ids) then
    return 'invalid';
  end if;
  if p_session_ids <@ application.approved_ids then return 'saved'; end if;
  if posting.status<>'open' then return 'closed'; end if;
  if not application.professional_insurance or btrim(application.qualifications)='' then return 'invalid'; end if;
  if posting.terms->>'documentPolicy'='1' then
    if application.documents_reviewed_at is null or application.insurance_valid_until is null
      or (posting.terms->>'requireCertificate'='true' and application.certificate_mime is null)
      or (posting.terms->>'requireInsurance'='true' and application.insurance_mime is null)
      or exists(select 1 from jsonb_array_elements(posting.terms->'slots') item where (item->>'id')::uuid=any(p_session_ids)
        and ((item->>'startsAt')::timestamptz at time zone 'Asia/Jerusalem')::date>application.insurance_valid_until)
      then return 'invalid'; end if;
  end if;

  -- Lock sessions in the same order for every approval. The private offer workflow
  -- locks the same session row before accepting an offer.
  for picked in select distinct id from unnest(p_session_ids) as picked_ids(id) order by id loop
    if picked=any(application.approved_ids) then continue; end if;
    select value into slot from jsonb_array_elements(posting.terms->'slots') where value->>'id'=picked::text;
    if not found then return 'invalid'; end if;
    select s.* into scheduled from public.biss_sessions s where s.id=picked for update;
    if not found or scheduled.status<>'planned' or scheduled.starts_at<=now()
      or scheduled.starts_at is distinct from (slot->>'startsAt')::timestamptz
      or scheduled.instructor_id::text is distinct from slot->>'originalInstructorId'
      or scheduled.instructor_name is distinct from slot->>'originalInstructorName'
      or exists(select 1 from public.biss_substitute_offers o where o.session_id=picked and o.status='accepted')
      or exists(select 1 from public.biss_recruitment_applications a where a.approved_ids @> array[picked]) then
      return 'unavailable';
    end if;
  end loop;
  update public.biss_sessions set instructor_id=null,instructor_name=application.name
    where id=any(p_session_ids) and not (id=any(application.approved_ids));
  update public.biss_substitute_offers set status='cancelled',responded_at=now()
    where session_id=any(p_session_ids) and status='pending';
  update public.biss_recruitment_applications
    set approved_ids=array(select distinct id from unnest(application.approved_ids || p_session_ids) as all_ids(id))
    where id=p_application_id;
  return 'saved';
end;
$function$;

revoke all on function public.studio_apply_recruitment(uuid,jsonb,uuid[]) from public,anon,authenticated;
revoke all on function public.studio_approve_recruitment(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.studio_apply_recruitment(uuid,jsonb,uuid[]),public.studio_approve_recruitment(uuid,uuid[]) to service_role;

