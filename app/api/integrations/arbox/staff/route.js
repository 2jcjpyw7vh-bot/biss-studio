import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../../lib/supabase";
import {studioProfileFromRequest} from "../../../../../lib/studio-auth";
import {readArboxStaff} from "../../../../../lib/arbox-config";
import {isRecruitmentId} from "../../../../../lib/recruitment";
import {writeAudit} from "../../../../../lib/audit";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function access(req){
  const db=supabaseAdmin();if(!db)return {response:reply({error:"שירות Studio אינו זמין."},503)};
  const result=await studioProfileFromRequest(req,db);
  if(result.error)return {response:reply({error:result.error},result.status)};
  if(result.profile.role!=="manager")return {response:reply({error:"נדרשת הרשאת ניהול."},403)};
  return {db,profile:result.profile};
}
export async function GET(req){
  const {response}=await access(req);if(response)return response;
  const result=await readArboxStaff();
  return result.error?reply({error:"לא ניתן לקרוא את צוות ארבוקס כרגע."},502):reply(result);
}
export async function POST(req){
  const {db,response}=await access(req);if(response)return response;
  const body=await req.json().catch(()=>null);
  if(!isRecruitmentId(body?.userId)||!(body.staffId===""||/^\d{1,20}$/.test(body?.staffId||"")))return reply({error:"יש לבחור חשבון ומדריכה מארבוקס."},400);
  if(body.staffId){const result=await readArboxStaff();if(result.error)return reply({error:"לא ניתן לאמת את צוות ארבוקס."},502);if(!result.staff.some(person=>person.id===body.staffId))return reply({error:"המדריכה לא נמצאה בארבוקס."},409);}
  const result=await db.from("biss_users").update({arbox_user_id:body.staffId||null}).eq("id",body.userId).in("role",["instructor","manager"]).eq("status","active").select("id,full_name,arbox_user_id").maybeSingle();
  if(result.error?.code==="23505")return reply({error:"המדריכה מארבוקס כבר מקושרת לחשבון אחר ב־Studio. יש לנתק את הקישור הקודם תחילה."},409);
  if(result.error)return reply({error:"לא ניתן לשמור את הקישור."},503);
  if(!result.data)return reply({error:"החשבון אינו מדריכה פעילה."},404);
  await writeAudit(db,{action:"user.updated",entityType:"user",entityId:body.userId,label:result.data.full_name,metadata:{arbox_user_id:body.staffId||null}});
  return reply({user:result.data});
}
