import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {selfServiceAccess} from "../../../lib/self-service-access";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function authorizedProgram(db,profile,programId,sessionIndex){
 const{data:program,error}=await db.from("biss_programs").select("id,trainee_id,coach_id,program_payload,equipment_access,status,approved_at,starts_on,ends_on").eq("id",programId).eq("trainee_id",profile.id).single();
 const sessions=Array.isArray(program?.program_payload?.sessions)?program.program_payload.sessions:[];
 if(error||!program||!sessions[sessionIndex]||!selfServiceAccess(profile,program).equipment)return null;
 return program;
}
export async function POST(req){
 const db=supabaseAdmin();if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const{profile,error,status}=await studioProfileFromRequest(req,db);if(error)return reply({error},status);if(profile.role!=="trainee")return reply({error:"אזור זה מיועד למתאמנות"},403);
 const body=await req.json(),programId=String(body.program_id||""),sessionIndex=Number(body.session_index);
 if(body.action==="start"){
  if(!Number.isInteger(sessionIndex)||sessionIndex<0)return reply({error:"אימון לא תקין"},400);
  if(!await authorizedProgram(db,profile,programId,sessionIndex))return reply({error:"האימון אינו מאושר"},403);
  const {data:started,error:startError}=await db.rpc("studio_start_training_run",{
   p_trainee_id:profile.id,p_program_id:programId,p_session_index:sessionIndex
  }).maybeSingle();
  if(startError)return reply({error:"לא ניתן להתחיל מעקב אימון. אפשר לנסות שוב."},503);
  if(!started)return reply({error:"האימון אינו מאושר"},403);
  return reply({run:{id:started.run_id,started_at:started.run_started_at},reused:started.reused});
 }
 if(body.action==="complete"){
  const runId=String(body.run_id||"");if(!runId)return reply({error:"חסר רישום אימון"},400);
  const completionFields="id,duration_seconds,completed_at";
  const read=()=>db.from("biss_training_runs").select(`${completionFields},started_at,status`).eq("id",runId).eq("trainee_id",profile.id).maybeSingle();
  const {data:run,error:readError}=await read();
  if(readError)return reply({error:"לא ניתן לבדוק את רישום האימון. אפשר לנסות שוב."},503);
  if(!run||run.status==="abandoned")return reply({error:"רישום האימון אינו פעיל"},409);
  const completion=({id,duration_seconds,completed_at})=>({id,duration_seconds,completed_at});
  if(run.status==="completed")return reply({run:completion(run)});
  const now=new Date();
  const duration=Math.min(21600,Math.max(0,Math.floor((now-new Date(run.started_at))/1000)));
  const {data:completed,error:updateError}=await db.from("biss_training_runs")
   .update({status:"completed",completed_at:now.toISOString(),duration_seconds:duration})
   .eq("id",run.id).eq("trainee_id",profile.id).eq("status","in_progress")
   .select(completionFields).maybeSingle();
  if(updateError)return reply({error:"לא ניתן להשלים את האימון. אפשר לנסות שוב."},503);
  if(completed)return reply({run:completed});
  const {data:latest,error:latestError}=await read();
  if(latestError)return reply({error:"לא ניתן לבדוק אם האימון נשמר. אפשר לנסות שוב."},503);
  if(latest?.status==="completed")return reply({run:completion(latest)});
  return reply({error:"רישום האימון אינו פעיל"},409);
 }
 return reply({error:"פעולה לא מוכרת"},400);
}
