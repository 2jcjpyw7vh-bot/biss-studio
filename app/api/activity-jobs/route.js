import {NextResponse} from 'next/server';
import {supabaseAdmin} from '../../../lib/supabase';
import {studioProfileFromRequest} from '../../../lib/studio-auth';
import {readArboxSchedule} from '../../../lib/arbox-config';
import {isRecruitmentId} from '../../../lib/recruitment';
import {writeAudit} from '../../../lib/audit';
import {activityCatalog,activitySetup} from '../../../lib/activity-catalog';
import {activityRoleAllowed,canReadActivity,suggestedActivityKind,activitySourceFrame,activitySourceMatches,activityTerms,activityPlan,completeActivityPlan} from '../../../lib/activity-operations';
export const dynamic='force-dynamic';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function access(req){
 const db=supabaseAdmin();if(!db)return {response:reply({error:'שירות Studio אינו זמין'},503)};
 const result=await studioProfileFromRequest(req,db);
 if(result.error)return {response:reply({error:result.error},result.status)};
 if(!['manager','instructor','operator'].includes(result.profile.role))return {response:reply({error:'אין גישה למשימות פעילות'},403)};
 return {db,profile:result.profile};
}
function visibleJob(job,profile){
 if(profile.role==='manager')return job;
 const {receipt,booking_reference,customer_id,verified_by,created_by,...safe}=job;return safe;
}
async function sourceFor(id){
 const result=await readArboxSchedule(process.env,fetch,new Date(),{expanded:true,days:28});
 if(result.error)return {error:'לא ניתן לאמת את הפעילות מול ארבוקס. נסו שוב.',status:503};
 const lesson=result.lessons.find(row=>row.scheduleId===id&&!row.cancelled);
 if(!lesson)return {error:'הפעילות אינה מופיעה בלוח העדכני ל־28 הימים הקרובים. בדקו אם בוטלה או השתנתה.',status:409};
 return {lesson};
}
export async function GET(req){
 const {db,profile,response}=await access(req);if(response)return response;
 const params=new URL(req.url).searchParams,id=params.get('id'),scheduleId=params.get('scheduleId');
 if(id&&!isRecruitmentId(id))return reply({error:'קישור לא תקין'},400);
 if(scheduleId&&profile.role!=='manager')return reply({error:'נדרשת הרשאת ניהול'},403);
 let query=db.from('biss_activity_jobs').select('*').order('starts_at').limit(100);
 if(id)query=query.eq('id',id);
 if(scheduleId)query=query.eq('arbox_schedule_id',scheduleId);
 if(profile.role!=='manager')query=query.eq('assigned_id',profile.id);
 const result=await query;if(result.error)return reply({error:'לא ניתן לטעון משימות פעילות'},503);
 const jobs=result.data.filter(job=>canReadActivity(profile,job)).map(job=>visibleJob(job,profile));
 let users=[];
 if(profile.role==='manager'){
  const people=await db.from('biss_users').select('id,full_name,email,role').eq('status','active').order('full_name');
  if(people.error)return reply({error:'לא ניתן לטעון צוות ולקוחות'},503);users=people.data;
 }
 return reply({jobs,users,canManage:profile.role==='manager',catalog:activityCatalog});
}
export async function POST(req){
 const {db,profile,response}=await access(req);if(response)return response;
 const body=await req.json().catch(()=>null);
 if(body?.action==='import'){
  if(profile.role!=='manager')return reply({error:'נדרשת הרשאת ניהול'},403);
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(body.scheduleId||''))return reply({error:'חסר מזהה פעילות'},400);
  const source=await sourceFor(body.scheduleId);if(source.error)return reply({error:source.error},source.status);
  const frame=activitySourceFrame(source.lesson),kind=suggestedActivityKind(source.lesson.name);
  if(!frame||kind==='class'||Date.parse(frame.starts_at)<=Date.now())return reply({error:'יש לבחור פעילות שעתית עתידית עם מועד תקין'},409);
  const inserted=await db.from('biss_activity_jobs').upsert({arbox_schedule_id:source.lesson.scheduleId,title:source.lesson.name,kind,...frame,created_by:profile.id},{onConflict:'arbox_schedule_id',ignoreDuplicates:true});
  if(inserted.error)return reply({error:'לא ניתן לפתוח משימת פעילות'},503);
  const saved=await db.from('biss_activity_jobs').select('id').eq('arbox_schedule_id',body.scheduleId).single();
  return saved.error?reply({error:'לא ניתן לפתוח משימת פעילות'},503):reply({id:saved.data.id});
 }
 if(!isRecruitmentId(body?.id)||!Number.isInteger(body.revision))return reply({error:'פרטי המשימה אינם תקינים'},400);
 const result=await db.from('biss_activity_jobs').select('*').eq('id',body.id).maybeSingle();
 if(result.error)return reply({error:'לא ניתן לבדוק משימה'},503);
 const job=result.data;if(!canReadActivity(profile,job))return reply({error:'המשימה אינה בחשבון הזה'},404);
 const manager=profile.role==='manager';let value={};
 if(body.action==='configure'){
  if(!manager)return reply({error:'רק מנהל קובע את פרטי ההזמנה והשיוך'},403);
  const setup=activitySetup(body,job.kind),terms=activityTerms(body,activityCatalog);
  if(!setup||!terms||!isRecruitmentId(body.customerId)||!isRecruitmentId(body.assignedId))return reply({error:'בחרו לקוח ואחראי, מלאו אסמכתאות ואשרו שבדקתם את ההזמנה והתשלום'},400);
  value={...setup,terms,customer_id:body.customerId,assigned_id:body.assignedId};
 }else if(['save','submit'].includes(body.action)){
  const plan=activityPlan(body.plan,job.terms);
  if(!plan||body.action==='submit'&&!completeActivityPlan(plan,job.terms))return reply({error:'סמנו את כל הציוד הכלול שהוכן ומלאו הוראות הגעה וסיום'},400);
  value=plan;
 }else if(body.action==='approve'){
  if(!manager)return reply({error:'נדרש אישור מנהל'},403);
  if(job.kind==='self_workout')return reply({error:'אימון עצמאי דורש תוכנית אישית מאושרת. מסלול פרסום אימון מתוך משימת פעילות עדיין בהכנה.'},409);
  if(body.availabilityVerified!==true||!completeActivityPlan(job.plan,job.terms))return reply({error:'יש לאשר בדיקת זמינות הציוד, המקום וההזמנה העדכנית בארבוקס'},400);
  value={availabilityVerified:true};
 }else if(!['reopen','cancel'].includes(body.action))return reply({error:'פעולה לא מוכרת'},400);
 if(['configure','approve'].includes(body.action)){
  const source=await sourceFor(job.arbox_schedule_id);if(source.error)return reply({error:source.error},source.status);
  if(!activitySourceMatches(job,source.lesson))return reply({error:'מועד הפעילות השתנה בארבוקס. אין לאשר את המסגרת הישנה; פנו למנהל.'},409);
 }
 const saved=await db.rpc('studio_prepare_activity',{p_id:job.id,p_actor:profile.id,p_revision:body.revision,p_action:body.action,p_value:value});
 const errors={denied:'אין הרשאה לפעולה',missing:'המשימה לא נמצאה',changed:'המשימה השתנתה. רעננו לפני שמירה',closed:'הפעילות נסגרה או הסתיימה',ready:'יש להחזיר את הפעילות לעריכה לפני שינוי',invalid_assignee:'יש לבחור אחראי פעיל בתפקיד מתאים',invalid_customer:'הלקוח אינו פעיל',unverified:'חסרה בדיקת הזמנה ותשלום',incomplete:'ההכנה עדיין אינה מלאה',overlap:'קיים ביקור מאושר נוסף באותן שעות',duplicate:'אסמכתת ההזמנה כבר שויכה לביקור אחר',workout_required:'נדרשת תוכנית אימון אישית מאושרת'};
 if(saved.error)return reply({error:'השמירה לא הושלמה. נסו לרענן ולבדוק את המשימה לפני ניסיון נוסף.'},503);
 if(saved.data!=='saved')return reply({error:errors[saved.data]||'פרטי הפעילות אינם תקינים'},409);
 await writeAudit(db,{action:`activity.${body.action}`,entityType:'activity',entityId:job.id,label:job.title,metadata:{status:body.action}});
 return reply({saved:true});
}
