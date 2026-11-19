"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useStudioSession} from "../StudioSession";
import {studioAdminHeaders} from "../../lib/studio-admin-client";
import {visitAddress,visitKinds,visitDay,visitTime} from "../../lib/studio-visits";
import StaffAccessShare from "../team/StaffAccessShare";
export default function VisitManagement(){
 const {user,status}=useStudioSession();const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[creation,setCreation]=useState(null);
 async function call(body){const response=await fetch("/api/visits",{method:body?"POST":"GET",headers:await studioAdminHeaders(),body:body?JSON.stringify(body):undefined,cache:"no-store"});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
 async function run(task){setBusy(true);setMessage("");try{await task();}catch(error){setMessage(error.message||"הפעולה לא הושלמה");}finally{setBusy(false);}}
 async function load(){setData(await call());}
 useEffect(()=>{if(user?.role==="manager")run(load);},[user?.id]);
 async function create(event){event.preventDefault();const form=event.currentTarget,fields=Object.fromEntries(new FormData(form)),signature=JSON.stringify(fields),id=creation?.signature===signature?creation.id:crypto.randomUUID();setCreation({signature,id});await run(async()=>{await call({action:"create",id,...fields,confirmed:fields.confirmed==="on"});await load();form.reset();setCreation(null);setMessage("הביקור נשמר. אפשר לבדוק את האזור האישי ולשלוח ללקוח כניסה.");});}
 const person=id=>data?.customers.find(customer=>customer.id===id);
 return <main className="shell visit-workspace"><section className="personal-welcome"><div><div className="eyebrow">BISS STUDIO · ניהול</div><h1>ביקורים וחוויות בביסס</h1><p className="sub">אימון, זמן ל־DJ או ביקור משולב — הזמנה אישית אחת.</p></div><Link className="btn" href="/my-sessions">האזור האישי של המנהל</Link></section>
  {!user&&<section className="panel">{status==="loading"?"בודק כניסה…":<Link className="btn primary" href="/login">כניסת מנהל</Link>}</section>}
  {user&&user.role!=="manager"&&<p className="notice">ניהול ביקורים זמין למנהלים בלבד.</p>}
  {user?.role==="manager"&&<><section className="panel notice"><strong>שלב הפיילוט</strong><p>כרגע מאשרים ביקור לאחר בדיקה ידנית של ההזמנה, התשלום ופניות הסטודיו בארבוקס. עדיין אין קליטה אוטומטית של רכישות או ביטולים. לאחר שינוי בארבוקס יש לעדכן גם כאן.</p></section>
   {data&&<><details className="panel"><summary>קישור לחנות המשק בארבוקס</summary><form className="visit-manager-form" onSubmit={event=>{event.preventDefault();const url=new FormData(event.currentTarget).get("url");run(async()=>{await call({action:"shop_settings",url});await load();setMessage("קישור חנות המשק נשמר ויופיע באזור האישי של הלקוחות.");});}}><label className="field">קישור החנות הציבורי ללקוחות<input name="url" type="url" required maxLength={1000} dir="ltr" defaultValue={data.shopUrl||""}/></label><p className="small">הקישור מופיע באופן בולט באזור האישי בכל סוגי הביקורים. אין להדביק כתובת של מסך הניהול בארבוקס.</p><button className="btn primary" disabled={busy}>שמירת קישור החנות</button></form></details><details className="panel"><summary>הכנת ביקור מאושר ללקוח</summary><form onSubmit={create} className="visit-manager-form"><div className="filters">
    <label className="field">לקוח רשום<select name="customerId" required><option value="">בחירת לקוח</option>{data.customers.map(customer=><option key={customer.id} value={customer.id}>{customer.full_name} · {customer.email}</option>)}</select><Link href="/?tab=team">הוספת לקוח בצוות והרשאות</Link></label>
    <label className="field">שם ההזמנה<input name="title" maxLength={180} required placeholder="למשל: זמן לסט DJ או אימון ובילוי"/></label>
    <label className="field">סוג הביקור<select name="kind">{Object.entries(visitKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label className="field">אסמכתת הזמנה בארבוקס<input name="arboxBookingId" maxLength={120} required/></label>
    <label className="field">תחילת הביקור (שעון ישראל)<input name="startsAt" type="datetime-local" required/></label><label className="field">סיום הביקור (שעון ישראל)<input name="endsAt" type="datetime-local" required/></label>
    <label className="field">מספר מבקרים<input name="partySize" type="number" min="1" max="12" defaultValue="1" required/></label>
    <label className="field">כתובת<input name="address" defaultValue={visitAddress} maxLength={220} required/></label>
    <label className="field">מה כלול בהזמנה — פריט וכמות בכל שורה<textarea name="included" required maxLength={3600} placeholder="כתבו רק את מה שנרכש ואושר, כולל כמויות מדויקות"/></label>
    <label className="field">ציוד שכלול ומוכן ללקוח<textarea name="equipmentNotes" maxLength={2000} placeholder="למשל: דגמי ציוד DJ וחיבורים זמינים. שימוש במכשירי כושר דורש אישור אישי נפרד."/></label>
    <label className="field">הוראות הגעה ושימוש<textarea name="instructions" maxLength={3000}/></label>
   </div><label className="permission-check"><input name="confirmed" type="checkbox" required/>בדקתי בארבוקס שההזמנה והתשלום מאושרים ושהסטודיו פנוי בשעות אלה.</label><button className="btn primary" disabled={busy||!data.customers.length}>שמירת הביקור ללקוח</button></form></details>
    <div className="row between"><h2>הביקורים שנקלטו</h2><button className="btn" disabled={busy} onClick={()=>run(load)}>רענון ביקורים</button></div>
    {!data.visits.length&&<p className="panel">עדיין לא נקלטו ביקורים. אפשר להתחיל בהזמנת פיילוט מאומתת.</p>}
    {data.visits.map(visit=><article className="panel visit-card" key={visit.id}><div className="row between"><div><h3>{visit.title}</h3><p>{person(visit.customer_id)?.full_name||"לקוח"} · {visitDay.format(new Date(visit.starts_at))} · <bdi>{visitTime.format(new Date(visit.starts_at))}–{visitTime.format(new Date(visit.ends_at))}</bdi></p></div><span className="tag">{visit.status==="cancelled"?"בוטל":"מאושר"}</span></div><p className="small">אסמכתת ארבוקס: <bdi>{visit.arbox_booking_id}</bdi> · אומת ידנית בידי מנהל</p><ul>{visit.included_items.map((item,index)=><li key={index}>{item}</li>)}</ul>
     <div className="row"><Link className="btn" href={`/my-visits?preview=${visit.customer_id}`}>תצוגת האזור האישי של הלקוח</Link>{visit.status==="confirmed"&&Date.parse(visit.ends_at)>Date.now()&&<button className="btn" disabled={busy} onClick={()=>{if(window.confirm("לבטל את הביקור ב־Studio? יש לעדכן את ההזמנה והחיוב בארבוקס בנפרד."))run(async()=>{await call({action:"cancel",id:visit.id,revision:visit.revision});await load();});}}>סימון ביקור כמבוטל</button>}</div>
     {visit.status==="confirmed"&&Date.parse(visit.ends_at)>Date.now()&&person(visit.customer_id)&&<><p className="small">יעד ההזמנה: <bdi>{person(visit.customer_id).phone||"חסר טלפון"}</bdi> · <bdi>{person(visit.customer_id).email}</bdi></p><StaffAccessShare userId={visit.customer_id} visitId={visit.id} name={person(visit.customer_id).full_name}/></>}
     {!!Object.keys(visit.preferences||{}).length&&<details><summary>ההכנה והבקשות של הלקוח</summary><p>{visit.preferences.workoutMinutes&&`${visit.preferences.workoutMinutes} דקות לאימון · `}{visit.preferences.bodyAreas}</p><p className="visit-lines">{visit.preferences.equipmentRequests}</p><p className="visit-lines">{visit.preferences.notes}</p>{visit.preferences.musicUrl&&<a className="btn" href={visit.preferences.musicUrl} target="_blank" rel="noreferrer">המוזיקה של הלקוח</a>}</details>}
    </article>)}</>}
   {message&&<p role="status" className="notice">{message}</p>}
  </>}
 </main>;
}
