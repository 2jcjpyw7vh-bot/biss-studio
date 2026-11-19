import {farmShopUrl} from "../../../lib/farm-shop";
import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {studioLocalTimeToIso} from "../../../lib/studio-time";
import {isRecruitmentId} from "../../../lib/recruitment";
import {visitAddress,visitFrameError} from "../../../lib/studio-visits";
export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const clean=(value,max)=>typeof value==="string"?value.trim().slice(0,max):"";
async function access(req){const db=supabaseAdmin();if(!db)return {response:reply({error:"שירות Studio אינו זמין"},503)};const a=await studioProfileFromRequest(req,db);if(a.error)return {response:reply({error:a.error},a.status)};if(a.profile.role!=="manager")return {response:reply({error:"נדרשת הרשאת ניהול"},403)};return {db,profile:a.profile};}
export async function GET(req){
 const {db,response}=await access(req);if(response)return response;
 const [visits,customers]=await Promise.all([
  db.from("biss_visits").select("*").order("starts_at",{ascending:false}).limit(100),
  db.from("biss_users").select("id,full_name,email,phone").eq("role","trainee").eq("status","active").order("full_name")]);
 if(visits.error||customers.error)return reply({error:"לא ניתן לטעון ביקורים ולקוחות"},503);
 const shop=await db.from("biss_admin_settings").select("setting_value").eq("setting_key","farm_shop_url").maybeSingle();
 return reply({visits:visits.data,customers:customers.data,shopUrl:shop.error?"":farmShopUrl(shop.data?.setting_value)});
}
export async function POST(req){
 const {db,profile,response}=await access(req);if(response)return response;
 const body=await req.json().catch(()=>null);
 if(body?.action==="shop_settings"){
  const url=farmShopUrl(body.url);
  if(!url)return reply({error:"יש להזין קישור HTTPS ציבורי לחנות בארבוקס, ולא כתובת של מסך הניהול."},400);
  const saved=await db.from("biss_admin_settings").upsert({setting_key:"farm_shop_url",setting_value:url,updated_at:new Date().toISOString(),updated_by:profile.id},{onConflict:"setting_key"});
  return saved.error?reply({error:"קישור החנות לא נשמר"},503):reply({saved:true});
 }
 if(body?.action==="cancel"){
  if(!isRecruitmentId(body.id)||!Number.isInteger(body.revision))return reply({error:"פרטי ביקור אינם תקינים"},400);
  const result=await db.from("biss_visits").update({status:"cancelled",revision:body.revision+1}).eq("id",body.id).eq("revision",body.revision).eq("status","confirmed").select("id").maybeSingle();
  return result.error?reply({error:"הביטול לא נשמר"},503):result.data?reply({saved:true}):reply({error:"הביקור השתנה. יש לרענן."},409);
 }
 if(body?.action!=="create"||body.confirmed!==true||!isRecruitmentId(body.id)||!isRecruitmentId(body.customerId))return reply({error:"יש לבחור לקוח ולאשר בדיקת הזמנה ותשלום בארבוקס"},400);
 const row={id:body.id,customer_id:body.customerId,arbox_booking_id:clean(body.arboxBookingId,120),title:clean(body.title,180),service_kind:body.kind,
  starts_at:studioLocalTimeToIso(body.startsAt),ends_at:studioLocalTimeToIso(body.endsAt),party_size:Number(body.partySize),
  included_items:typeof body.included==="string"?body.included.split(/\r?\n/).map(value=>value.trim().slice(0,180)).filter(Boolean).slice(0,20):[],
  address:clean(body.address,220)||visitAddress,instructions:clean(body.instructions,3000),equipment_notes:clean(body.equipmentNotes,2000)};
 const error=visitFrameError(row);if(error)return reply({error},400);
 const result=await db.rpc("studio_create_visit",{p_visit:row,p_manager_id:profile.id});
 if(result.error)return reply({error:"הביקור לא נשמר. אפשר לנסות שוב."},503);
 const errors={duplicate:"אסמכתת ארבוקס זו כבר שויכה לביקור. יש לפתוח את הביקור הקיים.",overlap:"כבר קיים ביקור מאושר בסטודיו בשעות אלה. בדקו את ההזמנות לפני אישור.",invalid_customer:"הלקוח אינו פעיל",denied:"אין הרשאת ניהול"};
 return result.data==="saved"?reply({saved:true,id:row.id}):reply({error:errors[result.data]||"הביקור לא נשמר"},409);
}
