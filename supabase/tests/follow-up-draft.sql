-- Transactional fixture only: no publication, message or equipment approval.
begin;
do $$
declare
 fixture uuid := gen_random_uuid();
 owner_id uuid;
 initial_frame jsonb := '{"type":"classic","duration":60,"participants":1,"limitations":[]}'::jsonb;
 draft_frame jsonb;
 changed integer;
begin
 select id into owner_id from public.biss_users where status='active' and role='manager' order by id limit 1;
 if owner_id is null then raise exception 'An active manager fixture owner is required'; end if;
 insert into public.biss_workout_tasks(id,arbox_schedule_id,instructor_id,created_by,title,starts_at,frame)
 values(fixture,'qa-followup-'||fixture,owner_id,owner_id,'QA transactional draft',now()+interval '1 day',initial_frame);
 draft_frame := initial_frame||jsonb_build_object('follow_up',jsonb_build_object('updated_at','test-v1','program',jsonb_build_object('sessions',jsonb_build_array(1,2,3,4,5))));
 update public.biss_workout_tasks set frame=draft_frame where id=fixture and instructor_id=owner_id and frame=initial_frame;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Draft CAS did not save'; end if;
 update public.biss_workout_tasks set frame=initial_frame where id=fixture and frame=initial_frame;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'A stale draft overwrote newer content'; end if;
 update public.biss_workout_tasks set frame=jsonb_set(frame,'{follow_up,review_locked_at}',to_jsonb('locked-v1'::text)) where id=fixture and frame=draft_frame;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Review reservation failed'; end if;
 update public.biss_workout_tasks set frame=initial_frame where id=fixture and frame=draft_frame;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'A draft overwrote a reserved review'; end if;
 if exists(select 1 from public.biss_programs where id=fixture) then raise exception 'A draft was incorrectly published'; end if;
end $$;
rollback;
select 'draft CAS, stale-write protection, review reservation, no publication: passed; all fixtures rolled back' as result;
