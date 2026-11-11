alter table public.biss_recruitment_applications
  add column if not exists professional_insurance boolean not null default false,
  add column if not exists certificate_mime text,
  add column if not exists certificate_base64 text;

alter table public.biss_recruitment_applications
  add constraint biss_recruitment_certificate_format check (
    (certificate_mime is null and certificate_base64 is null) or
    (certificate_mime is not null and certificate_base64 is not null and
      certificate_mime in ('application/pdf','image/jpeg','image/png') and
      char_length(certificate_base64) between 1 and 4194304)
  );

create or replace function public.studio_apply_recruitment(
  p_token uuid,p_details jsonb,p_session_ids uuid[]
)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  posting public.biss_recruitment_posts%rowtype;
  matched integer;
begin
  select p.* into posting from public.biss_recruitment_posts p where p.token=p_token for update;
  if not found or posting.status<>'open' then return 'closed'; end if;
  if p_details->'professional_insurance' is distinct from 'true'::jsonb or coalesce(btrim(p_details->>'qualifications'),'')=''
    or (posting.terms->>'experience'<>'' and p_details->>'experience'='') then return 'invalid'; end if;
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
  insert into public.biss_recruitment_applications(post_id,name,email,phone,qualifications,experience,note,requested_ids,professional_insurance,certificate_mime,certificate_base64)
    values(posting.id,p_details->>'name',p_details->>'email',p_details->>'phone',p_details->>'qualifications',p_details->>'experience',p_details->>'note',p_session_ids,true,p_details->>'certificate_mime',p_details->>'certificate_base64');
  return 'saved';
end;
$$;
revoke all on function public.studio_apply_recruitment(uuid,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.studio_apply_recruitment(uuid,jsonb,uuid[]) to service_role;
