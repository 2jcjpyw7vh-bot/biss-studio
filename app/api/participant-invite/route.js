import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {supabaseAdmin} from '../../../lib/supabase';
import {studioProfileFromRequest} from '../../../lib/studio-auth';
export const dynamic='force-dynamic';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
const digest=token=>/^[a-f0-9]{64}$/.test(token||'')?createHash('sha256').update(token).digest('hex'):'';
export async function GET(req){
 const hash=digest(new URL(req.url).searchParams.get('token'));if(!hash)return reply({error:'קישור לא תקין'},400);
 const db=supabaseAdmin();if(!db)return reply({error:'השירות אינו זמין'},503);
 const invite=await db.from('biss_visit_participants').select('display_name,visit_id,age_band').eq('token_hash',hash).eq('status','invited').gt('token_expires_at',new Date().toISOString()).maybeSingle();
 if(invite.error)return reply({error:'לא ניתן לבדוק הזמנה'},503);
 if(!invite.data)return reply({error:'הקישור פג או שההזמנה כבר אושרה. אפשר לפתוח את האזור האישי או לבקש קישור חדש מהמשלם.'},404);
 const visit=await db.from('biss_visits').select('title,starts_at,ends_at').eq('id',invite.data.visit_id).eq('status','confirmed').gt('ends_at',new Date().toISOString()).maybeSingle();
 if(visit.error||!visit.data)return reply({error:'הפעילות אינה זמינה להצטרפות'},409);
 return reply({name:invite.data.display_name,ageBand:invite.data.age_band,visit:visit.data});
}
export async function POST(req){
 const body=await req.json().catch(()=>null),hash=digest(body?.token);if(!hash)return reply({error:'קישור לא תקין'},400);
 const db=supabaseAdmin();if(!db)return reply({error:'השירות אינו זמין'},503);
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 let profile;
 if(body.action==='accept'){
  const auth=await studioProfileFromRequest(req,db);if(auth.error)return reply({error:auth.error},auth.status);profile=auth.profile;
 }else if(body.action!=='email'||email.length>180||!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email))return reply({error:'יש למלא מייל אישי תקין'},400);
 const result=await db.rpc('studio_claim_participant',{p_hash:hash,p_action:body.action,p_email:email,p_user:profile?.id||null});
 if(result.error)return reply({error:'לא ניתן להשלים את הבקשה'},503);
 const messages={expired:'הקישור פג או בוטל. בקשו הזמנה חדשה',limit:'כבר נשלח מייל לאחרונה או שהגעתם למגבלת השליחה. המתינו או פנו לצוות',identity:'יש להיכנס עם המייל שאומת עבור ההזמנה הזו',self:'זהו המייל של המשלם. נדרש מייל נפרד למשתתף; לרישום בליווי הורה פנו לצוות',duplicate:'החשבון כבר משויך לפעילות. פתחו את האזור האישי'};
 if(result.data?.error)return reply({error:messages[result.data.error]||'לא ניתן לאמת את הפרטים. פנו לצוות'},409);
 if(body.action==='accept')return reply({saved:true,visitId:result.data.visit_id});
 const base=process.env.NEXT_PUBLIC_SITE_URL;if(!base)return reply({error:'כתובת האתר אינה זמינה'},503);
 const redirect=new URL('/login',base);redirect.searchParams.set('next',`participant:${body.token}`);
 const mail=await db.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:redirect.href}});
 return mail.error?reply({error:'ספק המייל לא אישר שליחה. נסו בהמשך או פנו לצוות'},503):reply({message:'מייל כניסה נשלח. פתחו את הקישור במייל וחזרו לאישור ההצטרפות. יש לבדוק גם בדואר זבל.'});
}
