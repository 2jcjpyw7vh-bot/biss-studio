import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase";
import {studioProfileFromRequest} from "../../../../lib/studio-auth";
import {readArboxSchedule} from "../../../../lib/arbox-config";
import {studioLocalTimeToIso} from "../../../../lib/studio-time";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req){
  const db=supabaseAdmin();if(!db)return reply({error:"שירות Studio אינו זמין"},503);
  const access=await studioProfileFromRequest(req,db);
  if(access.error)return reply({error:access.error},access.status);
  if(access.profile.role!=="manager")return reply({error:"נדרשת הרשאת ניהול"},403);
  const body=await req.json().catch(()=>null);
  const schedule=await readArboxSchedule();
  if(schedule.error)return reply({error:"לא ניתן לבדוק את הלוח העדכני בארבוקס"},503);
  const lesson=schedule.lessons.find(item=>item.scheduleId===body?.scheduleId);
  const starts_at=lesson&&studioLocalTimeToIso(`${lesson.date}T${lesson.start}`);
  if(!lesson||lesson.cancelled||lesson.instructorName||lesson.secondInstructorName||!starts_at||Date.parse(starts_at)<=Date.now())return reply({error:"אפשר לפתוח גיוס רק לשיעור עתידי שאינו מבוטל וללא מדריכה משובצת בארבוקס."},409);
  let result=await db.from("biss_sessions").select("id,title,starts_at,instructor_id,instructor_name,status").eq("arbox_session_id",lesson.scheduleId).maybeSingle();
  if(result.error)return reply({error:"לא ניתן לבדוק שיעור Studio"},503);
  if(!result.data){
    const possible=await db.from("biss_sessions").select("id").eq("title",lesson.name).eq("starts_at",starts_at).is("arbox_session_id",null).limit(1);
    if(possible.error)return reply({error:"לא ניתן לבדוק התאמות Studio"},503);
    if(possible.data.length)return reply({error:"קיים אימון באותו שם ומועד ב־Studio. יש לבחור אותו במסך צוות והחלפות כדי למנוע כפילות."},409);
    const name=`Arbox · ${lesson.name}`;
    let group=await db.from("biss_groups").select("id").eq("name",name).eq("active",true).limit(1).maybeSingle();
    if(group.error)return reply({error:"לא ניתן לבדוק קבוצה"},503);
    if(!group.data)group=await db.from("biss_groups").insert({name}).select("id").single();
    if(group.error)return reply({error:"לא ניתן להכין את הקבוצה ב־Studio"},503);
    result=await db.from("biss_sessions").insert({group_id:group.data.id,title:lesson.name,starts_at,arbox_session_id:lesson.scheduleId,status:"planned"}).select("id,title,starts_at,instructor_id,instructor_name,status").single();
    if(result.error?.code==="23505")result=await db.from("biss_sessions").select("id,title,starts_at,instructor_id,instructor_name,status").eq("arbox_session_id",lesson.scheduleId).single();
  }
  if(result.error)return reply({error:"לא ניתן להכין גיוס לשיעור"},503);
  if(result.data.status!=="planned"||result.data.instructor_id||result.data.instructor_name||Date.parse(result.data.starts_at)!==Date.parse(starts_at))return reply({error:"האימון ב־Studio כבר שובץ או שונה. יש לבדוק אותו לפני גיוס."},409);
  const people=await db.from("biss_users").select("id,full_name,email,phone,role,status").eq("status","active").in("role",["manager","instructor"]).order("full_name");
  if(people.error)return reply({error:"לא ניתן לטעון מדריכות"},503);
  return reply({session:result.data,users:people.data});
}
