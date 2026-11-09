import {NextResponse} from "next/server";
import crypto from "crypto";
import {supabaseAdmin} from "../../../lib/supabase";
import {writeAudit} from "../../../lib/audit";
export const dynamic="force-dynamic";
const safe=(a,b)=>{const A=Buffer.from(String(a||"")),B=Buffer.from(String(b||""));return A.length===B.length&&crypto.timingSafeEqual(A,B)};
const admin=req=>Boolean(process.env.ADMIN_PIN)&&safe(req.headers.get("x-admin-pin"),process.env.ADMIN_PIN);
const clean=(v,n=300)=>String(v||"").trim().slice(0,n);
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function snapshot(db){const [users,sessions,groups,offers,audit]=await Promise.all([db.from("biss_users").select("*").order("full_name"),db.from("biss_sessions").select("*").order("starts_at",{ascending:false}).limit(80),db.from("biss_groups").select("id,name"),db.from("biss_substitute_offers").select("*").order("created_at",{ascending:false}).limit(100),db.from("biss_audit_log").select("id,action,entity_type,label,metadata,created_at").order("created_at",{ascending:false}).limit(30)]);const error=[users,sessions,groups,offers,audit].find(x=>x.error)?.error;if(error)throw error;return{users:users.data||[],sessions:sessions.data||[],groups:groups.data||[],offers:offers.data||[],audit:audit.data||[]}}
export async function GET(req){if(!admin(req))return reply({error:"נדרש PIN מנהל"},401);const db=supabaseAdmin();if(!db)return reply({error:"מסד Studio אינו מחובר"},503);try{return reply(await snapshot(db))}catch{return reply({error:"לא ניתן לטעון את הצוות"},503)}}
export async function POST(req){if(!admin(req))return reply({error:"PIN שגוי"},401);const db=supabaseAdmin();if(!db)return reply({error:"מסד Studio אינו מחובר"},503);const b=await req.json();try{
 if(b.action==="user"){const full_name=clean(b.full_name,120),role=clean(b.role,20);if(!full_name||!["manager","instructor","trainee"].includes(role))return reply({error:"חסר שם או תפקיד"},400);const{data:user,error}=await db.from("biss_users").insert({full_name,email:clean(b.email,180).toLowerCase(),phone:clean(b.phone,40),role,status:"active",can_view_health:role==="manager"||b.can_view_health===true}).select("id").single();if(error)throw error;await writeAudit(db,{action:"user.created",entityType:"user",entityId:user.id,label:full_name,metadata:{role}})}
 else if(b.action==="offer"){if(!b.session_id||!b.instructor_id)return reply({error:"יש לבחור אימון ומדריכה"},400);const{data:offer,error}=await db.from("biss_substitute_offers").upsert({session_id:b.session_id,instructor_id:b.instructor_id,status:"pending",message:clean(b.message,1200),responded_at:null},{onConflict:"session_id,instructor_id"}).select("id,token").single();if(error)throw error;await writeAudit(db,{action:"substitute_offer.created",entityType:"offer",entityId:offer.id,label:"הצעת החלפה",metadata:{status:"pending"}});const base=(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/$/,"");return reply({...await snapshot(db),share_url:`${base}/substitute/${offer.token}`})}
 else return reply({error:"פעולה לא מוכרת"},400);return reply(await snapshot(db));
 }catch(error){console.error("Studio team error",error);return reply({error:"השמירה נכשלה"},500)}}

