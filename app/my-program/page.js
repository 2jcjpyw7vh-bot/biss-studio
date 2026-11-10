"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";

export default function MyProgramPage(){
 const[data,setData]=useState(null),[message,setMessage]=useState("טוען את התוכנית שלך…"),client=supabaseBrowser();
 useEffect(()=>{if(!client){setMessage("הכניסה האישית עדיין לא הופעלה בשרת.");return}client.auth.getSession().then(async({data:auth})=>{if(!auth.session){setMessage("יש להיכנס תחילה דרך הקישור במייל.");return}const r=await fetch("/api/my-program",{headers:{Authorization:`Bearer ${auth.session.access_token}`},cache:"no-store"}),d=await r.json();if(!r.ok){setMessage(d.error);return}setData(d);setMessage("")})},[client]);
 const payload=data?.program?.program_payload;
 return <main className="shell trainee-shell"><div className="row between"><div><div className="eyebrow">BISS STUDIO · אימון עצמאי</div><h1>התוכנית שלי</h1></div><Link className="btn" href="/">חזרה למערכת</Link></div>
  {message&&<section className="panel notice">{message} {message.includes("להיכנס")&&<Link href="/login">מעבר לכניסה</Link>}</section>}
  {data&&<><section className="panel"><h2>שלום {data.profile.full_name}</h2>{data.access.equipment?<div className="safe"><strong>שימוש במכשירים מאושר</strong><p>רק במכשירים, במשקלים ובתרגילים שמופיעים בתוכנית שאושרה עבורך.</p></div>:<div className="notice"><strong>ללא אישור שימוש במכשירים</strong><p>ניתן לבחור פילאטיס מזרן או יוגה עדינה בלבד.</p></div>}</section>
   {!data.access.equipment&&<section className="panel"><h2>אפשרויות בטוחות</h2><div className="grid">{data.alternatives.map(x=><article className="card" key={x.id}><h3>{x.title}</h3><div className="small">אימון עדין ללא שימוש במכשירי הסטודיו.</div></article>)}</div></section>}
   {payload&&<section className="panel"><h2>{payload.title||data.program.title}</h2><div className="sub">{payload.meta||data.program.summary}</div>{payload.sessions?.map((session,i)=>{const completed=data.progress.completed_sessions.includes(i),next=data.progress.next_session_index===i;return <article className={`card ${next?"recommended-session":""}`} key={i}><div className="row between"><div><h3>{session.name} {next&&<span className="tag green">האימון הבא</span>} {completed&&<span className="tag">הושלם</span>}</h3><div className="small">{session.progression}</div></div><Link className="btn primary" href={`/train/${data.program.id}/${i}`}>{completed?"ביצוע חוזר":"התחלת אימון"}</Link></div>{session.items?.map((item,j)=><div className="workout-item" key={item.id||j}><strong>{item.he}</strong><div>{item.prescription}</div>{item.cue&&<div className="small">{item.cue}</div>}</div>)}</article>})}</section>}
   <section className="panel notice">אם מופיעים כאב, סחרחורת, חולשה חריגה או תחושה לא בטוחה — מפסיקים את האימון ופונים לצוות.</section>
  </>}
 </main>
}

