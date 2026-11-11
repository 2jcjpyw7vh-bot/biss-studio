import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {verifyAdminPin} from "../../../lib/admin-pin";
import {isRecruitmentId,recruitmentApprovalError,recruitmentText,recruitmentWorkoutFields,shekelsToAgorot} from "../../../lib/recruitment";
import {certificateExtension} from "../../../lib/recruitment-certificate";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const posts=db=>db.from("biss_recruitment_posts");
const applications=db=>db.from("biss_recruitment_applications");
const localDay=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"});

export async function GET(req) {
  if(!await verifyAdminPin(req))return reply({error:"נדרש PIN מנהל"},401);
  const db=supabaseAdmin();
  if(!db)return reply({error:"שירות Studio אינו זמין"},503);
  const params=new URL(req.url).searchParams;
  const certificate=params.get("certificate");
  if(certificate!==null){
    if(!isRecruitmentId(certificate))return reply({error:"מזהה מועמדות אינו תקין"},400);
    const {data,error}=await applications(db).select("certificate_mime,certificate_base64").eq("id",certificate).maybeSingle();
    if(error)return reply({error:"לא ניתן לטעון את התעודה"},503);
    const extension=certificateExtension(data?.certificate_mime);
    if(!extension||!data.certificate_base64)return reply({error:"לא צורפה תעודה"},404);
    return new Response(Buffer.from(data.certificate_base64,"base64"),{headers:{
      "Content-Type":data.certificate_mime,
      "Content-Disposition":`attachment; filename="studio-certificate.${extension}"`,
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff"
    }});
  }
  const id=params.get("id");
  if(id!==null) {
    if(!isRecruitmentId(id))return reply({error:"מזהה פרסום אינו תקין"},400);
    const [post,people]=await Promise.all([
      posts(db).select("*").eq("id",id).maybeSingle(),
      applications(db).select("id,post_id,name,email,phone,qualifications,experience,note,requested_ids,approved_ids,created_at,professional_insurance,certificate_mime").eq("post_id",id).order("created_at",{ascending:false}).limit(150)
    ]);
    if(post.error||people.error)return reply({error:"לא ניתן לטעון מועמדויות"},503);
    if(!post.data)return reply({error:"הפרסום לא נמצא"},404);
    return reply({post:post.data,applications:people.data});
  }
  const {data,error}=await posts(db).select("id,token,status,created_at,title:terms->>title").order("created_at",{ascending:false}).limit(30);
  return error?reply({error:"לא ניתן לטעון פרסומים"},503):reply({posts:data});
}

export async function POST(req) {
  if(!await verifyAdminPin(req))return reply({error:"נדרש PIN מנהל"},401);
  const db=supabaseAdmin();
  if(!db)return reply({error:"שירות Studio אינו זמין"},503);
  const body=await req.json().catch(()=>null);
  if(body?.action==="approve") {
    const ids=body.sessionIds;
    if(!isRecruitmentId(body.id)||!Array.isArray(ids)||!ids.length||ids.length>20||!ids.every(isRecruitmentId))return reply({error:"בחרי מועמדת ומועדים לאישור"},400);
    const application=await applications(db).select("professional_insurance,qualifications,approved_ids").eq("id",body.id).maybeSingle();
    if(application.error)return reply({error:"לא ניתן לבדוק את פרטי המועמדות."},503);
    if(!application.data)return reply({error:"המועמדות לא נמצאה."},404);
    if(ids.some(id=>!application.data.approved_ids.includes(id))){
      const error=recruitmentApprovalError(application.data);
      if(error)return reply({error},409);
    }
    const {data,error}=await db.rpc("studio_approve_recruitment",{p_application_id:body.id,p_session_ids:[...new Set(ids)]});
    if(error)return reply({error:"לא ניתן לשמור את השיבוץ. אפשר לנסות שוב."},503);
    return data==="saved"?reply({saved:true}):reply({error:"השיבוץ לא נשמר. אחד המועדים כבר נסגר, שונה או שובץ."},409);
  }
  if(body?.action==="close") {
    if(!isRecruitmentId(body.id))return reply({error:"מזהה פרסום אינו תקין"},400);
    const {data,error}=await posts(db).update({status:"closed"}).eq("id",body.id).select("id").maybeSingle();
    if(error)return reply({error:"לא ניתן לסגור את הפרסום"},503);
    return data?reply({saved:true}):reply({error:"הפרסום לא נמצא"},404);
  }
  if(body?.action!=="create"||!isRecruitmentId(body.id))return reply({error:"פעולה לא מוכרת"},400);
  const title=recruitmentText(body.title,120),address=recruitmentText(body.address,220);
  const travelSingle=shekelsToAgorot(body.travelSingle),travelMultiple=shekelsToAgorot(body.travelMultiple);
  const selections=body.slots;
  if(!title||!address||travelSingle===null||travelMultiple===null||!Array.isArray(selections)||!selections.length||selections.length>20) {
    return reply({error:"יש למלא כותרת, כתובת, תעריפי נסיעה ולבחור 1–20 מועדים"},400);
  }
  const entries=selections.map(slot=>({id:slot?.id,pay:shekelsToAgorot(slot?.pay),visit:recruitmentText(slot?.visit,24)}));
  const ids=entries.map(slot=>slot.id);
  if(new Set(ids).size!==ids.length||entries.some(slot=>!isRecruitmentId(slot.id)||slot.pay===null||!slot.visit))return reply({error:"לכל מועד דרושים סכום ומספר הגעה"},400);
  const {data:sessions,error}=await db.from("biss_sessions")
    .select("id,title,starts_at,instructor_id,instructor_name,workout_payload,playlist_url")
    .in("id",ids).eq("status","planned").gt("starts_at",new Date().toISOString());
  if(error)return reply({error:"לא ניתן לבדוק את המועדים"},503);
  if(sessions.length!==ids.length)return reply({error:"אפשר לפרסם רק מועדים מתוכננים שטרם התחילו"},409);
  const days=new Map();
  const slots=[];
  for(const entry of entries) {
    const session=sessions.find(item=>item.id===entry.id);
    const day=localDay.format(new Date(session.starts_at));
    if(days.has(entry.visit)&&days.get(entry.visit)!==day)return reply({error:"אפשר לקבץ להגעה אחת רק אימונים באותו יום"},400);
    days.set(entry.visit,day);
    slots.push({
      ...entry,title:session.title,startsAt:session.starts_at,
      originalInstructorId:session.instructor_id,originalInstructorName:session.instructor_name,
      ...recruitmentWorkoutFields(session,body.showWorkout===true)
    });
  }
  slots.sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const terms={title,address,travelSingle,travelMultiple,slots,
    certifications:recruitmentText(body.certifications,1000),experience:recruitmentText(body.experience,600),notes:recruitmentText(body.notes,1600)};
  const created=await posts(db).insert({id:body.id,terms}).select("id,token").single();
  if(created.error?.code==="23505") {
    const {data}=await posts(db).select("id,token").eq("id",body.id).maybeSingle();
    if(data)return reply({post:data});
  }
  return created.error?reply({error:"לא ניתן ליצור את הפרסום. אפשר לנסות שוב."},503):reply({post:created.data});
}
