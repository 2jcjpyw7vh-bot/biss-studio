import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase";
import {isRecruitmentId,recruitmentPublic,recruitmentText} from "../../../../lib/recruitment";
import {certificateFormat,certificateMaxBytes} from "../../../../lib/recruitment-certificate";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const closed=()=>reply({error:"הפרסום סגור או שכבר אין בו מועדים פנויים."},404);

export async function GET(_req,{params}) {
  const {token}=await params;
  if(!isRecruitmentId(token))return closed();
  const db=supabaseAdmin();
  if(!db)return reply({error:"שירות Studio אינו זמין"},503);
  const {data:post,error}=await db.from("biss_recruitment_posts").select("status,terms").eq("token",token).maybeSingle();
  if(error)return reply({error:"לא ניתן לטעון את הפרסום"},503);
  if(!post||post.status!=="open")return closed();
  const ids=post.terms.slots.map(slot=>slot.id);
  const [sessions,approved,privateOffers]=await Promise.all([
    db.from("biss_sessions").select("id,status,starts_at,instructor_id,instructor_name").in("id",ids),
    db.from("biss_recruitment_applications").select("approved_ids").overlaps("approved_ids",ids),
    db.from("biss_substitute_offers").select("session_id").in("session_id",ids).eq("status","accepted")
  ]);
  if(sessions.error||approved.error||privateOffers.error)return reply({error:"לא ניתן לבדוק מועדים פנויים"},503);
  const taken=new Set([...approved.data.flatMap(item=>item.approved_ids),...privateOffers.data.map(item=>item.session_id)]);
  const publication=recruitmentPublic(post,sessions.data.filter(session=>!taken.has(session.id)));
  return publication.slots.length?reply({publication}):closed();
}

export async function POST(req,{params}) {
  const {token}=await params;
  if(!isRecruitmentId(token))return closed();
  const multipart=req.headers.get("content-type")?.startsWith("multipart/form-data");
  const form=multipart?await req.formData().catch(()=>null):null;
  const body=multipart?(form?Object.fromEntries(form):null):await req.json().catch(()=>null);
  if(form){
    try {body.sessionIds=JSON.parse(form.get("sessionIds"));}
    catch {return reply({error:"יש לבחור לפחות מועד אחד"},400);}
  }
  const ids=Array.isArray(body?.sessionIds)?[...new Set(body.sessionIds)]:[];
  const details={
    name:recruitmentText(body?.name,100),email:recruitmentText(body?.email,180).toLowerCase(),
    phone:recruitmentText(body?.phone,35),qualifications:recruitmentText(body?.qualifications,800),
    professional_insurance:body?.professionalInsurance==="yes"||body?.professionalInsurance===true,
    experience:recruitmentText(body?.experience,600),note:recruitmentText(body?.note,900)
  };
  if(body?.website)return reply({saved:true});
  if(!details.name||!/^\S+@\S+\.\S+$/.test(details.email)||!ids.length||ids.length>20||!ids.every(isRecruitmentId)){
    return reply({error:"יש להזין שם ומייל תקין ולבחור לפחות מועד אחד"},400);
  }
  if(!details.professional_insurance)return reply({error:"יש לאשר שיש לך ביטוח אחריות מקצועית בתוקף."},400);
  if(!details.qualifications)return reply({error:"יש למלא את סוג ההסמכה שלך."},400);
  const certificate=form?.get("certificate");
  if(certificate && typeof certificate!=="string" && certificate.size){
    if(certificate.size>certificateMaxBytes)return reply({error:"אפשר לצרף תעודה בגודל של עד 3 MB."},413);
    const bytes=Buffer.from(await certificate.arrayBuffer());
    const format=certificateFormat(bytes);
    if(!format)return reply({error:"אפשר לצרף תעודה בפורמט PDF, JPG או PNG."},400);
    details.certificate_mime=format.mime;
    details.certificate_base64=bytes.toString("base64");
  }
  const db=supabaseAdmin();
  if(!db)return reply({error:"שירות Studio אינו זמין"},503);
  const {data,error}=await db.rpc("studio_apply_recruitment",{p_token:token,p_details:details,p_session_ids:ids});
  if(error)return reply({error:"לא ניתן לשלוח מועמדות. אפשר לנסות שוב."},503);
  if(data==="invalid")return reply({error:"יש למלא את ההסמכות והניסיון שנדרשו בפרסום."},400);
  if(data==="existing")return reply({error:"כבר הוגשה מועמדות עם כתובת המייל הזו לפני הוספת הצהרת הביטוח. יש לפנות לצוות הסטודיו לעדכון."},409);
  return data==="saved"?reply({saved:true}):reply({error:"חלק מהמועדים כבר אינם זמינים. רענני את העמוד ובחרי שוב."},409);
}
