import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {readArboxSchedule} from "../../../lib/arbox-config";
import {upcomingArboxLessons,personalLessonFrame} from "../../../lib/instructor-schedule";
import {studioLocalTimeToIso} from "../../../lib/studio-time";
import {publicWorkoutShare} from "../../../lib/public-workout-share";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function access(req){
  const db=supabaseAdmin();if(!db)return {response:reply({error:"שירות Studio אינו זמין."},503)};
  const result=await studioProfileFromRequest(req,db);
  if(result.error)return {response:reply({error:result.error},result.status)};
  if(!["manager","instructor"].includes(result.profile.role))return {response:reply({error:"נדרשת כניסת מדריכה."},403)};
  const person=await db.from("biss_users").select("arbox_user_id").eq("id",result.profile.id).single();
  if(person.error)return {response:reply({error:"לא ניתן לבדוק את קישור ארבוקס."},503)};
  return {db,profile:result.profile,staffId:person.data.arbox_user_id};
}
async function schedule(staffId,offset=0){
  if(!/^\d{1,20}$/.test(staffId||""))return {error:"mapping_required"};
  return readArboxSchedule(process.env,fetch,new Date(Date.now()+offset*86400000),{staffId,days:28});
}
export async function GET(req){
  const {db,profile,staffId,response}=await access(req);if(response)return response;
  if(!staffId)return reply({mappingRequired:true,lessons:[]});
  const offset=Number(new URL(req.url).searchParams.get("offset")||0);
  if(!Number.isInteger(offset)||offset<0||offset>336||offset%28)return reply({error:"טווח הלוח אינו תקין."},400);
  const result=await schedule(staffId,offset);
  if(result.error)return reply({error:"לא ניתן לקרוא כרגע את השיעורים מארבוקס."},502);
  const lessons=upcomingArboxLessons(result.lessons);
  const ids=lessons.map(lesson=>lesson.scheduleId).filter(Boolean);
  const tasks=ids.length?await db.from("biss_workout_tasks").select("id,arbox_schedule_id,submitted_at,frame").eq("instructor_id",profile.id).in("arbox_schedule_id",ids):{data:[]};
  const saved=ids.length?await db.from("biss_sessions").select("arbox_session_id,workout_payload").eq("instructor_id",profile.id).in("arbox_session_id",ids).eq("status","planned"):{data:[]};
  if(tasks.error||saved.error)return reply({error:"לא ניתן לבדוק את האימונים שנבנו."},503);
  return reply({...result,lessons:lessons.map(lesson=>({...lesson,hasSavedWorkout:Boolean(saved.data?.find(session=>session.arbox_session_id===lesson.scheduleId&&publicWorkoutShare(session.workout_payload))),task:tasks.data?.find(task=>task.arbox_schedule_id===lesson.scheduleId)||null})),mappingRequired:false});
}
export async function POST(req){
  const {db,profile,staffId,response}=await access(req);if(response)return response;
  const body=await req.json().catch(()=>null);
  if(!Array.isArray(body?.scheduleIds)||!body.scheduleIds.length||body.scheduleIds.length>12||body.scheduleIds.some(id=>typeof id!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(id)))return reply({error:"יש לבחור עד 12 שיעורים לבנייה."},400);
  const offset=Number(body.offset||0);
  if(!Number.isInteger(offset)||offset<0||offset>336||offset%28)return reply({error:"טווח הלוח אינו תקין."},400);
  const result=await schedule(staffId,offset);
  if(result.error)return reply({error:"לא ניתן לאמת את השיבוץ בארבוקס. יש לבדוק את קישור החשבון."},409);
  const assigned=upcomingArboxLessons(result.lessons);
  const selected=[...new Set(body.scheduleIds)].map(id=>assigned.find(lesson=>lesson.scheduleId===id));
  if(selected.some(lesson=>!lesson))return reply({error:"אחד השיעורים אינו משובץ לך עוד או שכבר התחיל. יש לרענן את הלוח."},409);
  const existing=await db.from("biss_workout_tasks").select("id,arbox_schedule_id,submitted_at").eq("instructor_id",profile.id).in("arbox_schedule_id",body.scheduleIds);
  if(existing.error)return reply({error:"לא ניתן לבדוק משימות קיימות."},503);
  const pending=selected.filter(lesson=>!existing.data.some(task=>task.arbox_schedule_id===lesson.scheduleId));
  const rows=pending.map(lesson=>({arbox_schedule_id:lesson.scheduleId,instructor_id:profile.id,created_by:profile.id,title:lesson.name,starts_at:studioLocalTimeToIso(`${lesson.date}T${lesson.start}`),frame:personalLessonFrame(lesson,body.types?.[lesson.scheduleId])}));
  if(rows.some(row=>!row.frame))return reply({error:"בחלק מהשיעורים חסרים משך או כמות משתתפות מתאימים. בקשי מהמנהלת להגדיר משימת בנייה לשיעורים האלה."},409);
  const saved=rows.length?await db.from("biss_sessions").select("arbox_session_id,workout_payload").eq("instructor_id",profile.id).in("arbox_session_id",rows.map(row=>row.arbox_schedule_id)).eq("status","planned"):{data:[]};
  if(saved.error)return reply({error:"לא ניתן לבדוק אימונים קיימים. לא נוצרה משימה חדשה."},503);
  for(const row of rows){const candidates=saved.data.filter(session=>session.arbox_session_id===row.arbox_schedule_id&&publicWorkoutShare(session.workout_payload));if(candidates.length>1)return reply({error:"נמצאו כמה אימונים לאותו שיעור. נדרשת בדיקת מנהלת."},409);const source=candidates[0]?.workout_payload;if(source){const workout=publicWorkoutShare(source);if(workout.durationMinutes!==row.frame.duration)return reply({error:"האימון השמור אינו תואם למשך השיעור בארבוקס. נדרשת בדיקת מנהלת."},409);row.frame={...row.frame,type:workout.type||row.frame.type,limitations:Array.isArray(source.limitations)?source.limitations:[]};row.workout=workout;row.submitted_at=new Date().toISOString();}}
  if(rows.length){const saved=await db.from("biss_workout_tasks").upsert(rows,{onConflict:"arbox_schedule_id,instructor_id",ignoreDuplicates:true});if(saved.error)return reply({error:"לא ניתן לשמור את משימות הבנייה."},503);}
  const tasks=await db.from("biss_workout_tasks").select("id,arbox_schedule_id,submitted_at").eq("instructor_id",profile.id).in("arbox_schedule_id",body.scheduleIds);
  return tasks.error?reply({error:"המשימות נשמרו אך טעינתן נכשלה. אפשר לרענן."},503):reply({tasks:tasks.data});
}
