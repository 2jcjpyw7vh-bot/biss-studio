begin;
do $qa$
declare gid uuid; sid uuid; pid uuid; tok uuid; aid uuid; terms jsonb; result text;
begin
insert into public.biss_groups(name) values ('QA recruitment transaction rollback') returning id into gid;
insert into public.biss_sessions(group_id,title,starts_at) values(gid,'QA',now()+interval '2 days') returning id into sid;
terms=jsonb_build_object('title','QA','experience','','documentPolicy',1,'requireCertificate',true,'requireInsurance',true,'slots',
jsonb_build_array(jsonb_build_object('id',sid,'startsAt',now()+interval '2 days','originalInstructorId',null,'originalInstructorName','')));
insert into public.biss_recruitment_posts(terms,status) values(terms,'closed') returning id,token into pid,tok;
select public.studio_apply_recruitment(tok,jsonb_build_object('professional_insurance',true,'qualifications','QA'),array[sid]) into result;
if result<>'closed' then raise exception 'draft allowed applications'; end if;
update public.biss_recruitment_posts set status='open' where id=pid;
select public.studio_apply_recruitment(tok,jsonb_build_object('professional_insurance',true,'qualifications','QA','insurance_valid_until',(current_date+10)::text),array[sid]) into result;
if result<>'invalid' then raise exception 'missing files accepted'; end if;
select public.studio_apply_recruitment(tok,jsonb_build_object('professional_insurance',true,'qualifications','QA','name','QA','email','qa@example.invalid','phone','','experience','','note','','insurance_valid_until',(current_date+10)::text,'certificate_mime','application/pdf','certificate_base64','JVBERi0=','insurance_mime','application/pdf','insurance_base64','JVBERi0='),array[sid]) into result;
if result<>'saved' then raise exception 'valid app failed %',result; end if;
select id into aid from public.biss_recruitment_applications where post_id=pid;
select public.studio_approve_recruitment(aid,array[sid]) into result;
if result<>'invalid' then raise exception 'unreviewed documents accepted'; end if;
update public.biss_recruitment_applications set documents_reviewed_at=now(),insurance_valid_until=current_date where id=aid;
select public.studio_approve_recruitment(aid,array[sid]) into result;
if result<>'invalid' then raise exception 'expired documents accepted'; end if;
update public.biss_recruitment_applications set insurance_valid_until=current_date+10 where id=aid;
select public.studio_approve_recruitment(aid,array[sid]) into result;
if result<>'saved' then raise exception 'valid approval failed %',result; end if;
select public.studio_approve_recruitment(aid,array[sid]) into result;
if result<>'saved' then raise exception 'idempotency failed'; end if;
end $qa$;
rollback;
select 'PASS: draft blocked; missing docs blocked; unreviewed blocked; expired blocked; approved assigned; retry idempotent; all fixtures rolled back' as qa;
