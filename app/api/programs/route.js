import {safeProgram,followUpApprovalError} from "../../../lib/follow-up-program";
import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {writeAudit} from "../../../lib/audit";
import {verifyAdminPin} from "../../../lib/admin-pin";
import {programDateError} from "../../../lib/program-session";

export const dynamic="force-dynamic";
const clean=(v,n=300)=>String(v||"").trim().slice(0,n);
const isUuid=value=>typeof value==="string"&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

async function snapshot(db){const[trainees,coaches,programs]=await Promise.all([db.from("biss_users").select("id,full_name").eq("status","active").order("full_name"),db.from("biss_users").select("id,full_name,role").in("role",["manager","instructor"]).eq("status","active").order("full_name"),db.from("biss_programs").select("id,trainee_id,coach_id,title,status,equipment_access,starts_on,ends_on,created_at").order("created_at",{ascending:false}).limit(50)]);const error=trainees.error||coaches.error||programs.error;if(error)throw error;return{trainees:trainees.data||[],coaches:coaches.data||[],programs:programs.data||[]}}
export async function GET(req) {
  if (!await verifyAdminPin(req)) return reply({error:"נדרש PIN מנהל"},401);
  const db = supabaseAdmin();
  if (!db) return reply({error:"מסד Studio אינו מחובר"},503);
  const params = new URL(req.url).searchParams;
  const traineeId = params.get("trainee_id");
  const programId = params.get("program_id");
  if (programId !== null) {
    if (!isUuid(traineeId) || !isUuid(programId)) return reply({error:"פרטי השיוך אינם תקינים"},400);
    const {data:assignment,error} = await db.from("biss_programs")
      .select("program_payload").eq("id",programId).eq("trainee_id",traineeId).maybeSingle();
    if (error) return reply({error:"לא ניתן לטעון את התוכנית שנשמרה"},503);
    if (!assignment) return reply({error:"התוכנית לא נמצאה עבור המתאמנת שנבחרה"},404);
    return reply({program:safeProgram(assignment.program_payload)});
  }
  if (traineeId !== null) {
    if (!isUuid(traineeId)) {
      return reply({error:"מזהה המתאמנת אינו תקין"},400);
    }
    const {data:programs,error} = await db.from("biss_programs")
      .select("id,coach_id,title,status,equipment_access,approved_at,starts_on,ends_on")
      .eq("trainee_id",traineeId).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(50);
    if (error) return reply({error:"לא ניתן לטעון את השיוכים של המתאמנת"},503);
    return reply({programs});
  }
  try { return reply(await snapshot(db)); }
  catch { return reply({error:"לא ניתן לטעון את רשימת המשתמשות"},503); }
}
export async function POST(req) {
  if (!await verifyAdminPin(req)) return reply({error:"PIN שגוי"},401);
  const db = supabaseAdmin();
  if (!db) return reply({error:"מסד Studio אינו מחובר"},503);
  const body = await req.json().catch(() => null);
  if (body?.action !== "assign") return reply({error:"פעולה לא מוכרת"},400);

  let payload = safeProgram(body.program);
  let sourceTask=null;
  if(body.task_id){
    if(!isUuid(body.task_id))return reply({error:'משימת המקור אינה תקינה.'},400);
    const t=await db.from('biss_workout_tasks').select('id,instructor_id,starts_at,frame').eq('id',body.task_id).maybeSingle();
    if(t.error)return reply({error:'לא ניתן לבדוק את משימת התוכנית.'},503);
    const problem=followUpApprovalError(t.data,body.trainee_id,body.coach_id,body.introduction_completed===true);
    if(problem)return reply({error:problem},409);
    if(body.expectedVersion!==t.data.frame.follow_up.updated_at)return reply({error:'המדריכה עדכנה את הטיוטה. יש לפתוח אותה מחדש לפני האישור.'},409);
    sourceTask=t.data;payload=safeProgram(sourceTask.frame.follow_up.program);
  }
  if (!body.trainee_id) return reply({error:"יש לבחור מתאמנת"},400);
  if (!payload.sessions.length || payload.sessions.some(session => !session.items.some(item => item.he))) {
    return reply({error:"בכל אימון בתוכנית חייב להופיע לפחות תרגיל אחד."},400);
  }
  const dateError = programDateError(body.starts_on,body.ends_on);
  if (dateError) return reply({error:dateError},400);

  const assignmentId = sourceTask?.id || body.assignment_id;
  if (assignmentId !== undefined && (typeof assignmentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignmentId))) {
    return reply({error:"מזהה השמירה אינו תקין"},400);
  }
  const {data:trainee,error:traineeError} = await db.from("biss_users").select("id")
    .eq("id",body.trainee_id).eq("status","active").maybeSingle();
  if (traineeError) return reply({error:"לא ניתן לבדוק את המתאמנת"},503);
  if (!trainee) return reply({error:"המתאמנת אינה פעילה"},409);

  const coachId = clean(body.coach_id,120) || null;
  const equipmentAccess = String(body.equipment_access) === "true";
  if (equipmentAccess && !coachId) return reply({error:"שימוש במכשירים מחייב אישור מדריכה"},409);
  if (coachId) {
    const {data:coach,error:coachError} = await db.from("biss_users").select("id")
      .eq("id",coachId).in("role",["manager","instructor"]).eq("status","active").maybeSingle();
    if (coachError) return reply({error:"לא ניתן לבדוק את המדריכה"},503);
    if (!coach) return reply({error:"המדריכה המאשרת אינה פעילה"},409);
  }

  const now = new Date().toISOString();
  if(sourceTask&&!sourceTask.frame.follow_up.review_locked_at){
    const frame={...sourceTask.frame,follow_up:{...sourceTask.frame.follow_up,review_locked_at:now}};
    const lock=await db.from('biss_workout_tasks').update({frame}).eq('id',sourceTask.id).filter('frame','eq',JSON.stringify(sourceTask.frame)).select('id').maybeSingle();
    if(lock.error)return reply({error:'לא ניתן לשמור את גרסת האישור. אפשר לנסות שוב.'},503);
    if(!lock.data)return reply({error:'הטיוטה השתנתה. יש לפתוח אותה מחדש לפני האישור.'},409);
  }
  const row = {
    ...(assignmentId ? {id:assignmentId} : {}),
    trainee_id:trainee.id, coach_id:coachId, title:payload.title || "תוכנית BISS",
    summary:payload.meta, program_payload:payload, equipment_access:equipmentAccess,
    status:"active", approved_at:coachId ? now : null,
    starts_on:body.starts_on || null, ends_on:body.ends_on || null, updated_at:now
  };
  const {data:program,error} = await db.from("biss_programs").insert(row).select("id").single();
  if (error?.code === "23505" && assignmentId) {
    const {data:existing,error:readError} = await db.from("biss_programs").select("id")
      .eq("id",assignmentId).eq("trainee_id",trainee.id).maybeSingle();
    if (readError) return reply({error:"לא ניתן לבדוק אם התוכנית נשמרה. אפשר לנסות שוב."},503);
    if (existing) return reply({program_id:existing.id});
  }
  if (error) return reply({error:"שמירת התוכנית נכשלה. אפשר לנסות שוב."},503);
  await writeAudit(db,{action:"program.assigned",entityType:"program",entityId:program.id,label:row.title,metadata:{status:"active"}});
  return reply({program_id:program.id});
}


