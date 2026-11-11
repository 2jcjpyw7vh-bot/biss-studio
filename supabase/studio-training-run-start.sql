-- Serialize starts for the same approved Studio program.
create or replace function public.studio_start_training_run(
  p_trainee_id uuid,
  p_program_id uuid,
  p_session_index integer
)
returns table(run_id uuid, run_started_at timestamptz, reused boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cutoff timestamptz;
  training_run public.biss_training_runs%rowtype;
begin
  -- The parent row also exists when there are no runs to lock yet.
  perform 1 from public.biss_programs p
  where p.id = p_program_id and p.trainee_id = p_trainee_id
  for no key update;
  if not found then
    return;
  end if;

  cutoff := clock_timestamp() - interval '6 hours';
  update public.biss_training_runs r set status = 'abandoned'
  where r.trainee_id = p_trainee_id and r.program_id = p_program_id
    and r.session_index = p_session_index and r.status = 'in_progress'
    and r.started_at < cutoff;

  select r.* into training_run from public.biss_training_runs r
  where r.trainee_id = p_trainee_id and r.program_id = p_program_id
    and r.session_index = p_session_index and r.status = 'in_progress'
  order by r.started_at desc, r.id desc limit 1;
  if found then
    return query select training_run.id, training_run.started_at, true;
    return;
  end if;

  insert into public.biss_training_runs (trainee_id, program_id, session_index, started_at)
  values (p_trainee_id, p_program_id, p_session_index, clock_timestamp())
  returning * into training_run;
  return query select training_run.id, training_run.started_at, false;
end;
$$;

revoke all on function public.studio_start_training_run(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.studio_start_training_run(uuid, uuid, integer) to service_role;
