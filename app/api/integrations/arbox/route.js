import crypto from "crypto";
import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase";
import {arboxConfiguration} from "../../../../lib/arbox-config";

export const dynamic="force-dynamic";
const safe=(a,b)=>{const A=Buffer.from(String(a||"")),B=Buffer.from(String(b||""));return A.length===B.length&&crypto.timingSafeEqual(A,B)};
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(req){
 if(!process.env.ADMIN_PIN||!safe(req.headers.get("x-admin-pin"),process.env.ADMIN_PIN))return reply({error:"נדרש PIN מנהל"},401);
 const db=supabaseAdmin();if(!db)return reply({error:"מסד Studio אינו מחובר"},503);
 const[groupCount,userCount,sessionCount]=await Promise.all([
  db.from("biss_groups").select("id",{count:"exact",head:true}).not("arbox_group_id","is",null),
  db.from("biss_users").select("id",{count:"exact",head:true}).not("arbox_user_id","is",null),
  db.from("biss_sessions").select("id",{count:"exact",head:true}).not("arbox_session_id","is",null)
 ]);
 const error=groupCount.error||userCount.error||sessionCount.error;if(error)return reply({error:"לא ניתן לבדוק מיפויי Arbox"},503);
 return reply({configuration:arboxConfiguration(),mappings:{groups:groupCount.count||0,users:userCount.count||0,sessions:sessionCount.count||0},mode:"readiness_only",writes_enabled:false});
}

