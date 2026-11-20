import {farmShopUrl} from "../../../lib/farm-shop";
import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../lib/supabase";
import {studioProfileFromRequest} from "../../../lib/studio-auth";
import {isRecruitmentId} from "../../../lib/recruitment";
import {visitOwnerId,visitPreferenceResult} from "../../../lib/studio-visits";
import {readArboxSchedule} from "../../../lib/arbox-config";
import {activityVisitState} from "../../../lib/activity-visit-state";
export const dynamic="force-dynamic";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const fields="id,title,service_kind,activities,starts_at,ends_at,status,party_size,included_items,address,instructions,equipment_notes,preferences,revision";
async function access(req){const db=supabaseAdmin();if(!db)return {response:reply({error:"שירות Studio אינו זמין"},503)};const a=await studioProfileFromRequest(req,db);return a.error?{response:reply({error:a.error},a.status)}:{db,profile:a.profile};}
export async function GET(req){
 const {db,profile,response}=await access(req);if(response)return response;
 const preview=new URL(req.url).searchParams.get("preview");
 const isPreview=profile.role==="manager"&&isRecruitmentId(preview);
 const owner=visitOwnerId(profile,preview);
 if(!owner)return reply({error:"אין גישה לביקורים"},403);
 const person=isPreview?await db.from("biss_users").select("full_name").eq("id",owner).eq("status","active").maybeSingle():{data:profile};
 if(person.error||!person.data)return reply({error:"הלקוח לא נמצא"},404);
 const result=await db.from("biss_visits").select(fields).eq("customer_id",owner).order("starts_at",{ascending:false}).limit(100);
 if(result.error)return reply({error:"לא ניתן לטעון את הביקורים"},503);
 const futureIds=result.data.filter(visit=>Date.parse(visit.ends_at)>Date.now()&&visit.status==="confirmed").map(visit=>visit.id);
 const jobs=futureIds.length?await db.from("biss_activity_jobs").select("visit_id,arbox_schedule_id,starts_at,ends_at,status,assigned_id").in("visit_id",futureIds):{data:[]};
 if(jobs.error)return reply({error:"לא ניתן לבדוק את הכנת הביקור. נסו לרענן."},503);
 const source=jobs.data.length?await readArboxSchedule(process.env,fetch,new Date(),{expanded:true,days:28}):null;
 const staffIds=[...new Set(jobs.data.map(job=>job.assigned_id).filter(Boolean))];
 const staff=staffIds.length?await db.from("biss_users").select("id,full_name,status").in("id",staffIds):{data:[]};
 const visits=result.data.map(visit=>{
  const job=jobs.data.find(job=>job.visit_id===visit.id);if(!job)return visit;
  const assigned=staff.data?.find(person=>person.id===job.assigned_id&&person.status==="active");
  const preparation=assigned?activityVisitState(job,source):"unverified";
  return {...visit,preparation_status:preparation,operator_name:assigned?.full_name||"",...(preparation!=="ready"?{instructions:"הצוות בודק את פרטי הביקור העדכניים מול ארבוקס. יש לתאם הגעה לפני היציאה.",equipment_notes:""}:{})};
 });
 const shop=await db.from("biss_admin_settings").select("setting_value").eq("setting_key","farm_shop_url").maybeSingle();
 return reply({profile:{full_name:person.data.full_name},visits,preview:isPreview,shopUrl:shop.error?"":farmShopUrl(shop.data?.setting_value)});
}
export async function POST(req){
 const {db,profile,response}=await access(req);if(response)return response;
 const body=await req.json().catch(()=>null);
 if(!isRecruitmentId(body?.id)||!Number.isInteger(body.revision))return reply({error:"פרטי הביקור אינם תקינים"},400);
 const current=await db.from("biss_visits").select(fields).eq("id",body.id).eq("customer_id",profile.id).maybeSingle();
 if(current.error)return reply({error:"לא ניתן לבדוק ביקור"},503);
 if(!current.data)return reply({error:"הביקור אינו בחשבון הזה"},404);
 const result=visitPreferenceResult(current.data,body.preferences);if(result.error)return reply({error:result.error},409);
 const saved=await db.from("biss_visits").update({preferences:result.preferences,revision:body.revision+1}).eq("id",body.id).eq("customer_id",profile.id).eq("revision",body.revision).eq("status","confirmed").gt("ends_at",new Date().toISOString()).select(fields).maybeSingle();
 if(saved.error)return reply({error:"ההכנה לא נשמרה. אפשר לנסות שוב."},503);
 return saved.data?reply({visit:saved.data}):reply({error:"ההזמנה השתנתה. יש לרענן לפני שמירה."},409);
}
