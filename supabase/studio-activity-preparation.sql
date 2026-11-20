-- Studio-only additive preparation workflow. Access is through authenticated server routes.
-- No payment or booked-extra inference from a calendar row. No fitness equipment permission.
alter table public.biss_users drop constraint biss_users_role_check;
alter table public.biss_users add constraint biss_users_role_check check(role in ('manager','instructor','trainee','operator'));
alter table public.biss_users add constraint biss_operator_no_health check(role<>'operator' or can_view_health=false);

create table public.biss_activity_jobs(
 id uuid primary key default gen_random_uuid(),
 arbox_schedule_id text not null unique check(length(arbox_schedule_id) between 1 and 80),
 title text not null,kind text not null check(kind in ('dj','self_workout','hourly')),
 starts_at timestamptz not null,ends_at timestamptz not null,
 assigned_id uuid references public.biss_users(id),customer_id uuid references public.biss_users(id),
 party_size integer not null default 1 check(party_size between 1 and 12),
 booking_reference text not null default '',receipt text not null default '',
 terms jsonb not null default '{"items":[]}',plan jsonb not null default '{"picks":[]}',
 status text not null default 'draft' check(status in ('draft','submitted','ready','cancelled')),
 revision integer not null default 1,visit_id uuid unique references public.biss_visits(id),
 verified_by uuid references public.biss_users(id),verified_at timestamptz,
 created_by uuid not null references public.biss_users(id),created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_at>=starts_at+interval '15 minutes' and ends_at<=starts_at+interval '12 hours'),
 check(jsonb_typeof(terms->'items')='array' and jsonb_array_length(terms->'items')<=40),
 check(jsonb_typeof(plan->'picks')='array' and jsonb_array_length(plan->'picks')<=40)
);
create index biss_activity_jobs_assignee_idx on public.biss_activity_jobs(assigned_id,starts_at);
alter table public.biss_activity_jobs enable row level security;
revoke all on public.biss_activity_jobs from public,anon,authenticated;
grant select,insert,update on public.biss_activity_jobs to service_role;

