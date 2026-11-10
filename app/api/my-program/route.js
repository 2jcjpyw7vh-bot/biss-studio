import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {selfServiceAccess} from "../../../lib/self-service-access";

export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req){const db=supabaseAdmin();if(!db)return reply({error:"שירות Studio אינו מחובר"},503);const{profile,error,status}=await studioProfileFromRequest(req,db);if(error)return reply({error},status);if(profile.role!=="trainee")return reply({error:"אזור זה מיועד למתאמנות"},403);const{data:program,error:programError}=await db.from("biss_programs").select("id,coach_id,title,summary,program_payload,equipment_access,status,approved_at,starts_on,ends_on").eq("trainee_id",profile.id).eq("status","active").order("created_at",{ascending:false}).limit(1).maybeSingle();if(programError)return reply({error:"לא ניתן לטעון את התוכנית"},503);const access=selfServiceAccess(profile,program);return reply({profile:{full_name:profile.full_name,role:profile.role,status:profile.status},access,program:access.equipment?program:null,alternatives:[{id:"mat-pilates",title:"פילאטיס מזרן"},{id:"gentle-yoga",title:"יוגה עדינה"}]})}

