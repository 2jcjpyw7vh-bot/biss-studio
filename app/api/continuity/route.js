import {NextResponse} from "next/server";
import crypto from "crypto";
import {supabaseAdmin} from "../../../lib/supabase";
import {writeAudit} from "../../../lib/audit";

export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store, max-age=0"};
const safeEqual=(a,b)=>{const A=Buffer.from(String(a||"")),B=Buffer.from(String(b||""));return A.length===B.length&&crypto.timingSafeEqual(A,B)};
const authorized=req=>Boolean(process.env.ADMIN_PIN)&&safeEqual(req.headers.get("x-admin-pin"),process.env.ADMIN_PIN);
const clean=(value,max=500)=>String(value||"").trim().slice(0,max);
const fail=(message,status=400)=>NextResponse.json({error:message},{status,headers:noStore});

async function snapshot(db){
  const [groups,sessions,adaptations,handoffs]=await Promise.all([
    db.from("biss_groups").select("*").eq("active",true).order("name"),
    db.from("biss_sessions").select("*").order("starts_at",{ascending:false}).limit(80),
    db.from("biss_adaptations").select("*").eq("active",true).order("created_at",{ascending:false}),
    db.from("biss_handoffs").select("*").order("created_at",{ascending:false}).limit(80)
  ]);
  const error=[groups,sessions,adaptations,handoffs].find(result=>result.error)?.error;
  if(error)throw error;
  return {groups:groups.data||[],sessions:sessions.data||[],adaptations:adaptations.data||[],handoffs:handoffs.data||[]};
}

export async function GET(req){
  if(!authorized(req))return fail("נדרש PIN מנהל לצפייה במידע הפנימי",401);
  const db=supabaseAdmin();if(!db)return fail("מסד הנתונים של Studio אינו מחובר",503);
  try{return NextResponse.json(await snapshot(db),{headers:noStore})}catch(error){return fail("לא ניתן לטעון את רצף האימונים",503)}
}

export async function POST(req){
  if(!authorized(req))return fail("PIN שגוי",401);
  const db=supabaseAdmin();if(!db)return fail("מסד הנתונים של Studio אינו מחובר",503);
  let body;try{body=await req.json()}catch{return fail("בקשה לא תקינה")}
  try{
    if(body.action==="group"){
      const name=clean(body.name,100);if(!name)return fail("חסר שם קבוצה");
      const {error}=await db.from("biss_groups").insert({name,level:clean(body.level,30)||"מעורב",music_style:clean(body.music_style,120),playlist_url:clean(body.playlist_url,500),arbox_group_id:clean(body.arbox_group_id,100)||null});
      if(error)throw error;await writeAudit(db,{action:"group.created",entityType:"group",label:name});
    }else if(body.action==="session"){
      if(!body.group_id||!body.starts_at)return fail("יש לבחור קבוצה ומועד");
      const {error}=await db.from("biss_sessions").insert({group_id:body.group_id,starts_at:new Date(body.starts_at).toISOString(),title:clean(body.title,160)||"אימון קבוצה",instructor_name:clean(body.instructor_name,120),workout_summary:clean(body.workout_summary,4000),playlist_url:clean(body.playlist_url,500),status:"planned"});
      if(error)throw error;await writeAudit(db,{action:"session.created",entityType:"session",label:clean(body.title,160)||"אימון קבוצה"});
    }else if(body.action==="adaptation"){
      if(!body.group_id||!clean(body.member_name,120)||!clean(body.guidance,1500))return fail("יש למלא קבוצה, שם והנחיית התאמה");
      const {error}=await db.from("biss_adaptations").insert({group_id:body.group_id,member_name:clean(body.member_name,120),category:clean(body.category,50)||"מגבלה",guidance:clean(body.guidance,1500),source:clean(body.source,30)||"manual",valid_until:body.valid_until||null,active:true});
      if(error)throw error;await writeAudit(db,{action:"adaptation.created",entityType:"adaptation",label:clean(body.category,50)||"מגבלה",metadata:{category:clean(body.category,50)}});
    }else if(body.action==="handoff"){
      if(!body.session_id||!clean(body.note,2500))return fail("יש לבחור אימון ולכתוב עדכון");
      const {error}=await db.from("biss_handoffs").insert({session_id:body.session_id,note:clean(body.note,2500),author_name:clean(body.author_name,120)});
      if(error)throw error;await writeAudit(db,{action:"handoff.created",entityType:"handoff",entityId:body.session_id,label:"עדכון למדריכה הבאה"});
    }else if(body.action==="attach_workout"){
      if(!body.session_id||!body.workout||typeof body.workout!=="object")return fail("חסר אימון או שיבוץ");
      const workout=body.workout,exercises=Array.isArray(workout.exercises)?workout.exercises.slice(0,20):[];
      const summary=[clean(workout.title,180),clean(workout.meta,300),...exercises.map((x,i)=>`${i+1}. ${clean(x.he,100)} — ${clean(x.prescription,180)}`)].filter(Boolean).join("\n");
      const safePayload={title:clean(workout.title,180),meta:clean(workout.meta,300),musicUrl:clean(workout.musicUrl,500),musicTitle:clean(workout.musicTitle,120),warm:Array.isArray(workout.warm)?workout.warm.slice(0,10):[],exercises:exercises.map(x=>({id:clean(x.id,100),he:clean(x.he,120),en:clean(x.en,120),equipment:clean(x.equipment,120),level:clean(x.level,40),prescription:clean(x.prescription,200),cue:clean(x.cue,300),allocation:clean(x.allocation,300)})),cool:Array.isArray(workout.cool)?workout.cool.slice(0,10):[]};
      const{data:current,error:readError}=await db.from("biss_sessions").select("workout_version").eq("id",body.session_id).single();if(readError)throw readError;
      const version=Number(current.workout_version||0)+1;const{error}=await db.from("biss_sessions").update({workout_summary:summary,workout_payload:safePayload,workout_version:version,workout_saved_at:new Date().toISOString()}).eq("id",body.session_id);if(error)throw error;await writeAudit(db,{action:"workout.attached",entityType:"session",entityId:body.session_id,label:clean(workout.title,180),metadata:{version}});
    }else return fail("פעולה לא מוכרת");
    return NextResponse.json(await snapshot(db),{headers:noStore});
  }catch(error){console.error("Studio continuity error",error);return fail("השמירה במסד נכשלה",500)}
}

