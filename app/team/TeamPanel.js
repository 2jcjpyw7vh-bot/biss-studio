"use client";
import {useMemo,useState} from "react";
const roles={manager:"מנהלת",instructor:"מדריכה",trainee:"מתאמנת"};
const actionLabels={"group.created":"קבוצה נוצרה","session.created":"אימון תוכנן","adaptation.created":"התאמה נוספה","handoff.created":"עדכון למדריכה נשמר","workout.attached":"אימון נשמר לקבוצה","user.created":"משתמשת נוספה","substitute_offer.created":"הצעת החלפה נוצרה","equipment.created":"פריט ציוד נוסף","equipment.updated":"מלאי ציוד עודכן","equipment.deleted":"פריט ציוד נמחק"};
const areas={all:"הכול",equipment:"מלאי וציוד",team:"צוות והחלפות",training:"קבוצות ואימונים"};
const area=a=>a.startsWith("equipment.")?"equipment":["user.created","substitute_offer.created"].includes(a)?"team":"training";
const statuses={pending:"ממתינה",accepted:"אושרה",declined:"נדחתה",cancelled:"בוטלה"};
export default function TeamPanel(){
 const[pin,setPin]=useState(""),[data,setData]=useState(null),[msg,setMsg]=useState(""),[shareUrl,setShareUrl]=useState(""),[filter,setFilter]=useState("all");
 const call=async body=>{setMsg("");const r=await fetch("/api/team",{method:body?"POST":"GET",headers:{"Content-Type":"application/json","x-admin-pin":pin},body:body?JSON.stringify(body):undefined,cache:"no-store"}),d=await r.json();if(!r.ok){setMsg(`⚠️ ${d.error}`);return}setData(d);if(d.share_url)setShareUrl(d.share_url);setMsg(body?"✓ נשמר":"✓ הצוות נטען")};
 const submit=action=>async e=>{e.preventDefault();await call({action,...Object.fromEntries(new FormData(e.currentTarget))});e.currentTarget.reset()};
 const users=data?.users||[],sessions=data?.sessions||[],groups=data?.groups||[],offers=data?.offers||[],audit=data?.audit||[];
 const visibleAudit=useMemo(()=>audit.filter(x=>filter==="all"||area(x.action)===filter),[audit,filter]);
 const group=id=>groups.find(x=>x.id===id)?.name||"קבוצה",instructor=id=>users.find(x=>x.id===id)?.full_name||"מדריכה";
 return <section className="panel team-panel">
  <div className="row between"><div><h2>צוות והרשאות</h2><div className="sub">ניהול מי רשום במערכת, מה תפקידה ולמי ניתן להציע אימון להחלפה.</div></div><span className="tag green">ניהול בלבד</span></div>
  <div className="role-map"><div><strong>מנהלת</strong><span>הכול, כולל מידע רגיש וניהול</span></div><div><strong>מדריכה</strong><span>אימונים ששובצה אליהם והתאמות נדרשות</span></div><div><strong>מתאמנת</strong><span>רק תוכנית ותוכן שנשלחו אליה</span></div></div>
  <div className="continuity-login"><label className="field">PIN מנהל<input type="password" value={pin} onChange={e=>setPin(e.target.value)}/></label><button className="btn primary" onClick={()=>call()} disabled={!pin}>פתיחת ניהול</button></div>
  {msg&&<div className={msg.startsWith("✓")?"safe":"notice"}>{msg}</div>}
  {data&&<>
   <div className="continuity-grid">
    <form className="card" onSubmit={submit("user")}><h3>הוספת משתמשת</h3><input name="full_name" required placeholder="שם מלא"/><input name="email" type="email" placeholder="אימייל"/><input name="phone" placeholder="טלפון"/><select name="role" defaultValue="instructor"><option value="manager">מנהלת</option><option value="instructor">מדריכה</option><option value="trainee">מתאמנת</option></select><button className="btn primary">שמירה</button></form>
    <form className="card" onSubmit={submit("offer")}><h3>הצעת אימון למחליפה</h3><select name="session_id" required defaultValue=""><option value="" disabled>בחירת אימון</option>{sessions.map(s=><option key={s.id} value={s.id}>{group(s.group_id)} · {new Date(s.starts_at).toLocaleString("he-IL")}</option>)}</select><select name="instructor_id" required defaultValue=""><option value="" disabled>בחירת מדריכה</option>{users.filter(u=>u.role==="instructor"&&u.status==="active").map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select><textarea name="message" placeholder="הודעה אישית אופציונלית"/><button className="btn primary">יצירת קישור הצעה</button>{shareUrl&&<div className="offer-share"><input readOnly value={shareUrl}/><a className="btn green" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`הצעת אימון מ-BISS Studio\n${shareUrl}`)}`}>WhatsApp</a><a className="btn blue" href={`mailto:?subject=${encodeURIComponent("הצעת אימון מ-BISS Studio")}&body=${encodeURIComponent(shareUrl)}`}>מייל</a></div>}</form>
   </div>
   <h3 className="section-title">משתמשות רשומות</h3><div className="team-list">{users.map(u=><article className="card" key={u.id}><strong>{u.full_name}</strong><span className="tag">{roles[u.role]}</span><div className="small">{u.email||u.phone||"ללא פרטי קשר"}</div></article>)}</div>
   {offers.length>0&&<><h3 className="section-title">הצעות אחרונות</h3>{offers.slice(0,8).map(o=><div className="row between card" key={o.id}><span>{instructor(o.instructor_id)}</span><span className="tag">{statuses[o.status]||o.status}</span></div>)}</>}
   <div className="audit-heading"><div><h3 className="section-title">יומן פעולות</h3><div className="small">תיעוד מנהלי בלבד, ללא מידע רפואי וללא סודות.</div></div><label className="field audit-filter">סינון<select value={filter} onChange={e=>setFilter(e.target.value)}>{Object.entries(areas).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
   <div className="audit-list">{visibleAudit.length===0&&<div className="notice">עדיין אין פעולות להצגה בסינון הזה.</div>}{visibleAudit.map(x=><article className="audit-row" key={x.id}><div><strong>{actionLabels[x.action]||"פעולה במערכת"}</strong>{x.label&&<div className="small">{x.label}</div>}</div><time dateTime={x.created_at}>{new Date(x.created_at).toLocaleString("he-IL")}</time></article>)}</div>
  </>}
 </section>
}

