"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {supabaseBrowser} from "../../../../lib/supabase-browser";

const clock=value=>`${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;

export default function TrainingRunner(){
 const{programId,sessionIndex}=useParams(),[data,setData]=useState(null),[message,setMessage]=useState("טוען אימון מאושר…"),[current,setCurrent]=useState(0),[seconds,setSeconds]=useState(45),[running,setRunning]=useState(false),client=supabaseBrowser();
 useEffect(()=>{if(!client){setMessage("הכניסה האישית עדיין לא הופעלה בשרת.");return}client.auth.getSession().then(async({data:auth})=>{if(!auth.session){setMessage("יש להיכנס תחילה.");return}const r=await fetch(`/api/run/${programId}/${sessionIndex}`,{headers:{Authorization:`Bearer ${auth.session.access_token}`},cache:"no-store"}),d=await r.json();if(!r.ok){setMessage(d.error);return}setData(d);setMessage("")})},[client,programId,sessionIndex]);
 useEffect(()=>{if(!running||seconds<=0)return;const timer=setInterval(()=>setSeconds(value=>value-1),1000);return()=>clearInterval(timer)},[running,seconds]);
 useEffect(()=>{setSeconds(45);setRunning(false)},[current]);
 const fullscreen=()=>document.documentElement.requestFullscreen?.();
 if(!data)return <main className="training-runner"><section className="panel"><h2>{message}</h2><Link className="btn" href="/my-program">חזרה לתוכנית</Link></section></main>;
 const items=data.session.items,item=items[current];
 return <main className="training-runner">
  <header className="runner-topbar"><div><div className="eyebrow">BISS STUDIO · {data.program.title}</div><strong>{data.session.name}</strong></div><div className="row"><button className="btn" onClick={fullscreen}>מסך מלא</button><Link className="btn" href="/my-program">סיום</Link></div></header>
  {!item?<section className="runner-stage"><h1>לא הוגדרו תרגילים באימון זה</h1></section>:<section className="runner-stage">
   <div className="runner-progress">תרגיל {current+1} מתוך {items.length}</div>
   <h1>{item.he}</h1>{item.en&&<div className="runner-english">{item.en}</div>}
   <div className="runner-prescription">{item.prescription}</div>
   <div className="runner-meta"><span>{item.equipment||"ללא ציוד"}</span>{data.session.progression&&<span>{data.session.progression}</span>}</div>
   {item.cue&&<div className="runner-cue">{item.cue}</div>}
   <div className="runner-timer"><strong>{clock(seconds)}</strong><div className="row"><button className="btn" onClick={()=>setSeconds(Math.max(15,seconds-15))}>−15</button><button className="btn primary" onClick={()=>setRunning(value=>!value)}>{running?"עצירה":"הפעלה"}</button><button className="btn" onClick={()=>setSeconds(seconds+15)}>+15</button></div></div>
   {seconds===0&&<div className="safe"><strong>הזמן הסתיים</strong> — עברו לתרגיל הבא כשאתם מוכנים.</div>}
   <div className="runner-controls"><button className="btn" disabled={current===0} onClick={()=>setCurrent(value=>value-1)}>הקודם</button>{item.id&&<Link className="btn" href={`/exercise/${item.id}`} target="_blank">הסבר לתרגיל</Link>}<button className="btn primary" disabled={current===items.length-1} onClick={()=>setCurrent(value=>value+1)}>הבא</button></div>
  </section>}
  <footer className="runner-footer"><strong>הקרנה למסך:</strong> הפעילו שיקוף מסך או Cast במכשיר לאחר התחברות לרשת הסטודיו. המערכת אינה מתחברת אוטומטית למסך. <span>בכאב או תחושה חריגה מפסיקים מיד.</span></footer>
 </main>
}

