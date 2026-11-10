"use client";
import {useState} from "react";

export default function ArboxPanel(){
 const[pin,setPin]=useState(""),[data,setData]=useState(null),[message,setMessage]=useState("");
 const check=async()=>{setMessage("");const r=await fetch("/api/integrations/arbox",{headers:{"x-admin-pin":pin},cache:"no-store"}),d=await r.json();if(!r.ok){setMessage(`⚠️ ${d.error}`);return}setData(d);setMessage("✓ בדיקת המוכנות הושלמה")};
 return <section className="panel integration-panel"><div className="row between"><div><h2>חיבור Arbox</h2><div className="sub">הכנה לסנכרון דרך API V3 רשמי בלבד. המערכת אינה משתמשת באוטומציה של הדפדפן.</div></div><span className="tag blue">מצב הכנה</span></div>
  <div className="notice">לא יתבצע סנכרון או שינוי ב‑Arbox לפני קבלת כתובת API V3 ומפתח רשמי מ‑Arbox, והשלמת בדיקה בסביבה מבוקרת.</div>
  <div className="continuity-login"><label className="field">PIN מנהל<input type="password" value={pin} onChange={e=>setPin(e.target.value)}/></label><button className="btn primary" disabled={!pin} onClick={check}>בדיקת מוכנות</button></div>
  {message&&<div className={message.startsWith("✓")?"safe":"notice"}>{message}</div>}
  {data&&<><div className="continuity-kpis"><div><strong>{data.mappings.groups}</strong><span>קבוצות ממופות</span></div><div><strong>{data.mappings.users}</strong><span>משתמשות ממופות</span></div><div><strong>{data.mappings.sessions}</strong><span>אימונים ממופים</span></div></div><div className={data.configuration.configured?"safe":"notice"}><strong>{data.configuration.configured?"הגדרת API V3 מוכנה":"נדרשים פרטי API רשמיים"}</strong><div className="small">{data.configuration.validHost?"כתובת Arbox מאושרת":"לא הוגדרה כתובת API מאושרת"} · {data.configuration.hasKey?"מפתח קיים בשרת":"מפתח API טרם הוגדר"}</div></div><div className="small">כתובת הממשק והמפתח נשמרים בשרת בלבד ואינם מוצגים במסך זה.</div></>}
 </section>
}

