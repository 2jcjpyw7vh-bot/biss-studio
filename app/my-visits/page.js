"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";
import {useStudioSession} from "../StudioSession";
import {visitDay,visitTime,visitPhase,visitHasWorkout,visitHasDJ} from "../../lib/studio-visits";
import FarmShopCard from "./FarmShopCard";
import StudioSocialLinks from "../StudioSocialLinks";
function VisitCard({visit,preview,onSaved,now}){
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const phase=visitPhase(visit,now),editable=!preview&&visit.status==="confirmed"&&phase!=="past";
 const fitness=visitHasWorkout(visit),dj=visitHasDJ(visit),preferences=visit.preferences||{};
 async function save(event){event.preventDefault();setBusy(true);setMessage("");try{
  const fields=Object.fromEntries(new FormData(event.currentTarget));const client=supabaseBrowser();const {data}=await client.auth.getSession();
  const response=await fetch("/api/my-visits",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data?.session?.access_token||""}`},body:JSON.stringify({id:visit.id,revision:visit.revision,preferences:fields})});
  const result=await response.json();if(!response.ok)throw Error(result.error);onSaved(result.visit);setMessage("ההכנה שלך נשמרה לביקור. אפשר לחזור ולעדכן אותה.");
 }catch(error){setMessage(error.message||"לא ניתן לשמור כרגע");}finally{setBusy(false);}}
 return <article className={`panel visit-card ${phase==="current"?"visit-current":""}`} id={`visit-${visit.id}`}>
  <div className="row between"><div><span className="eyebrow">{phase==="current"?"הביקור שלך מתקיים עכשיו":phase==="upcoming"?"מחכים לך בביסס":phase==="cancelled"?"ההזמנה בוטלה":"הביקור שהיה"}</span><h2>{visit.title}</h2></div><span className="tag">{phase==="cancelled"?"בוטל":phase==="past"?"ביקור קודם":"הזמנה מאושרת"}</span></div>
  <div className="visit-summary"><div><strong>{visitDay.format(new Date(visit.starts_at))}</strong><bdi>{visitTime.format(new Date(visit.starts_at))}–{visitTime.format(new Date(visit.ends_at))}</bdi></div><div><strong>{visit.party_size===1?"ביקור אישי":`${visit.party_size} מבקרים`}</strong><span>משך הביקור · {Math.round((Date.parse(visit.ends_at)-Date.parse(visit.starts_at))/60000)} דקות</span></div></div>
  <h3>מה מחכה לך?</h3><ul className="visit-inclusions">{visit.included_items.map((item,index)=><li key={index}>{item}</li>)}</ul>
  {visit.preparation_status&&<div className={visit.preparation_status==="ready"?"safe":"notice"}><strong>{visit.preparation_status==="ready"?"הפעילות שלך הוכנה ואושרה בידי הצוות":visit.preparation_status==="waiting"?"ההזמנה נקלטה — הצוות מכין את הביקור שלך":"פרטי הביקור בבדיקה — יש לתאם עם הצוות לפני הגעה"}</strong>{visit.operator_name&&<p>האחראי/ת לביקור: {visit.operator_name}</p>}</div>}
  {dj&&phase!=="cancelled"&&<details><summary>הצגה על מסך הסטודיו</summary><p>אם שיקוף מסך כלול בהזמנה, המתפעל יסביר בהגעה כיצד להתחבר למסך. השתמשו ב־AirPlay או Cast בהתאם לטלפון ולציוד במקום. אין כאן חיבור אוטומטי למסך.</p></details>}
  {phase!=="cancelled"&&<><details><summary>הגעה והוראות לביקור</summary><p>{visit.address}</p><div className="row"><a className="btn" href={`https://www.waze.com/ul?q=${encodeURIComponent(visit.address)}&navigate=yes`} target="_blank" rel="noreferrer">ניווט ב־Waze</a><a className="btn" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(visit.address)}`} target="_blank" rel="noreferrer">Google Maps</a></div><p className="visit-lines">{visit.instructions||"הצוות יעדכן כאן הוראות לקראת ההגעה."}</p></details>
   {visit.equipment_notes&&<div className="visit-equipment"><h3>הציוד שנכלל בהזמנה</h3><p className="visit-lines">{visit.equipment_notes}</p></div>}
   {phase!=="past"&&<form key={`${visit.id}:${visit.revision}`} onSubmit={save} className="visit-preparation"><h3>{fitness&&dj?"להכין את האימון ואת הסט שלך":fitness?"להכין את האימון שלך":dj?"להכין את הסט שלך":"להכין את הביקור שלך"}</h3>
    <fieldset disabled={!editable||busy}><div className="filters">
     {fitness&&<><label className="field">כמה דקות תרצה להקדיש לאימון?<input name="workoutMinutes" type="number" min="10" max={Math.min(180,Math.floor((Date.parse(visit.ends_at)-Date.parse(visit.starts_at))/60000))} defaultValue={preferences.workoutMinutes||Math.min(45,Math.floor((Date.parse(visit.ends_at)-Date.parse(visit.starts_at))/60000))} required/></label><label className="field">אזורי גוף מועדפים<input name="bodyAreas" maxLength={240} defaultValue={preferences.bodyAreas||""} placeholder="למשל: פלג גוף עליון או גוף מלא"/></label></>}
     {dj&&<label className="field">בקשות ציוד לקראת הסט<textarea name="equipmentRequests" maxLength={800} defaultValue={preferences.equipmentRequests||""} placeholder="למשל: חיבורים למחשב או סוג הציוד המבוקש"/><span className="small">בקשות נוספות ייבדקו בידי הצוות. הציוד הכלול בפועל מופיע למעלה.</span></label>}
     <label className="field">שם הפלייליסט או הסט<input name="musicTitle" maxLength={120} defaultValue={preferences.musicTitle||""}/></label><label className="field">קישור למוזיקה<input name="musicUrl" type="url" dir="ltr" maxLength={500} defaultValue={preferences.musicUrl||""} placeholder="Spotify / SoundCloud / Mixcloud / YouTube"/></label>
     <label className="field">משהו שנרצה לדעת לקראת הביקור?<textarea name="notes" maxLength={800} defaultValue={preferences.notes||""}/><span className="small">{fitness?"לגבי מגבלה או צורך בהתאמה לאימון, יש לפנות למדריכה לפני ההגעה.":"אפשר לציין בקשות או פרטים שיסייעו לצוות להכין את הביקור."}</span></label>
    </div><button className="btn primary">{busy?"שומר…":"שמירת ההכנה לביקור"}</button></fieldset>
    {preview&&<p className="small">תצוגת מנהל בלבד. ההעדפות נשמרות בכניסה האישית של הלקוח.</p>}
   </form>}
   {preferences.musicUrl&&<a className="btn" href={preferences.musicUrl} target="_blank" rel="noreferrer">פתיחת {preferences.musicTitle||"המוזיקה שלי"}</a>}
   {fitness&&!preview&&phase!=="past"&&<div className="visit-training"><h3>האימון שלך בביסס</h3><p>אפשר לפתוח את התוכנית שאושרה עבורך. שימוש במכשירים מותנה באישור אישי של מדריכה; אישור של אחד המבקרים אינו חל על אחרים.</p><Link className="btn primary" href="/my-program">בחירת אימון מהתוכנית שלי</Link><details><summary>הצגה על מסך הסטודיו</summary><p>בעת ההגעה התחברו לרשת הסטודיו, בחרו ״שיקוף מסך״ או Cast בטלפון ובחרו במסך. לאחר מכן פתחו את האימון או את המוזיקה.</p></details></div>}
  </>}
  {message&&<p role="status" className="safe">{message}</p>}
 </article>;
}
export default function MyVisits(){
 const {user,status}=useStudioSession();const [data,setData]=useState(null),[message,setMessage]=useState(""),[loading,setLoading]=useState(false),[history,setHistory]=useState(false),[attempt,retry]=useState(0),[now,setNow]=useState(new Date());
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(!user)return;const abort=new AbortController();setLoading(true);setMessage("");setData(null);async function load(){const client=supabaseBrowser();const {data:auth}=await client.auth.getSession();const preview=new URLSearchParams(window.location.search).get("preview");const r=await fetch(`/api/my-visits${preview?`?preview=${encodeURIComponent(preview)}`:""}`,{headers:{Authorization:`Bearer ${auth?.session?.access_token||""}`},cache:"no-store",signal:abort.signal});const d=await r.json();if(!r.ok)throw Error(d.error);if(!abort.signal.aborted)setData({...d,owner:user.id});}load().catch(error=>{if(!abort.signal.aborted)setMessage(error.message||"לא ניתן לטעון ביקורים");}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();},[user?.id,attempt]);
 const ready=data?.owner===user?.id?data:null;
 useEffect(()=>{if(!ready)return;const id=new URLSearchParams(window.location.search).get("visit");if(ready.visits.some(visit=>visit.id===id))document.getElementById(`visit-${id}`)?.scrollIntoView({block:"start"});},[ready?.owner]);
 const visits=(ready?.visits||[]).filter(visit=>history?["past","cancelled"].includes(visitPhase(visit,now)):["upcoming","current"].includes(visitPhase(visit,now))).sort((a,b)=>history?Date.parse(b.starts_at)-Date.parse(a.starts_at):Date.parse(a.starts_at)-Date.parse(b.starts_at));
 return <main className="shell visit-workspace"><section className="personal-welcome"><div><div className="eyebrow">BISS · המקום והזמן שלך</div><h1>{ready?`שלום, ${ready.profile.full_name}`:"האזור האישי שלך"}</h1><p className="sub">הביקורים, המוזיקה וכל מה שהזמנת — במקום אחד.</p></div>{user&&<button className="btn" disabled={loading} onClick={()=>retry(n=>n+1)}>רענון ההזמנות</button>}</section>
  {!user&&<section className="panel"><p>{status==="loading"?"בודק כניסה…":"היכנסו כדי לראות את ההזמנות האישיות שלכם."}</p>{status!=="loading"&&<Link className="btn primary" href="/login?next=my-visits">כניסה לאזור האישי</Link>}</section>}
  {loading&&<p role="status">טוען את הביקורים שלך…</p>}{message&&<section className="panel notice" role="status">{message}</section>}
  {ready&&<>{!history&&visits[0]&&<section className="visit-next-summary"><div><span className="eyebrow">הביקור הקרוב שלך</span><h2>{visits[0].title}</h2><p>{visitDay.format(new Date(visits[0].starts_at))} · <bdi>{visitTime.format(new Date(visits[0].starts_at))}–{visitTime.format(new Date(visits[0].ends_at))}</bdi></p></div><a className="btn" href={`#visit-${visits[0].id}`}>לפרטי הביקור וההכנה</a></section>}<FarmShopCard url={ready.shopUrl}/>{ready.preview&&<div className="notice">תצוגה מקדימה של מנהל · <Link href="/visits">חזרה לניהול הביקורים</Link></div>}<nav className="visit-navigation" aria-label="הביקורים שלי"><button className={`btn ${!history?"primary":""}`} aria-pressed={!history} onClick={()=>setHistory(false)}>הביקורים הקרובים</button><button className={`btn ${history?"primary":""}`} aria-pressed={history} onClick={()=>setHistory(true)}>הביקורים הקודמים</button>{!ready.preview&&ready.visits.some(visitHasWorkout)&&<Link className="btn" href="/my-program">תוכניות האימון שלי</Link>}</nav>
   {!visits.length&&<section className="panel visit-empty"><h2>{history?"עוד אין ביקורים קודמים":"אין כרגע ביקור קרוב באזור האישי"}</h2><p>אם כבר הזמנתם בארבוקס והביקור עדיין אינו מופיע, פנו לצוות כדי לבדוק את שיוך ההזמנה לחשבון.</p></section>}
   {visits.map(visit=><VisitCard key={visit.id} visit={visit} preview={ready.preview} now={now} onSaved={updated=>setData(current=>({...current,visits:current.visits.map(row=>row.id===updated.id?{...row,...updated}:row)}))}/>)}</>}
  <StudioSocialLinks/>
 </main>;
}
