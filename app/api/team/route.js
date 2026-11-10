import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {writeAudit} from "../../../lib/audit";
import {verifyAdminPin} from "../../../lib/admin-pin";
import {studioLocalTimeToIso} from "../../../lib/studio-time";
import {studioWorkoutFields} from "../../../lib/studio-workout-payload";
export const dynamic="force-dynamic";
const clean=(v,n=300)=>String(v||"").trim().slice(0,n);
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function snapshot(db){
 const [users,sessions,planned,groups,offers,audit]=await Promise.all([
  db.from("biss_users").select("*").order("full_name"),
  db.from("biss_sessions").select("id,group_id,title,starts_at").order("starts_at",{ascending:false}).limit(80),
  db.from("biss_sessions").select("id,group_id,title,starts_at,workout_summary,playlist_url,instructor_name").eq("status","planned").gt("starts_at",new Date().toISOString()).order("starts_at").limit(100),
  db.from("biss_groups").select("id,name,active").order("name"),
  db.from("biss_substitute_offers").select("*").order("created_at",{ascending:false}).limit(100),
  db.from("biss_audit_log").select("id,action,entity_type,label,metadata,created_at").order("created_at",{ascending:false}).limit(30)
 ]);
 const error=[users,sessions,planned,groups,offers,audit].find(x=>x.error)?.error;
 if(error)throw error;
 return {users:users.data||[],sessions:sessions.data||[],planned_sessions:planned.data||[],groups:groups.data||[],offers:offers.data||[],audit:audit.data||[]};
}
export async function GET(req){if(!await verifyAdminPin(req))return reply({error:"נדרש PIN מנהל"},401);const db=supabaseAdmin();if(!db)return reply({error:"מסד Studio אינו מחובר"},503);try{return reply(await snapshot(db))}catch{return reply({error:"לא ניתן לטעון את הצוות"},503)}}
export async function POST(req){if(!await verifyAdminPin(req))return reply({error:"PIN שגוי"},401);const db=supabaseAdmin();if(!db)return reply({error:"מסד Studio אינו מחובר"},503);const b=await req.json();try{
 if(b.action==="user"){
  const full_name=clean(b.full_name,120),role=clean(b.role,20),email=clean(b.email,180).toLowerCase();
  if(!full_name||!["manager","instructor","trainee"].includes(role))return reply({error:"חסר שם או תפקיד"},400);
  const {data:user,error}=await db.from("biss_users").insert({full_name,email,phone:clean(b.phone,40),role,status:"active",can_view_health:role==="manager"||b.can_view_health===true}).select("id").single();
  if(error?.code==="23505")return reply({error:"כתובת המייל כבר רשומה. השתמשו בחשבון הקיים. מנהלת פעילה זמינה גם לשיבוץ כמדריכה."},409);
  if(error)throw error;
  await writeAudit(db,{action:"user.created",entityType:"user",entityId:user.id,label:full_name,metadata:{role}})
 }
 else if(b.action==="user_update"){
  const id=clean(b.id,120),role=clean(b.role,20),status=clean(b.status,20);
  if(!id||!["manager","instructor","trainee"].includes(role)||!["active","inactive","invited"].includes(status))return reply({error:"פרטי ההרשאה אינם תקינים"},400);
  const{data:current,error:currentError}=await db.from("biss_users").select("id,full_name,role,status").eq("id",id).single();if(currentError||!current)return reply({error:"המשתמשת לא נמצאה"},404);
  if(status==="invited"&&current.status!=="invited")return reply({error:"מצב הזמנה נקבע בעת ההזמנה"},400);
  if(current.role==="manager"&&current.status==="active"&&(role!=="manager"||status!=="active")){const{count,error:countError}=await db.from("biss_users").select("id",{count:"exact",head:true}).eq("role","manager").eq("status","active");if(countError)throw countError;if((count||0)<=1)return reply({error:"לא ניתן להשבית את המנהלת הפעילה האחרונה"},409)}
  const can_view_health=role==="manager"||(role==="instructor"&&String(b.can_view_health)==="true");
  const{error}=await db.from("biss_users").update({role,status,can_view_health}).eq("id",id);if(error)throw error;
  await writeAudit(db,{action:"user.updated",entityType:"user",entityId:id,label:current.full_name,metadata:{role,status}})
 }
 else if(b.action==="invite_user"){
  const id=clean(b.id,120);if(!id)return reply({error:"חסרה משתמשת"},400);
  const{data:person,error:personError}=await db.from("biss_users").select("id,full_name,email,status,auth_user_id").eq("id",id).single();if(personError||!person)return reply({error:"המשתמשת לא נמצאה"},404);if(person.status!=="active"||!person.email)return reply({error:"נדרש חשבון פעיל עם כתובת מייל"},409);if(person.auth_user_id)return reply({error:"למשתמשת כבר קיים חשבון כניסה"},409);
  const base=(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/$/,"");const{data:invited,error:inviteError}=await db.auth.admin.inviteUserByEmail(person.email,{redirectTo:`${base}/login`});if(inviteError)throw inviteError;
  const{error:linkError}=await db.from("biss_users").update({auth_user_id:invited.user.id}).eq("id",id).is("auth_user_id",null);if(linkError)throw linkError;
  await writeAudit(db,{action:"user.invited",entityType:"user",entityId:id,label:person.full_name,metadata:{status:"invited"}})
 }
 else if(b.action==="offer_group"){
  const name=clean(b.name,100);
  if(!name)return reply({error:"יש להזין שם לקבוצה"},400);
  const {data:existing,error:lookupError}=await db.from("biss_groups").select("id").eq("name",name).eq("active",true).limit(1).maybeSingle();
  if(lookupError)throw lookupError;
  if(existing)return reply({...await snapshot(db),created_group_id:existing.id});
  const {data:group,error}=await db.from("biss_groups").insert({name}).select("id").single();
  if(error)throw error;
  await writeAudit(db,{action:"group.created",entityType:"group",entityId:group.id,label:name});
  return reply({...await snapshot(db),created_group_id:group.id});
 }
 else if(b.action==="plan_offer_session"){
  const starts_at=studioLocalTimeToIso(b.starts_at);
  if(!starts_at||Date.parse(starts_at)<=Date.now())return reply({error:"יש לבחור תאריך ושעה עתידיים לפי שעון ישראל"},400);
  const title=clean(b.title,160);
  if(!title||!b.group_id)return reply({error:"יש לבחור קבוצה ולהזין כותרת לאימון"},400);
  const {data:group,error:groupError}=await db.from("biss_groups").select("id").eq("id",b.group_id).eq("active",true).maybeSingle();
  if(groupError)throw groupError;
  if(!group)return reply({error:"הקבוצה אינה זמינה"},409);
  const {data:existing,error:lookupError}=await db.from("biss_sessions").select("id").eq("group_id",group.id).eq("starts_at",starts_at).eq("status","planned").limit(1).maybeSingle();
  if(lookupError)throw lookupError;
  if(existing)return reply({error:"כבר יש אימון מתוכנן לקבוצה במועד הזה. אפשר לבחור אותו מהרשימה."},409);
  const workout=studioWorkoutFields(b.workout);
  const playlist=clean(workout?.workout_payload.musicUrl||b.playlist_url,500);
  if(playlist&&!/^https?:\/\//i.test(playlist))return reply({error:"קישור לפלייליסט צריך להתחיל ב־https:// או http://"},400);
  const {data:session,error}=await db.from("biss_sessions").insert({
    group_id:group.id,title,starts_at,status:"planned",playlist_url:playlist,
    ...(workout ? {...workout,workout_version:1,workout_saved_at:new Date().toISOString()}
      : {workout_summary:clean(b.workout_summary,4000)})
  }).select("id").single();
  if(error)throw error;
  await writeAudit(db,{action:"session.created",entityType:"session",entityId:session.id,label:title});
  return reply({...await snapshot(db),created_session_id:session.id});
 }
 else if(b.action==="offer"){
  if(!b.session_id||!b.instructor_id)return reply({error:"יש לבחור אימון ומדריכה"},400);
  const hours=[24,48,72].includes(Number(b.expires_hours))?Number(b.expires_hours):48;
  const {data:offer,error}=await db.rpc("studio_create_substitute_offer",{
    p_session:b.session_id,p_instructor:b.instructor_id,p_hours:hours,
    p_message:clean(b.message,1200),p_show_workout:String(b.show_workout)==="true"
  }).single();
  if(error)throw error;
  if(offer.result==="invalid_session")return reply({error:"יש לבחור אימון מתוכנן שטרם התחיל"},409);
  if(offer.result==="invalid_instructor")return reply({error:"יש לבחור מדריכה או מנהלת פעילה"},409);
  if(offer.result==="already_assigned")return reply({error:"הצעת החלפה לאימון הזה כבר אושרה"},409);
  if(offer.result==="created")await writeAudit(db,{action:"substitute_offer.created",entityType:"offer",entityId:offer.offer_id,label:"הצעת החלפה",metadata:{status:"pending"}});
  const share_path="/substitute/"+offer.offer_token;
  return reply({...await snapshot(db),share_path,share_url:new URL(share_path,req.url).href,reused_offer:offer.result==="reused"});
 }
 else if(b.action==="cancel_offer"){
  const id=clean(b.id,120);if(!id)return reply({error:"חסרה הצעת החלפה"},400);
  const{data:offer,error}=await db.from("biss_substitute_offers").update({status:"cancelled",responded_at:new Date().toISOString()}).eq("id",id).eq("status","pending").select("id").maybeSingle();if(error)throw error;if(!offer)return reply({error:"ההצעה כבר נענתה או בוטלה"},409);
  await writeAudit(db,{action:"substitute_offer.cancelled",entityType:"offer",entityId:id,label:"הצעת החלפה בוטלה",metadata:{status:"cancelled"}})
 }
 else return reply({error:"פעולה לא מוכרת"},400);return reply(await snapshot(db));
 }catch(error){console.error("Studio team error",error);return reply({error:"השמירה נכשלה"},500)}}


