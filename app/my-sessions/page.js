"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";

export default function MySessionsPage(){
 const[data,setData]=useState(null),[message,setMessage]=useState("טוען את האימונים שלך…");
 const client=supabaseBrowser();
 useEffect(()=>{if(!client){setMessage("הכניסה האישית עדיין לא הופעלה בשרת.");return}client.auth.getSession().then(async({data:auth})=>{if(!auth.session){setMessage("יש להיכנס תחילה דרך הקישור במייל.");return}const r=await fetch("/api/my-sessions",{headers:{Authorization:`Bearer ${auth.session.access_token}`},cache:"no-store"}),d=await r.json();if(!r.ok){setMessage(d.error);return}setData(d);setMessage("")})},[client]);
 const group=id=>data?.groups.find(x=>x.id===id);
 return <main className="shell instructor-shell"><div className="row between"><div><div className="eyebrow">BISS STUDIO · אזור מדריכה</div><h1>האימונים שלי</h1></div><Link className="btn" href="/">חזרה למערכת</Link></div>
  {message&&<section className="panel notice">{message} {message.includes("להיכנס")&&<Link href="/login">מעבר לכניסה</Link>}</section>}
  {data&&<><section className="panel"><h2>שלום {data.profile.full_name}</h2><div className="sub">כאן מופיעים רק האימונים המשויכים אלייך והמידע הנדרש להכנה.</div></section>
   {data.sessions.length===0?<section className="panel"><div className="sub">אין כרגע אימונים משויכים אלייך.</div></section>:data.sessions.map(session=>{const g=group(session.group_id),notes=data.handoffs.filter(x=>x.session_id===session.id),limits=data.adaptations.filter(x=>x.group_id===session.group_id);return <article className="panel instructor-session" key={session.id}>
    <div className="row between"><div><h2>{g?.name||"קבוצה"} · {session.title}</h2><div className="sub">{new Date(session.starts_at).toLocaleString("he-IL")} · {g?.level||"רמה מעורבת"}</div></div><span className="tag green">{session.status}</span></div>
    {session.workout_summary?<div className="safe"><strong>תוכנית האימון</strong><p>{session.workout_summary}</p></div>:<div className="notice">תוכנית האימון עדיין לא נשמרה.</div>}
    {(session.playlist_url||g?.playlist_url)&&<a className="btn" href={session.playlist_url||g.playlist_url} target="_blank" rel="noreferrer">פתיחת הפלייליסט</a>}
    {notes.map(note=><div className="safe" key={note.id}><strong>עדכון מהצוות · {note.author_name||"ללא שם"}</strong><div>{note.note}</div></div>)}
    {data.profile.can_view_health&&limits.length>0&&<div className="instructor-adaptations"><h3>התאמות נדרשות</h3>{limits.map(item=><div className="notice" key={item.id}><strong>{item.member_name} · {item.category}</strong><div>{item.guidance}</div></div>)}</div>}
   </article>})}
  </>}
 </main>
}

