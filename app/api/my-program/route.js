import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {activeStudioCustomer,loadCurrentProgram,nextSessionIndex,selfServiceAccess} from "../../../lib/self-service-access";
import {participantTrainingGate} from "../../../lib/visit-participants";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(req) {
 const db=supabaseAdmin();
 if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const {profile,error,status}=await studioProfileFromRequest(req,db);
 if(error)return reply({error},status);
 if(!activeStudioCustomer(profile))return reply({error:"אזור זה מיועד למתאמנות"},403);

 const now=new Date();
 const {data:program,error:programError}=await loadCurrentProgram(db,profile.id,now);
 if(programError)return reply({error:"לא ניתן לטעון את התוכנית"},503);

 const gate=await participantTrainingGate(db,profile.id,now);
 if(gate.error)return reply({error:"לא ניתן לבדוק את השלמת הקליטה"},503);
 const access=gate.pending?{mode:"onboarding_pending",equipment:false}:selfServiceAccess(profile,program,now);
 let completed=[];
 if(access.equipment){
  const {data:runs,error:runsError}=await db.from("biss_training_runs").select("session_index")
   .eq("trainee_id",profile.id).eq("program_id",program.id).eq("status","completed");
  if(runsError)return reply({error:"לא ניתן לטעון התקדמות"},503);
  completed=[...new Set((runs||[]).map(run=>run.session_index))];
 }
 const sessions=access.equipment&&Array.isArray(program?.program_payload?.sessions)?program.program_payload.sessions:[];
 let preparation=null;
 if(!program){
  const pending=await db.from('biss_workout_tasks').select('starts_at,instructor_id,frame').eq('frame->brief->>customerId',profile.id).order('starts_at',{ascending:false}).limit(1).maybeSingle();
  if(pending.error)return reply({error:'לא ניתן לבדוק את הכנת התוכנית.'},503);
  if(pending.data){
   const coach=await db.from('biss_users').select('full_name').eq('id',pending.data.instructor_id).eq('status','active').maybeSingle();
   if(coach.error)return reply({error:'לא ניתן לבדוק את המדריכה של התוכנית.'},503);
   preparation={stage:pending.data.frame?.follow_up?'manager_review':'instructor_preparation',firstAppointment:pending.data.starts_at,coachName:coach.data?.full_name||'צוות הסטודיו'};
  }
 }
 return reply({
  profile:{full_name:profile.full_name,role:profile.role,status:profile.status},
  access,
  preparation,
  program:access.equipment?program:null,
  progress:{completed_sessions:completed,next_session_index:nextSessionIndex(sessions.length,completed)},
  alternatives:gate.pending?[]:[{id:"mat-pilates",title:"פילאטיס מזרן"},{id:"gentle-yoga",title:"יוגה עדינה"}]
 });
}
