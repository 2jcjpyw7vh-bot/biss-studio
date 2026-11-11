import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {nextSessionIndex,selfServiceAccess,studioCalendarDate} from "../../../lib/self-service-access";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(req) {
 const db=supabaseAdmin();
 if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const {profile,error,status}=await studioProfileFromRequest(req,db);
 if(error)return reply({error},status);
 if(profile.role!=="trainee")return reply({error:"אזור זה מיועד למתאמנות"},403);

 const now=new Date();
 const today=studioCalendarDate(now);
 // A future assignment must not replace the current program before it starts.
 // The latest assignment that has started still determines equipment approval.
 const {data:program,error:programError}=await db.from("biss_programs")
  .select("id,coach_id,title,summary,program_payload,equipment_access,status,approved_at,starts_on,ends_on")
  .eq("trainee_id",profile.id).eq("status","active")
  .or(`starts_on.is.null,starts_on.lte.${today}`)
  .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle();
 if(programError)return reply({error:"לא ניתן לטעון את התוכנית"},503);

 const access=selfServiceAccess(profile,program,now);
 let completed=[];
 if(access.equipment){
  const {data:runs,error:runsError}=await db.from("biss_training_runs").select("session_index")
   .eq("trainee_id",profile.id).eq("program_id",program.id).eq("status","completed");
  if(runsError)return reply({error:"לא ניתן לטעון התקדמות"},503);
  completed=[...new Set((runs||[]).map(run=>run.session_index))];
 }
 const sessions=access.equipment&&Array.isArray(program?.program_payload?.sessions)?program.program_payload.sessions:[];
 return reply({
  profile:{full_name:profile.full_name,role:profile.role,status:profile.status},
  access,
  program:access.equipment?program:null,
  progress:{completed_sessions:completed,next_session_index:nextSessionIndex(sessions.length,completed)},
  alternatives:[{id:"mat-pilates",title:"פילאטיס מזרן"},{id:"gentle-yoga",title:"יוגה עדינה"}]
 });
}
