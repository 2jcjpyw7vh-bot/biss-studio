import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {studioLocalTimeToIso} from "../../../lib/studio-time";
import {readArboxSchedule} from "../../../lib/arbox-config";
import {isRecruitmentId} from "../../../lib/recruitment";
import {publicWorkoutShare} from "../../../lib/public-workout-share";
import {canReadWorkoutTask,matchesWorkoutTask,workoutTaskAlternatives,workoutTaskFrame} from "../../../lib/workout-task";

const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const tasks=db=>db.from("biss_workout_tasks");
const fields="id,title,starts_at,instructor_id,frame,submitted_at,workout";

async function access(req) {
  const db=supabaseAdmin();
  if(!db)return {response:reply({error:"שירות Studio אינו זמין."},503)};
  const result=await studioProfileFromRequest(req,db);
  if(result.error)return {response:reply({error:result.error},result.status)};
  if(!["manager","instructor"].includes(result.profile.role))return {response:reply({error:"אין גישה למשימות בנייה."},403)};
  return {db,profile:result.profile};
}

export async function GET(req) {
  const {db,profile,response}=await access(req);
  if(response)return response;
  const params=new URL(req.url).searchParams;
  const id=params.get("id");
  if(params.has("instructors")){
    if(profile.role!=="manager")return reply({error:"נדרשת הרשאת ניהול."},403);
    const {data,error}=await db.from("biss_users").select("id,full_name,email,phone").in("role",["instructor","manager"]).eq("status","active").order("full_name");
    return error?reply({error:"לא ניתן לטעון את רשימת המדריכות."},503):reply({instructors:data});
  }
  if(id!==null){
    if(!isRecruitmentId(id))return reply({error:"הקישור אינו תקין."},400);
    const {data,error}=await tasks(db).select(fields).eq("id",id).maybeSingle();
    if(error)return reply({error:"לא ניתן לטעון את המשימה."},503);
    if(!data||!canReadWorkoutTask(profile,data))return reply({error:"משימת הבנייה לא נמצאה בחשבון הזה."},404);
    return reply({task:data,canSubmit:profile.id===data.instructor_id});
  }
  let query=tasks(db).select("id,title,starts_at,instructor_id,submitted_at").order("starts_at",{ascending:false}).limit(50);
  if(profile.role!=="manager")query=query.eq("instructor_id",profile.id);
  const {data,error}=await query;
  return error?reply({error:"לא ניתן לטעון משימות בנייה."},503):reply({tasks:data});
}

export async function POST(req) {
  const {db,profile,response}=await access(req);
  if(response)return response;
  const body=await req.json().catch(()=>null);
  if(body?.action==="submit"){
    if(!isRecruitmentId(body.id))return reply({error:"הקישור אינו תקין."},400);
    const {data:task,error}=await tasks(db).select(fields).eq("id",body.id).eq("instructor_id",profile.id).maybeSingle();
    if(error)return reply({error:"לא ניתן לבדוק את המשימה."},503);
    if(!task)return reply({error:"משימת הבנייה לא נמצאה בחשבון הזה."},404);
    if(task.submitted_at)return reply({task});
    if(!matchesWorkoutTask(task.frame,body.workout))return reply({error:"האימון צריך להתאים למסגרת שנקבעה למשימה."},400);
    const workout=publicWorkoutShare(body.workout);
    if(!workout||workout.exercises.length>24)return reply({error:"יש לבנות אימון תקין לפני השליחה."},400);
    workout.alternatives=workoutTaskAlternatives(workout.exercises,body.alternatives);
    const result=await tasks(db).update({workout,submitted_at:new Date().toISOString()})
      .eq("id",task.id).eq("instructor_id",profile.id).is("submitted_at",null).select(fields).maybeSingle();
    if(result.error)return reply({error:"לא ניתן לשמור את האימון. אפשר לנסות שוב."},503);
    if(!result.data)return reply({error:"האימון כבר נשלח. יש לפתוח מחדש את המשימה."},409);
    return reply({task:result.data});
  }
  if(body?.action!=="create"||profile.role!=="manager")return reply({error:"נדרשת הרשאת ניהול."},403);
  const frame=workoutTaskFrame(body);
  const starts_at=studioLocalTimeToIso(body.startsAt);
  if(!frame||!starts_at||Date.parse(starts_at)<=Date.now()||!isRecruitmentId(body.instructorId)||!(/^[A-Za-z0-9_-]{1,80}$/).test(body.scheduleId||"")){
    return reply({error:"יש לבחור מדריכה פעילה, שיעור עתידי, סוג אימון, משך ומספר משתתפות תקינים."},400);
  }
  const [schedule,instructor]=await Promise.all([
    readArboxSchedule(),
    db.from("biss_users").select("id").eq("id",body.instructorId).in("role",["instructor","manager"]).eq("status","active").maybeSingle()
  ]);
  if(schedule.error||instructor.error)return reply({error:"לא ניתן לאמת כרגע את השיעור או המדריכה."},503);
  const lesson=schedule.lessons.find(item=>item.scheduleId===body.scheduleId&&!item.cancelled);
  if(!lesson||!instructor.data)return reply({error:"השיעור או המדריכה כבר אינם זמינים."},409);
  const originalStart=studioLocalTimeToIso(`${lesson.date}T${lesson.start}`);
  if(!originalStart||Date.parse(originalStart)<=Date.now())return reply({error:"השיעור בלוח כבר התחיל."},409);
  const {data,error}=await tasks(db).insert({
    arbox_schedule_id:lesson.scheduleId,instructor_id:instructor.data.id,created_by:profile.id,title:lesson.name,starts_at,frame
  }).select(fields).single();
  if(error?.code==="23505")return reply({error:"כבר קיימת משימת בנייה למדריכה הזו בשיעור. אפשר לפתוח אותה מתוך ״האימונים שלי״."},409);
  return error?reply({error:"לא ניתן ליצור את משימת הבנייה."},503):reply({task:data},201);
}
