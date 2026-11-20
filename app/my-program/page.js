"use client";
import StudioSocialLinks from "../StudioSocialLinks";
import Link from "next/link";
import ApprovedSessionPicker from "./ApprovedSessionPicker";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";

export default function MyProgramPage(){
 const client=supabaseBrowser();
 const [data,setData]=useState(null);
 const [status,setStatus]=useState({kind:"loading",text:"טוען את התוכנית שלך…"});
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!client){
   setStatus({kind:"unavailable",text:"שירות הכניסה של Studio אינו זמין כרגע."});
   return;
  }
  const controller=new AbortController();
  async function load() {
   const {data:auth,error}=await client.auth.getSession();
   if(controller.signal.aborted)return;
   if(error)throw error;
   if(!auth.session){
    setStatus({kind:"login",text:"יש להיכנס כדי לפתוח את התוכנית שלך."});
    return;
   }
   const response=await fetch("/api/my-program",{
    headers:{Authorization:`Bearer ${auth.session.access_token}`},
    cache:"no-store",signal:controller.signal
   });
   const result=await response.json();
   if(controller.signal.aborted)return;
   if(response.status===401){
    setStatus({kind:"login",text:"הכניסה פגה. היכנסי מחדש כדי לפתוח את התוכנית."});
    return;
   }
   if(response.status===403){
    setStatus({kind:"unavailable",text:result.error || "אין לחשבון הזה גישה לתוכנית."});
    return;
   }
   if(!response.ok)throw new Error(result.error || "לא ניתן לטעון את התוכנית.");
   setData(result);
   setStatus({kind:"ready",text:""});
  }
  load().catch(error=>{
   if(!controller.signal.aborted)setStatus({
    kind:"retry",text:error instanceof TypeError ? "החיבור נקטע בזמן טעינת התוכנית." : error.message || "לא ניתן לטעון את התוכנית."
   });
  });
  return()=>controller.abort();
 },[client,attempt]);

 function retry() {
  setStatus({kind:"loading",text:"טוען את התוכנית שלך…"});
  setAttempt(value=>value+1);
 }
 return <main className="shell trainee-shell"><div className="row between"><div><div className="eyebrow">BISS STUDIO · אימון עצמאי</div><h1>התוכנית שלי</h1></div><Link className="btn" href="/my-visits">חזרה לביקורים שלי</Link></div>
  {status.text&&<section className="panel notice" role="status">
   {status.text} {status.kind==="login"&&<Link href="/login">מעבר לכניסה</Link>}
   {status.kind==="retry"&&<button type="button" className="btn" onClick={retry}>ניסיון חוזר</button>}
  </section>}
  {data?.preparation&&<section className="panel safe"><h2>התוכנית האישית שלך בהכנה</h2><p>המדריכה: {data.preparation.coachName}</p><p>מפגש הפתיחה: {new Date(data.preparation.firstAppointment).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})}</p><strong>{data.preparation.stage==="manager_review"?"טיוטת התוכנית ממתינה לבדיקת מנהל":"ממתינים להכנת התוכנית עם המדריכה לאחר מפגש הפתיחה"}</strong><p>לאחר האישור, האימונים יופיעו כאן.</p></section>}
  {data&&<><section className="panel"><h2>שלום {data.profile.full_name}</h2>{data.access.equipment?<div className="safe"><strong>שימוש במכשירים מאושר</strong><p>רק במכשירים, במשקלים ובתרגילים שמופיעים בתוכנית שאושרה עבורך.</p></div>:<div className="notice"><strong>{data.access.mode==="onboarding_pending"?"ממתינים להשלמת הקליטה ומפגש אישי":"ללא אישור שימוש במכשירים"}</strong><p>{data.access.mode==="onboarding_pending"?"לפני אימון עצמאי יש להשלים רישום, בדיקת הצהרת בריאות ומפגש עם מדריכה. במקרה הצורך נדרש גם מסלול הורה. הצטרפות להזמנה אינה מחליפה את האישורים.":"ניתן לבחור פילאטיס מזרן או יוגה עדינה בלבד."}</p></div>}</section>
   {!data.access.equipment&&data.alternatives.length>0&&<section className="panel"><h2>אפשרויות בטוחות</h2><div className="grid">{data.alternatives.map(x=><article className="card" key={x.id}><h3>{x.title}</h3><div className="small">אימון עדין ללא שימוש במכשירי הסטודיו.</div></article>)}</div></section>}
   {data.program&&<ApprovedSessionPicker program={data.program} progress={data.progress}/>}
   <section className="panel notice">אם מופיעים כאב, סחרחורת, חולשה חריגה או תחושה לא בטוחה — מפסיקים את האימון ופונים לצוות.</section>
  </>}
 <StudioSocialLinks/></main>
}