create or replace function public.studio_prepare_activity(p_id uuid,p_actor uuid,p_revision integer,p_action text,p_value jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare job public.biss_activity_jobs%rowtype; actor public.biss_users%rowtype;
 person public.biss_users%rowtype; item jsonb; visit uuid; result text; begin
 select * into actor from public.biss_users where id=p_actor and status='active';
 if not found or actor.role not in ('manager','instructor','operator') then return 'denied';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('biss_studio_visit',0));
 select * into job from public.biss_activity_jobs where id=p_id for update;
 if not found then return 'missing';end if;
 if actor.role<>'manager' and (job.assigned_id is distinct from actor.id or (job.kind='self_workout' and actor.role<>'instructor') or (job.kind<>'self_workout' and actor.role<>'operator')) then return 'denied';end if;
 if job.revision<>p_revision then return 'changed';end if;
 if job.status='cancelled' or job.ends_at<=now() then return 'closed';end if;
 if p_action in ('configure','approve','reopen','cancel') and actor.role<>'manager' then return 'denied';end if;
 if p_action in ('configure','save','submit') and job.status='ready' then return 'ready';end if;
 if p_action='configure' then
  select * into person from public.biss_users where id=(p_value->>'assigned_id')::uuid and status='active';
  if not found or (person.role<>'manager' and ((job.kind='self_workout' and person.role<>'instructor') or (job.kind<>'self_workout' and person.role<>'operator'))) then return 'invalid_assignee';end if;
  if not exists(select 1 from public.biss_users where id=(p_value->>'customer_id')::uuid and status='active') then return 'invalid_customer';end if;
  if coalesce(btrim(p_value->>'receipt'),'')='' or coalesce(btrim(p_value->>'booking_reference'),'')='' then return 'unverified';end if;
  if jsonb_typeof(p_value->'terms'->'items') is distinct from 'array' then return 'invalid';end if;
  if exists(select 1 from public.biss_visits where status='confirmed' and id is distinct from job.visit_id and starts_at<job.ends_at and ends_at>job.starts_at) then return 'overlap';end if;
  if exists(select 1 from public.biss_visits where arbox_booking_id=p_value->>'booking_reference' and id is distinct from job.visit_id) then return 'duplicate';end if;
  visit=coalesce(job.visit_id,gen_random_uuid());
  insert into public.biss_visits(id,customer_id,arbox_booking_id,title,service_kind,activities,starts_at,ends_at,party_size,included_items,address,instructions,equipment_notes,verified_by)
  values(visit,(p_value->>'customer_id')::uuid,p_value->>'booking_reference',job.title,case when job.kind='dj' then 'dj' when job.kind='self_workout' then 'workout' else 'leisure' end,
   case when job.kind='dj' then '["dj"]'::jsonb when job.kind='self_workout' then '["workout"]'::jsonb else '["leisure"]'::jsonb end,job.starts_at,job.ends_at,(p_value->>'party_size')::integer,
   jsonb_build_array(job.title)||(select coalesce(jsonb_agg((entry->>'name')||' × '||(entry->>'quantity')),'[]'::jsonb) from jsonb_array_elements(p_value->'terms'->'items') entry),
   'הזורעים 6 מושב היוגב','','',actor.id)
  on conflict(id) do update set customer_id=excluded.customer_id,arbox_booking_id=excluded.arbox_booking_id,party_size=excluded.party_size,
   included_items=excluded.included_items,instructions='',equipment_notes='',status='confirmed',verified_by=excluded.verified_by,verified_at=now(),revision=public.biss_visits.revision+1;
  update public.biss_activity_jobs set assigned_id=person.id,customer_id=(p_value->>'customer_id')::uuid,
   party_size=(p_value->>'party_size')::integer,booking_reference=p_value->>'booking_reference',receipt=p_value->>'receipt',
   terms=p_value->'terms',plan='{"picks":[]}',visit_id=visit,verified_by=actor.id,verified_at=now(),status='draft',revision=revision+1,updated_at=now() where id=p_id;
  return 'saved';
 end if;
 if p_action in ('save','submit') then
  if job.assigned_id is null or job.verified_at is null then return 'unverified';end if;
  if jsonb_typeof(p_value->'picks') is distinct from 'array' or jsonb_array_length(p_value->'picks')>40 then return 'invalid';end if;
  if (select count(*)<>count(distinct pick->>'id') from jsonb_array_elements(p_value->'picks') pick) then return 'invalid';end if;
  for item in select value from jsonb_array_elements(p_value->'picks') loop
   if not exists(select 1 from jsonb_array_elements(job.terms->'items') allowed where allowed->>'id'=item->>'id' and (item->>'quantity')::integer between 1 and (allowed->>'quantity')::integer) then return 'invalid';end if;
  end loop;
  if p_action='submit' then
   if coalesce(btrim(p_value->>'arrivalInstructions'),'')='' or coalesce(btrim(p_value->>'departureInstructions'),'')='' then return 'incomplete';end if;
   if exists(select 1 from jsonb_array_elements(job.terms->'items') allowed where (allowed->>'required')::boolean and not exists(select 1 from jsonb_array_elements(p_value->'picks') pick where pick->>'id'=allowed->>'id' and (pick->>'quantity')::integer=(allowed->>'quantity')::integer)) then return 'incomplete';end if;
  end if;
  update public.biss_activity_jobs set plan=p_value,status=case when p_action='submit' then 'submitted' else 'draft' end,revision=revision+1,updated_at=now() where id=p_id;return 'saved';
 end if;
 if p_action in ('reopen','cancel') then
  if job.starts_at<=now() then return 'closed';end if;
  if job.visit_id is not null then update public.biss_visits set status=case when p_action='cancel' then 'cancelled' else 'confirmed' end,instructions='',equipment_notes='',revision=revision+1 where id=job.visit_id;end if;
  update public.biss_activity_jobs set status=case when p_action='cancel' then 'cancelled' else 'draft' end,revision=revision+1,updated_at=now() where id=p_id;return 'saved';
 end if;
 if p_action='approve' then
  if p_value->>'availabilityVerified' is distinct from 'true' then return 'unverified';end if;
  if job.kind='self_workout' then return 'workout_required';end if;
  if job.status<>'submitted' or job.customer_id is null or job.verified_at is null then return 'incomplete';end if;
  if coalesce(btrim(job.plan->>'arrivalInstructions'),'')='' or coalesce(btrim(job.plan->>'departureInstructions'),'')='' then return 'incomplete';end if;
  if not exists(select 1 from public.biss_users where id=job.assigned_id and status='active' and role in ('manager','operator')) then return 'invalid_assignee';end if;
  if not exists(select 1 from public.biss_users where id=job.customer_id and status='active') then return 'invalid_customer';end if;
  if exists(select 1 from public.biss_visits where status='confirmed' and id is distinct from job.visit_id and starts_at<job.ends_at and ends_at>job.starts_at) then return 'overlap';end if;
  if exists(select 1 from public.biss_visits where arbox_booking_id=job.booking_reference and id is distinct from job.visit_id) then return 'duplicate';end if;
  visit=coalesce(job.visit_id,gen_random_uuid());
  insert into public.biss_visits(id,customer_id,arbox_booking_id,title,service_kind,activities,starts_at,ends_at,party_size,included_items,address,instructions,equipment_notes,verified_by)
  values(visit,job.customer_id,job.booking_reference,job.title,case when job.kind='dj' then 'dj' else 'leisure' end,
   case when job.kind='dj' then '["dj"]'::jsonb else '["leisure"]'::jsonb end,job.starts_at,job.ends_at,job.party_size,
   jsonb_build_array(job.title)||(select coalesce(jsonb_agg((entry->>'name')||' × '||(entry->>'quantity')),'[]'::jsonb) from jsonb_array_elements(job.terms->'items') entry),
   'הזורעים 6 מושב היוגב',coalesce(job.plan->>'clientInstructions','')||E'\n\nהגעה וקבלת פנים: '||(job.plan->>'arrivalInstructions')||E'\n\nבסיום: '||(job.plan->>'departureInstructions'),
   coalesce(job.terms->>'notes',''),actor.id)
  on conflict(id) do update set customer_id=excluded.customer_id,arbox_booking_id=excluded.arbox_booking_id,title=excluded.title,party_size=excluded.party_size,
   included_items=excluded.included_items,instructions=excluded.instructions,equipment_notes=excluded.equipment_notes,status='confirmed',verified_by=excluded.verified_by,verified_at=now(),revision=public.biss_visits.revision+1;
  update public.biss_activity_jobs set status='ready',visit_id=visit,revision=revision+1,updated_at=now() where id=p_id;return 'saved';
 end if;
 return 'invalid';end $$;
revoke all on function public.studio_prepare_activity(uuid,uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.studio_prepare_activity(uuid,uuid,integer,text,jsonb) to service_role;
