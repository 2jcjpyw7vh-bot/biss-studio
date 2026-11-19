import {readArboxSchedule} from "../../../lib/arbox-config";
import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {verifyAdminPin} from "../../../lib/admin-pin";
import {isRecruitmentId,recruitmentApprovalError,recruitmentDocumentError,recruitmentText,recruitmentWorkoutFields,shekelsToAgorot} from "../../../lib/recruitment";
import {certificateFormat,certificateExtension} from "../../../lib/recruitment-certificate";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const posts=db=>db.from("biss_recruitment_posts");
const applications=db=>db.from("biss_recruitment_applications");
async function arboxAvailability(terms){
  const slots=terms.slots.filter(slot=>slot.arboxId);
  if(!slots.length)return "";
  const result=await readArboxSchedule();
  if(result.error)return "לא ניתן לאמת את השיבוץ העדכני בארבוקס. נסו שוב.";
  return slots.every(slot=>result.lessons.some(lesson=>lesson.scheduleId===slot.arboxId&&!lesson.cancelled&&!lesson.instructorName&&!lesson.secondInstructorName))?"":"השיבוץ בארבוקס השתנה. יש לבדוק את הלוח לפני המשך הגיוס.";
}
const localDay=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"});

export async function GET(req) {
  if(!await verifyAdminPin(req))return reply({error:"נדרש PIN מנהל"},401);
  const db=supabaseAdmin();
  if(!db)return reply({error:"שירות Studio אינו זמין"},503);
  const params=new URL(req.url).searchParams;
  const certificate=params.get("certificate")||params.get("insurance");
  const documentKind=params.has("insurance")?"insurance":"certificate";
  if(certificate!==null){
    if(!isRecruitmentId(certificate))return reply({error:"מזהה מועמדות אינו תקין"},400);
    const {data,error}=await applications(db).select(`${documentKind}_mime,${documentKind}_base64`).eq("id",certificate).maybeSingle();
    if(error)return reply({error:"לא ניתן לטעון את התעודה"},503);
    const extension=certificateExtension(data?.[`${documentKind}_mime`]);
    if(!extension||!data[`${documentKind}_base64`])return reply({error:"לא צורפה תעודה"},404);
    return new Response(Buffer.from(data[`${documentKind}_base64`],"base64"),{headers:{
      "Content-Type":data[`${documentKind}_mime`],
      "Content-Disposition":`attachment; filename="studio-${documentKind}.${extension}"`,
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff"
    }});
  }
  const id=params.get("id");
  if(id!==null) {
    if(!isRecruitmentId(id))return reply({error:"מזהה פרסום אינו תקין"},400);
    const [post,people]=await Promise.all([
      posts(db).select("*").eq("id",id).maybeSingle(),
      applications(db).select("id,post_id,name,email,phone,qualifications,experience,note,requested_ids,approved_ids,created_at,professional_insurance,certificate_mime,insurance_mime,insurance_valid_until,documents_reviewed_at").eq("post_id",id).order("created_at",{ascending:false}).limit(150)
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
    const application=await applications(db).select("professional_insurance,qualifications,approved_ids,post_id,requested_ids,certificate_mime,insurance_mime,insurance_valid_until,documents_reviewed_at").eq("id",body.id).maybeSingle();
    if(application.error)return reply({error:"לא ניתן לבדוק את פרטי המועמדות."},503);
    if(!application.data)return reply({error:"המועמדות לא נמצאה."},404);
    if(ids.some(id=>!application.data.approved_ids.includes(id))){
      const post=await posts(db).select("terms").eq("id",application.data.post_id).single();
      if(post.error)return reply({error:"לא ניתן לבדוק תנאי פרסום"},503);
      const sourceError=await arboxAvailability({...post.data.terms,slots:post.data.terms.slots.filter(slot=>ids.includes(slot.id))});
      if(sourceError)return reply({error:sourceError},409);
      const error=recruitmentApprovalError(application.data,post.data.terms,ids);
      if(error)return reply({error},409);
    }
    const {data,error}=await db.rpc("studio_approve_recruitment",{p_application_id:body.id,p_session_ids:[...new Set(ids)]});
    if(error)return reply({error:"לא ניתן לשמור את השיבוץ. אפשר לנסות שוב."},503);
    return data==="saved"?reply({saved:true}):reply({error:"השיבוץ לא נשמר. אחד המועדים כבר נסגר, שונה או שובץ."},409);
  }
  if(body?.action==="review_documents"){
    if(!isRecruitmentId(body.id)||body.confirmed!==true)return reply({error:"יש לאשר בדיקת מסמכים"},400);
    const app=await applications(db).select("post_id,requested_ids,certificate_mime,insurance_mime,insurance_valid_until,professional_insurance,qualifications").eq("id",body.id).maybeSingle();
    if(app.error||!app.data)return reply({error:"המועמדות לא נמצאה"},404);
    const post=await posts(db).select("terms").eq("id",app.data.post_id).single();
    if(post.error)return reply({error:"לא ניתן לבדוק תנאים"},503);
    const error=recruitmentDocumentError(app.data,post.data.terms);
    if(error)return reply({error},409);
    const result=await applications(db).update({documents_reviewed_at:new Date().toISOString()}).eq("id",body.id);
    return result.error?reply({error:"האישור לא נשמר"},503):reply({saved:true});
  }
  if(body?.action==="publish"){
    if(!isRecruitmentId(body.id)||body.confirmed!==true)return reply({error:"נדרש אישור מפורש של התוכן והיעדים"},400);
    const current=await posts(db).select("id,terms,status").eq("id",body.id).maybeSingle();
    if(current.error||!current.data)return reply({error:"הטיוטה לא נמצאה"},404);
    if(!current.data.terms.draft)return reply({saved:current.data.status==="open"});
    const sourceError=await arboxAvailability(current.data.terms);
    if(sourceError)return reply({error:sourceError},409);
    const ids=current.data.terms.slots.map(slot=>slot.id);
    const sessions=await db.from("biss_sessions").select("id,status,starts_at,instructor_id,instructor_name").in("id",ids);
    if(sessions.error)return reply({error:"לא ניתן לבדוק מועדים"},503);
    const valid=current.data.terms.slots.every(slot=>sessions.data.some(session=>session.id===slot.id&&session.status==="planned"&&Date.parse(session.starts_at)>Date.now()&&Date.parse(session.starts_at)===Date.parse(slot.startsAt)&&session.instructor_id===slot.originalInstructorId&&session.instructor_name===slot.originalInstructorName));
    if(!valid)return reply({error:"המועדים השתנו. יש להכין טיוטה חדשה."},409);
    const result=await posts(db).update({status:"open",terms:{...current.data.terms,draft:false,approvedAt:new Date().toISOString()}}).eq("id",body.id).eq("status","closed");
    return result.error?reply({error:"האישור לא נשמר"},503):reply({saved:true});
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
    .select("id,title,starts_at,instructor_id,instructor_name,workout_payload,playlist_url,arbox_session_id")
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
      ...entry,title:session.title,startsAt:session.starts_at,arboxId:session.arbox_session_id,
      originalInstructorId:session.instructor_id,originalInstructorName:session.instructor_name,
      ...recruitmentWorkoutFields(session,body.showWorkout===true)
    });
  }
  slots.sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  let image=null;
  if(body.image){
    if(typeof body.image.base64!=="string"||body.image.base64.length>1400000)return reply({error:"תמונת המודעה מוגבלת ל־1 MB"},400);
    const bytes=Buffer.from(body.image.base64,"base64"),format=certificateFormat(bytes);
    if(!format||!['image/jpeg','image/png'].includes(format.mime)||bytes.length>1024*1024)return reply({error:"יש לצרף תמונת JPG או PNG עד 1 MB"},400);
    image={mime:format.mime,base64:bytes.toString("base64")};
  }
  const terms={title,address,travelSingle,travelMultiple,slots,
    certifications:recruitmentText(body.certifications,1000),experience:recruitmentText(body.experience,600),notes:recruitmentText(body.notes,1600),recurring:recruitmentText(body.recurring,1000),
    image,documentPolicy:1,requireCertificate:body.requireCertificate===true,requireInsurance:body.requireInsurance===true,
    destinations:recruitmentText(body.destinations,1000),recipientIds:Array.isArray(body.recipientIds)?[...new Set(body.recipientIds.filter(isRecruitmentId))].slice(0,150):[],draft:true};
  const created=await posts(db).insert({id:body.id,terms,status:"closed"}).select("id,token").single();
  if(created.error?.code==="23505") {
    const {data}=await posts(db).select("id,token").eq("id",body.id).maybeSingle();
    if(data)return reply({post:data});
  }
  return created.error?reply({error:"לא ניתן ליצור את הפרסום. אפשר לנסות שוב."},503):reply({post:created.data});
}
