import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase";
import {studioProfileFromRequest} from "../../../../lib/studio-auth";
import {replaceAdminPin} from "../../../../lib/admin-pin";
import {writeAudit} from "../../../../lib/audit";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function POST(req){
 const db=supabaseAdmin();if(!db)return reply({error:"שירות Studio אינו מחובר"},503);
 const{profile,error,status}=await studioProfileFromRequest(req,db);if(error)return reply({error},status);
 if(profile.role!=="manager")return reply({error:"רק מנהל מערכת יכול להחליף PIN"},403);
 let body;try{body=await req.json()}catch{return reply({error:"בקשה לא תקינה"},400)}
 const pin=String(body.pin||""),confirm=String(body.confirm||"");
 if(!/^\d{6}$/.test(pin))return reply({error:"יש לבחור PIN בן 6 ספרות"},400);
 if(pin!==confirm)return reply({error:"אימות ה-PIN אינו תואם"},400);
 if(/^(\d)\1{5}$/.test(pin)||["123456","654321","111111","000000"].includes(pin))return reply({error:"יש לבחור PIN שקשה לנחש"},400);
 try{
  await replaceAdminPin(db,pin,profile.id);
  await writeAudit(db,{action:"admin.pin_reset",entityType:"security",entityId:profile.id,label:"PIN מנהל הוחלף",metadata:{status:"completed"}});
  return reply({ok:true,message:"ה-PIN החדש נשמר ומוכן לשימוש"});
 }catch{return reply({error:"שמירת ה-PIN נכשלה"},503)}
}

