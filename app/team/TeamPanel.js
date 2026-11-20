"use client";
import {useStudioSession} from "../StudioSession";
import {studioAdminHeaders} from "../../lib/studio-admin-client";
import {useEffect,useMemo,useState} from "react";
import SubstituteOfferPanel from "./SubstituteOfferPanel";
import OfferContactLinks from "./OfferContactLinks";
import StaffAccessShare from "./StaffAccessShare";
import RecruitmentPanel from "./RecruitmentPanel";
import ArboxStaffMapping from "./ArboxStaffMapping";
const roles={manager:"מנהלת",instructor:"מדריכה",trainee:"לקוח/ה",operator:"מתפעל/ת"};
const actionLabels={"group.created":"קבוצה נוצרה","session.created":"אימון תוכנן","adaptation.created":"התאמה נוספה","handoff.created":"עדכון למדריכה נשמר","workout.attached":"אימון נשמר לקבוצה","program.assigned":"תוכנית אישית נשמרה","user.created":"משתמשת נוספה","user.updated":"הרשאות משתמשת עודכנו","user.invited":"הזמנת כניסה נשלחה","substitute_offer.created":"הצעת החלפה נוצרה","substitute_offer.accepted":"הצעת החלפה אושרה","substitute_offer.declined":"הצעת החלפה נדחתה","substitute_offer.cancelled":"הצעת החלפה בוטלה","equipment.created":"פריט ציוד נוסף","equipment.updated":"מלאי ציוד עודכן","equipment.deleted":"פריט ציוד נמחק"};
const areas={all:"הכול",equipment:"מלאי וציוד",team:"צוות והחלפות",training:"קבוצות ואימונים"};
const area=a=>a.startsWith("equipment.")?"equipment":a.startsWith("user.")||a.startsWith("substitute_offer.")?"team":"training";
const statuses={pending:"ממתינה",accepted:"אושרה",declined:"נדחתה",cancelled:"בוטלה",expired:"פג תוקף"};
export default function TeamPanel({draftWorkout}){
 const {user}=useStudioSession();
 const isManager=user?.role==="manager";
 const[pin,setPin]=useState(""),[data,setData]=useState(null),[msg,setMsg]=useState(""),[filter,setFilter]=useState("all"),[busy,setBusy]=useState(false),[showInactive,setShowInactive]=useState(false);
 const call=async body=>{
  setBusy(true);setMsg("");
  try{
   const r=await fetch("/api/team",{method:body?"POST":"GET",headers:await studioAdminHeaders(pin),body:body?JSON.stringify(body):undefined,cache:"no-store"}),d=await r.json();
   if(!r.ok){setMsg("⚠️ "+(d.error||"הפעולה נכשלה"));return null;}
   setData(d);setMsg(body?"✓ נשמר":"✓ הצוות נטען");return d;
  }catch{setMsg("⚠️ החיבור נכשל. אפשר לנסות שוב.");return null;}
  finally{setBusy(false);}
 };
 useEffect(()=>{if(isManager)call();},[user?.id,user?.role]);
 const submit=action=>async e=>{e.preventDefault();const form=e.currentTarget;if(await call({action,...Object.fromEntries(new FormData(form))})&&action!=="user_update")form.reset()};
 const users=data?.users||[],sessions=[...(data?.planned_sessions||[]),...(data?.sessions||[])],groups=data?.groups||[],offers=data?.offers||[],audit=data?.audit||[];
 const visibleAudit=useMemo(()=>audit.filter(x=>filter==="all"||area(x.action)===filter),[audit,filter]);
 const group=id=>groups.find(x=>x.id===id)?.name||"קבוצה",instructor=id=>users.find(x=>x.id===id)?.full_name||"מדריכה";
 const session=id=>sessions.find(x=>x.id===id),offerStatus=o=>o.status==="pending"&&new Date(o.expires_at)<new Date()?"expired":o.status;
 const cancelOffer=async offer=>{if(window.confirm("לבטל את הצעת ההחלפה? הקישור יפסיק לאפשר אישור."))await call({action:"cancel_offer",id:offer.id})};
 const removeUser=async user=>{if(window.confirm('להסיר את '+user.full_name+' מהרשימה הפעילה? אפשר לשחזר דרך הצגת משתמשות מושהות.'))await call({action:"user_update",id:user.id,role:user.role,status:"inactive",can_view_health:user.can_view_health})};
 const inviteUser=async user=>{if(window.confirm(`לשלוח הזמנת כניסה אל ${user.email}?`))await call({action:"invite_user",id:user.id})};
 return <section className="panel team-panel">
  <div className="row between"><div><h2>צוות והרשאות</h2><div className="sub">ניהול מי רשום במערכת, מה תפקידה ולמי ניתן להציע אימון להחלפה.</div></div><span className="tag green">ניהול בלבד</span></div>
  <div className="role-map"><div><strong>מנהלת</strong><span>הכול, כולל מידע רגיש וניהול</span></div><div><strong>מדריכה</strong><span>אימונים ששובצה אליהם והתאמות נדרשות</span></div><div><strong>מתאמנת</strong><span>רק תוכנית ותוכן שנשלחו אליה</span></div></div>
  <div className="continuity-login">{!isManager&&<label className="field">PIN מנהל<input type="password" value={pin} onChange={e=>setPin(e.target.value)}/></label>}<button className="btn primary" onClick={()=>call()} disabled={(!pin&&!isManager)||busy}>{data?"רענון צוות והצעות":"פתיחת ניהול"}</button></div>
  {msg&&<div role="status" className={msg.startsWith("✓")?"safe":"notice"}>{msg}</div>}
  {data&&<>
   {isManager&&<ArboxStaffMapping users={users} onSaved={()=>call()}/>}
   <div className="continuity-grid">
    <SubstituteOfferPanel data={data} call={call} busy={busy} draftWorkout={draftWorkout}/>
    <RecruitmentPanel users={users} pin={pin} sessions={data.planned_sessions||[]} onAssigned={()=>call()}/>
    <form className="card" onSubmit={submit("user")}><h3>הוספת משתמשת</h3><label className="field">שם מלא<input name="full_name" required placeholder="שם מלא" autoComplete="name"/></label><label className="field">מייל<input name="email" type="email" placeholder="אימייל" dir="ltr" autoComplete="email"/></label><label className="field">טלפון<input name="phone" type="tel" placeholder="טלפון" dir="ltr" autoComplete="tel"/></label><label className="field">תפקיד<select name="role" defaultValue="instructor"><option value="manager">מנהלת</option><option value="instructor">מדריכה</option><option value="trainee">לקוח/ה</option><option value="operator">מתפעל/ת</option></select></label><button className="btn primary" disabled={busy}>שמירת משתמשת</button></form>
   </div>
   <h3 className="section-title">משתמשות רשומות</h3><label className="permission-check"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/>הצגת משתמשות מושהות ושחזור</label><div className="team-list">{users.filter(u=>showInactive||u.status!=="inactive").map(u=><details className="card user-permission-card" key={u.id}><summary className="row between"><strong>{u.full_name}</strong><span className="tag">{roles[u.role]} · {u.status==="active"?"פעילה":u.status==="invited"?"ממתינה להפעלה":"מושהית"}</span><span className="small">פרטים ועריכה ⌄</span></summary><form onSubmit={submit("user_update")}><input type="hidden" name="id" value={u.id}/><div className="row between"><strong>{u.full_name}</strong><span className={`tag ${u.status==="active"?"green":""}`}>{u.status==="active"?"פעילה":u.status==="invited"?"ממתינה להפעלה":"מושהית"}</span></div><label className="field">שם מלא<input name="full_name" required defaultValue={u.full_name}/></label><label className="field">מייל<input name="email" type="email" defaultValue={u.email||""} readOnly={Boolean(u.auth_user_id)}/></label><label className="field">טלפון<input name="phone" type="tel" dir="ltr" defaultValue={u.phone||""}/></label>{u.role==="manager"&&u.status==="active"&&<div className="small">זמינה גם לשיבוץ כמדריכה</div>}<div className="small">{u.auth_user_id?"כניסה אישית מחוברת":"טרם חוברה כניסה אישית"}</div><label className="field">תפקיד<select name="role" defaultValue={u.role}><option value="manager">מנהלת</option><option value="instructor">מדריכה</option><option value="trainee">לקוח/ה</option><option value="operator">מתפעל/ת</option></select></label><label className="field">מצב<select name="status" defaultValue={u.status}>{u.status==="invited"&&<option value="invited">ממתינה להפעלה</option>}<option value="active">פעילה</option><option value="inactive">מושהית</option></select></label>{["manager","instructor"].includes(u.role)&&<label className="permission-check"><input type="checkbox" name="can_view_health" value="true" defaultChecked={u.can_view_health}/> צפייה בהתאמות בריאותיות נדרשות</label>}<button className="btn">שמירת פרטים והרשאות</button>{u.role==="trainee"&&u.email&&u.status==="active"&&<button className="btn blue" type="button" onClick={()=>inviteUser(u)}>שליחת מייל כניסה</button>}{u.status==="active"&&["manager","instructor","operator"].includes(u.role)&&<StaffAccessShare userId={u.id} name={u.full_name}/>}{u.status!=="inactive"&&<button className="btn" type="button" disabled={busy} onClick={()=>removeUser(u)}>הסרה מהרשימה</button>}</form></details>)}</div>
   {offers.length>0&&<><h3 className="section-title">הצעות אחרונות</h3><div className="offer-list">{offers.slice(0,12).map(o=>{const s=session(o.session_id),state=offerStatus(o),recipient=users.find(u=>u.id===o.instructor_id);return <article className="card offer-row" key={o.id}><div><strong>{group(s?.group_id)} · {s?.title||"אימון"}</strong><div className="small">{s?.starts_at?new Date(s.starts_at).toLocaleString("he-IL"):"מועד לא זמין"} · {instructor(o.instructor_id)}</div><div className="small">תוקף הקישור: {new Date(o.expires_at).toLocaleString("he-IL")} · {o.show_workout?"תוכנית האימון מוצגת":"התוכנית מוסתרת"}</div></div><div className="offer-row-actions"><span className={`tag ${state==="accepted"?"green":""}`}>{statuses[state]||state}</span>{state==="pending"&&<><a className="btn" href={`/substitute/${o.token}`} target="_blank" rel="noreferrer">פתיחת קישור</a><details><summary>שיתוף ההצעה</summary><div className="row"><OfferContactLinks recipient={recipient} shareUrl={new URL(`/substitute/${o.token}`,window.location.origin).href}/></div></details><button className="btn" type="button" disabled={busy} onClick={()=>cancelOffer(o)}>ביטול הצעה</button></>}</div></article>})}</div></>}
   <div className="audit-heading"><div><h3 className="section-title">יומן פעולות</h3><div className="small">תיעוד מנהלי בלבד, ללא מידע רפואי וללא סודות.</div></div><label className="field audit-filter">סינון<select value={filter} onChange={e=>setFilter(e.target.value)}>{Object.entries(areas).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
   <div className="audit-list">{visibleAudit.length===0&&<div className="notice">עדיין אין פעולות להצגה בסינון הזה.</div>}{visibleAudit.map(x=><article className="audit-row" key={x.id}><div><strong>{actionLabels[x.action]||"פעולה במערכת"}</strong>{x.label&&<div className="small">{x.label}</div>}</div><time dateTime={x.created_at}>{new Date(x.created_at).toLocaleString("he-IL")}</time></article>)}</div>
  </>}
 </section>
}
