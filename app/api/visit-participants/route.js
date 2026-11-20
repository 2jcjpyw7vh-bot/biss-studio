import {NextResponse} from 'next/server';
import {supabaseAdmin} from '../../../lib/supabase';
import {studioProfileFromRequest} from '../../../lib/studio-auth';
import {isRecruitmentId} from '../../../lib/recruitment';
import {participantInput,participantChecklist} from '../../../lib/visit-participants';
import {whatsappNumber} from '../../../lib/substitute-contact';
export const dynamic='force-dynamic';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function access(req){const db=supabaseAdmin();if(!db)return {response:reply({error:'שירות Studio אינו זמין'},503)};const a=await studioProfileFromRequest(req,db);return a.error?{response:reply({error:a.error},a.status)}:{db,profile:a.profile};}
const errors={denied:'אין הרשאה לניהול המשתתפים',closed:'הביקור בוטל או הסתיים',self:'אתם כבר משויכים להזמנה כמשלמים. הזינו משתתף נוסף',capacity:'כל המקומות שאושרו להזמנה כבר משויכים. יש לפנות לצוות להרחבת ההזמנה',limit:'הגעתם למגבלת ההזמנות או השליחה. המתינו או פנו לצוות',missing:'ההזמנה למשתתף כבר השתנתה',invalid_recipient:'פרטי הנמען דורשים בדיקה של צוות הסטודיו',identity:'קיים שיוך אחר לארבוקס. נדרשת בדיקת מנהל'};
export async function GET(req){
 const {db,profile,response}=await access(req);if(response)return response;
 const id=new URL(req.url).searchParams.get('visitId');
 if(!id){
  const rows=await db.from('biss_visit_participants').select('id,visit_id,display_name,status').eq('user_id',profile.id).eq('status','invited');
  if(rows.error)return reply({error:'לא ניתן לטעון הזמנות להצטרפות'},503);
  const ids=rows.data.map(row=>row.visit_id);
  const visits=ids.length?await db.from('biss_visits').select('id,title,starts_at,ends_at').in('id',ids).eq('status','confirmed').gt('ends_at',new Date().toISOString()):{data:[]};
  if(visits.error)return reply({error:'לא ניתן לטעון פרטי הזמנה'},503);
  return reply({invitations:rows.data.flatMap(row=>{const visit=visits.data.find(visit=>visit.id===row.visit_id);return visit?[{...row,visit}]:[];})});
 }
 if(!isRecruitmentId(id))return reply({error:'קישור לא תקין'},400);
 const visit=await db.from('biss_visits').select('id,customer_id,party_size,status,ends_at').eq('id',id).maybeSingle();
 if(visit.error)return reply({error:'לא ניתן לבדוק הזמנה'},503);
 if(!visit.data||profile.role!=='manager'&&visit.data.customer_id!==profile.id)return reply({error:'אין גישה לרשימת המשתתפים'},403);
 const rows=await db.from('biss_visit_participants').select('id,user_id,display_name,status,arbox_verified,health_verified,introduction_completed,age_band,guardian_verified').eq('visit_id',id).neq('status','removed');
 if(rows.error)return reply({error:'לא ניתן לטעון משתתפים'},503);
 return reply({participants:rows.data.map(({user_id,...row})=>({...row,checklist:participantChecklist(row)})),capacity:visit.data.party_size,canManage:profile.role==='manager',closed:visit.data.status!=='confirmed'||Date.parse(visit.data.ends_at)<=Date.now()});
}
export async function POST(req){
 const {db,profile,response}=await access(req);if(response)return response;
 const body=await req.json().catch(()=>null);
 if(!isRecruitmentId(body?.visitId))return reply({error:'פרטי הזמנה אינם תקינים'},400);
 let action=body.action,value={},phoneInviteToken='';
 if(action==='invite'){
  value=participantInput(body);if(!value)return reply({error:'מלאו שם ומייל תקין ואשרו שיש לכם רשות למסור את הפרטים לצורך ההזמנה'},400);
 }else if(['remove','send','verify'].includes(action)){
  if(!isRecruitmentId(body.id))return reply({error:'חסר משתתף'},400);
  value={id:body.id};
  if(action==='verify'){
   if(profile.role!=='manager'||body.confirmed!==true||!/^\d{1,20}$/.test(body.arboxId||''))return reply({error:'נדרשים מנהל, מזהה לקוח בארבוקס ואישור שבדקתם את הרשומה והמסמכים'},400);
   value={...value,arbox_id:body.arboxId,health:body.health===true,introduction:body.introduction===true,guardian:body.guardian===true};
  }
 }else if(action!=='accept')return reply({error:'פעולה לא מוכרת'},400);
 if(action!=='send'){
  phoneInviteToken=action==='invite'&&!value.email?randomBytes(32).toString('hex'):'';
  const result=phoneInviteToken?await db.rpc('studio_phone_participant',{p_actor:profile.id,p_visit:body.visitId,p_name:value.name,p_phone:whatsappNumber(value.phone),p_age:value.age_band,p_hash:createHash('sha256').update(phoneInviteToken).digest('hex')}):await db.rpc('studio_visit_participant',{p_actor:profile.id,p_visit:body.visitId,p_action:action,p_value:value});
  if(result.error)return reply({error:'השמירה לא הושלמה. בדקו את הרשימה לפני ניסיון נוסף'},503);
  if(result.data?.error)return reply({error:errors[result.data.error]||'הפרטים אינם תקינים'},409);
  if(action!=='invite')return reply({saved:true});
  body.id=result.data.id;
 }
 // A purchaser can request email OTP delivery, never mint a login token for another person.
 const reserved=await db.rpc('studio_visit_participant',{p_actor:profile.id,p_visit:body.visitId,p_action:'reserve_mail',p_value:{id:body.id}});
 if(reserved.error||reserved.data?.error)return reply({saved:action==='invite',error:errors[reserved.data?.error]||'לא ניתן להכין משלוח כרגע'},429);
 const participant=await db.from('biss_visit_participants').select('user_id,display_name,contact_phone,status').eq('id',body.id).eq('visit_id',body.visitId).single();
 if(participant.error)return reply({error:'לא ניתן לבדוק נמען'},503);
 if(!participant.data.user_id){
  const base=process.env.NEXT_PUBLIC_SITE_URL;if(!base)return reply({error:'כתובת האתר אינה מוגדרת'},503);
  const raw=randomBytes(32).toString('hex'),hash=createHash('sha256').update(raw).digest('hex');
  const saved=await db.from('biss_visit_participants').update({token_hash:hash,token_expires_at:new Date(Date.now()+7*86400000).toISOString(),pending_email:null}).eq('id',body.id).eq('status','invited');
  if(saved.error)return reply({error:'לא ניתן להכין קישור אישי'},503);
  const url=new URL(`/join/${raw}`,base),number=whatsappNumber('+'+participant.data.contact_phone);
  if(!number)return reply({error:'חסר מספר תקין להזמנה'},400);
  const text=`היי ${participant.data.display_name}, הוזמנת לפעילות בביסס. אין צורך ברכישה נוספת.\nפתחו את ההזמנה האישית והזינו בעצמכם מייל לכניסה:\n${url.href}\n\nהקישור אישי. הרישום בארבוקס, הצהרת הבריאות ואישורי האימון מושלמים בנפרד עם הצוות.`;
  return reply({saved:true,message:'ההזמנה נשמרה לפי הטלפון. פתחו את וואטסאפ ושלחו את ההודעה. המשתתף יזין בעצמו מייל.',whatsapp:`https://wa.me/${number}?text=${encodeURIComponent(text)}`});
 }
 const person=await db.from('biss_users').select('email,phone,status').eq('id',participant.data.user_id).single();
 if(person.error||!['active','invited'].includes(person.data?.status))return reply({error:'פרטי הנמען דורשים בדיקת צוות'},409);
 const base=process.env.NEXT_PUBLIC_SITE_URL;if(!base)return reply({error:'כתובת האתר אינה מוגדרת'},503);
 const login=new URL('/login?next=my-visits',base);
 if(body.channel==='whatsapp'){
  const phone=whatsappNumber(person.data.phone);if(!phone)return reply({saved:true,error:'לא הוזן טלפון תקין. אפשר לשלוח במייל'},400);
  const text=`היי ${participant.data.display_name}, הוזמנת להצטרף לפעילות בביסס. אין צורך ברכישה נוספת.\nהיכנסו עם כתובת המייל שלכם ואשרו את ההזמנה באזור האישי:\n${login.href}\n\nרישום בארבוקס, הצהרת בריאות ואישור אישי לאימון מושלמים בנפרד עם צוות הסטודיו.`;
  return reply({saved:true,whatsapp:`https://wa.me/${phone}?text=${encodeURIComponent(text)}`});
 }
 const mail=await db.auth.signInWithOtp({email:person.data.email,options:{shouldCreateUser:true,emailRedirectTo:login.href}});
 return mail.error?reply({saved:true,error:'המשתתף נשמר, אך ספק המייל לא אישר שליחה. אפשר לנסות שוב בהמשך או להכין הודעת וואטסאפ'},503):reply({saved:true,message:'המשתתף נשמר ובקשת מייל כניסה נשלחה לספק. יש לוודא שהמייל הגיע.'});
}
import {randomBytes,createHash} from 'node:crypto';
