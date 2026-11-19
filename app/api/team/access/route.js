import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase";
import {studioProfileFromRequest} from "../../../../lib/studio-auth";
import {whatsappNumber} from "../../../../lib/substitute-contact";
import {isRecruitmentId} from "../../../../lib/recruitment";

const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function POST(req) {
  const db=supabaseAdmin();
  if(!db)return reply({error:"שירות Studio אינו זמין."},503);
  const access=await studioProfileFromRequest(req,db);
  if(access.error)return reply({error:access.error},access.status);
  if(access.profile.role!=="manager")return reply({error:"שליחת כניסה אישית דורשת חשבון מנהלת."},403);
  const body=await req.json().catch(()=>null);
  if(!isRecruitmentId(body?.userId)||(body.taskId&&!isRecruitmentId(body.taskId)))return reply({error:"חסרה משתמשת או משימה תקינה."},400);
  const {data:person,error}=await db.from("biss_users").select("id,full_name,email,phone,status,role,auth_user_id").eq("id",body.userId).maybeSingle();
  if(error)return reply({error:"לא ניתן לבדוק את פרטי המשתמשת."},503);
  if(!person||person.status!=="active"||!["manager","instructor"].includes(person.role)||!person.email)return reply({error:"נדרשת מדריכה פעילה עם מייל תקין. עדכנו את פרטי הקשר בצוות והרשאות."},409);
  if(body.channel!=="email"&&!whatsappNumber(person.phone))return reply({error:"יש לעדכן מספר וואטסאפ תקין בצוות והרשאות."},409);
  let task;
  if(body.taskId){
    const result=await db.from("biss_workout_tasks").select("id,instructor_id,title,starts_at").eq("id",body.taskId).maybeSingle();
    if(result.error)return reply({error:"לא ניתן לבדוק את המשימה."},503);
    task=result.data;
    if(!task||task.instructor_id!==person.id)return reply({error:"המשימה אינה משויכת למדריכה שנבחרה."},409);
  }
  if(person.auth_user_id){
    const existing=await db.auth.admin.getUserById(person.auth_user_id);
    if(existing.error||existing.data.user?.email?.toLowerCase()!==person.email.toLowerCase())return reply({error:"פרטי חשבון הכניסה אינם תואמים. יש לבדוק את החשבון בצוות והרשאות."},409);
  }
  const base=process.env.NEXT_PUBLIC_SITE_URL;
  if(!base)return reply({error:"כתובת Studio חסרה בהגדרות הפרויקט."},503);
  const url=new URL("/login",base);
  url.searchParams.set("next",task?`build-task:${task.id}`:"my-sessions");
  if(body.channel==="email"){
    const {error:mailError}=await db.auth.signInWithOtp({email:person.email,options:{shouldCreateUser:true,emailRedirectTo:url.href}});
    if(mailError)return reply({error:mailError.status===429?"ספק המייל חסם את הבקשה בגלל מכסת השליחה. אפשר להשתמש בכניסה אישית בוואטסאפ.":"שליחת המייל נכשלה. בדקו את הכתובת או שלחו כניסה בוואטסאפ."},mailError.status===429?429:503);
    return reply({message:"בקשת שליחת מייל הכניסה התקבלה אצל הספק. יש לוודא עם המדריכה שהמייל הגיע."});
  }
  // Only the manager can generate a link, always for the stored recipient.
  // The one-time token stays in the URL fragment and is never logged.
  const {data,error:linkError}=await db.auth.admin.generateLink({type:"magiclink",email:person.email});
  if(linkError||!data?.properties?.hashed_token)return reply({error:"לא ניתן ליצור כניסה אישית כרגע."},503);
  if(person.auth_user_id&&data.user?.id!==person.auth_user_id)return reply({error:"חשבון הכניסה השתנה. יש לרענן את פרטי הצוות."},409);
  url.hash=new URLSearchParams({token_hash:data.properties.hashed_token}).toString();
  const text=`היי ${person.full_name}, כאן BISS Studio.\n${task?`מחכה לך בקשה לבניית אימון ״${task.title}״, בתאריך ${new Date(task.starts_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})}. מסגרת האימון כבר הוגדרה עבורך.`:"האזור האישי שלך בסטודיו מוכן."}\n\nלחצי על הקישור ואז על אישור הכניסה. זה קישור אישי וחד־פעמי, שמיועד לך בלבד.\n${url.href}\n\nאם פג תוקף הקישור, בקשי מהמנהלת קישור חדש.`;
  return reply({whatsapp:`https://wa.me/${whatsappNumber(person.phone)}?text=${encodeURIComponent(text)}`,recipient:person.full_name});
}
