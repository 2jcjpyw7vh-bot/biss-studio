"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import BoneDemoLinks from "../../exercise/BoneDemoLinks";

const finalMessages={accepted:"ההצעה כבר אושרה.",declined:"ההצעה נדחתה.",cancelled:"ההצעה בוטלה על ידי הסטודיו.",expired:"פג תוקף ההצעה."};

export default function SubstituteOffer(){
 const{token}=useParams(),[data,setData]=useState(null),[message,setMessage]=useState("");
 useEffect(()=>{fetch(`/api/substitute/${token}`,{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setData(d)}).catch(e=>setMessage(e.message))},[token]);
 const decide=async decision=>{const r=await fetch(`/api/substitute/${token}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision})}),d=await r.json();if(r.ok)setData(current=>({...current,status:decision}));setMessage(r.ok?(decision==="accepted"?"השיבוץ אושר. תודה!":"ההצעה נדחתה ונעדכן את הסטודיו."):d.error)};
 if(!data)return <main className="shell"><section className="panel"><h2>{message||"טוען הצעת אימון…"}</h2></section></main>;
 const s=data.biss_sessions,expired=data.status==="pending"&&new Date(data.expires_at)<new Date(),state=expired?"expired":data.status,active=state==="pending";
 return <main className="shell substitute-page"><section className="panel">
  <div className="eyebrow">BISS STUDIO · הצעת החלפה</div>
  <h1>{s.biss_groups?.name||"קבוצה"} · {s.title}</h1>
  <div className="sub">{new Date(s.starts_at).toLocaleString("he-IL")}</div>
  {data.show_workout?<div className="safe"><strong>האימון כבר מוכן</strong><p style={{whiteSpace:"pre-line"}}>{s.workout_summary||"תוכנית האימון תעודכן לפני מועד האימון."}</p></div>:<div className="notice"><strong>פרטי האימון שמורים בסטודיו</strong><p>תוכנית האימון והפלייליסט יימסרו לאחר אישור השיבוץ.</p></div>}
  {s.playlist_url&&<a className="btn" href={s.playlist_url} target="_blank" rel="noreferrer">פתיחת הפלייליסט</a>}
  <BoneDemoLinks demos={s.bone_demos}/>
  {data.message&&<p>{data.message}</p>}
  {active?<div className="row"><button className="btn primary" onClick={()=>decide("accepted")}>מתאימה לי — אישור</button><button className="btn" onClick={()=>decide("declined")}>לא מתאימה הפעם</button></div>:<div className="notice">{finalMessages[state]||"ההצעה אינה פעילה."}</div>}
  {message&&<div className="notice">{message}</div>}
  <div className="small">שמות מתאמנות ומידע רפואי אינם מוצגים בקישור זה.</div>
 </section></main>
}
