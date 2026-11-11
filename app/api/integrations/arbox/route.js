import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase";
import {arboxConfiguration,checkArboxConnection,readArboxSchedule} from "../../../../lib/arbox-config";
import {verifyAdminPin} from "../../../../lib/admin-pin";
import {studioProfileFromRequest} from "../../../../lib/studio-auth";
import {matchArboxSessions} from "../../../../lib/arbox-session-matching";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

async function compareSchedule(db,result){
 const {lessons,...summary}=result;
 if(!lessons.length)return {...summary,lessons};
 const ids=[...new Set(lessons.map(lesson=>lesson.scheduleId).filter(Boolean))];
 const day=86400000;
 const earliest=new Date(Date.parse(`${summary.from}T00:00:00Z`)-day).toISOString();
 const latest=new Date(Date.parse(`${summary.to}T00:00:00Z`)+2*day).toISOString();
 const [within,linked]=await Promise.all([
  db.from("biss_sessions").select("title,starts_at,arbox_session_id").eq("status","planned")
    .gte("starts_at",earliest).lt("starts_at",latest).limit(501),
  ids.length ? db.from("biss_sessions").select("starts_at,arbox_session_id").in("arbox_session_id",ids) : {data:[]}
 ]);
 if(within.error||linked.error||within.data?.length>500){
  return {...summary,comparisonUnavailable:true,lessons};
 }
 return {...summary,lessons:matchArboxSessions(lessons,within.data||[],linked.data||[])
   .map((lesson,index)=>({...lesson,scheduleId:lessons[index].scheduleId}))};
}

export async function GET(req){
 if(new URL(req.url).searchParams.get("view")==="schedule"){
  if(!req.headers.get("authorization"))return reply({error:"לתצוגת הלוח נדרשת כניסה אישית של מנהלת Studio."},401);
  const db=supabaseAdmin();
  if(!db)return reply({error:"מסד Studio אינו מחובר"},503);
  const access=await studioProfileFromRequest(req,db);
  if(access.error)return reply({error:access.error},access.status);
  if(access.profile.role!=="manager")return reply({error:"תצוגת הלוח זמינה למנהלות Studio בלבד."},403);
  const result=await readArboxSchedule();
  if(result.error==="not_configured")return reply({error:"נדרש מפתח API פעיל בשרת Studio לפני הצגת הלוח."},503);
  if(result.error==="access_denied")return reply({error:"ארבוקס דחתה את הגישה ללוח. יש לבדוק את המפתח ואת הרשאותיו."},502);
  if(result.error)return reply({error:"לא ניתן לקרוא כרגע את לוח השיעורים מארבוקס."},502);
  return reply(await compareSchedule(db,result));
 }
 if(!await verifyAdminPin(req))return reply({error:"נדרש PIN מנהל"},401);
 const db=supabaseAdmin();if(!db)return reply({error:"מסד Studio אינו מחובר"},503);
 const[groupCount,userCount,sessionCount]=await Promise.all([
  db.from("biss_groups").select("id",{count:"exact",head:true}).not("arbox_group_id","is",null),
  db.from("biss_users").select("id",{count:"exact",head:true}).not("arbox_user_id","is",null),
  db.from("biss_sessions").select("id",{count:"exact",head:true}).not("arbox_session_id","is",null)
 ]);
 const error=groupCount.error||userCount.error||sessionCount.error;if(error)return reply({error:"לא ניתן לבדוק מיפויי Arbox"},503);
 const connection=await checkArboxConnection();
 return reply({configuration:arboxConfiguration(),connection,mappings:{groups:groupCount.count||0,users:userCount.count||0,sessions:sessionCount.count||0},mode:"read_only_check",writes_enabled:false});
}
