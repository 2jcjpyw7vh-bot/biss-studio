create table if not exists public.biss_recruitment_posts (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  terms jsonb not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.biss_recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.biss_recruitment_posts(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  qualifications text not null default '',
  experience text not null default '',
  note text not null default '',
  requested_ids uuid[] not null,
  approved_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(post_id,email)
);

alter table public.biss_recruitment_posts enable row level security;
alter table public.biss_recruitment_applications enable row level security;
revoke all on public.biss_recruitment_posts,public.biss_recruitment_applications from public,anon,authenticated;
grant select,insert,update on public.biss_recruitment_posts,public.biss_recruitment_applications to service_role;
create index if not exists biss_recruitment_approved_ids_idx on public.biss_recruitment_applications using gin(approved_ids);

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
  if (posting.terms->>'certifications'<>'' and p_details->>'qualifications'='')
    or (posting.terms->>'experience'<>'' and p_details->>'experience'='') then return 'invalid'; end if;
  if exists(select 1 from public.biss_recruitment_applications a where a.post_id=posting.id and a.email=p_details->>'email') then
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
  insert into public.biss_recruitment_applications(post_id,name,email,phone,qualifications,experience,note,requested_ids)
    values(posting.id,p_details->>'name',p_details->>'email',p_details->>'phone',p_details->>'qualifications',p_details->>'experience',p_details->>'note',p_session_ids);
  return 'saved';
end;
$$;
revoke all on function public.studio_apply_recruitment(uuid,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.studio_apply_recruitment(uuid,jsonb,uuid[]) to service_role;

create or replace function public.studio_approve_recruitment(
  p_application_id uuid,p_session_ids uuid[]
)
returns text language plpgsql security invoker set search_path = '' as $$
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
$$;
revoke all on function public.studio_approve_recruitment(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.studio_approve_recruitment(uuid,uuid[]) to service_role;
