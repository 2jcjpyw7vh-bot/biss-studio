"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useStudioSession} from '../StudioSession';
import {studioAdminHeaders} from '../../lib/studio-admin-client';
import {activityKinds,activityStatuses,activityRoleAllowed} from '../../lib/activity-operations';
import {visitDay,visitTime} from '../../lib/studio-visits';
import StaffAccessShare from '../team/StaffAccessShare';

export default function ActivityWorkspace(){
 const {user,status}=useStudioSession();
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const manager=user?.role==='manager';
 async function call(body){
  const id=new URLSearchParams(window.location.search).get('job');
  const response=await fetch(`/api/activity-jobs${!body&&id?`?id=${encodeURIComponent(id)}`:''}`,{method:body?'POST':'GET',headers:await studioAdminHeaders(),body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const result=await response.json();if(!response.ok)throw Error(result.error||'הפעולה לא הושלמה');return result;
 }
 async function load(){setData({...await call(),owner:user.id});}
 async function act(body){if(busy)return;setBusy(true);setMessage('');try{await call(body);await load();setMessage('נשמר בהצלחה.');}catch(error){setMessage(error.message);}finally{setBusy(false);}}
 useEffect(()=>{if(!user)return;let current=true;setData(null);setBusy(true);call().then(result=>{if(current)setData({...result,owner:user.id});}).catch(error=>{if(current)setMessage(error.message);}).finally(()=>{if(current)setBusy(false);});return()=>{current=false;};},[user?.id]);
 const ready=data?.owner===user?.id?data:null;
 const person=id=>ready?.users.find(row=>row.id===id);
 function configure(event,job){
  event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));
  const items=ready.catalog.filter(item=>values[`item:${item.id}`]==='on').map(item=>({id:item.id,quantity:Number(values[`qty:${item.id}`]),required:true}));
  act({action:'configure',id:job.id,revision:job.revision,customerId:values.customerId,assignedId:values.assignedId,partySize:values.partySize,bookingReference:values.bookingReference,receipt:values.receipt,verified:values.verified==='on',mirror:items.some(item=>item.id==='screen-mirror'),notes:values.notes,items});
 }
 function savePlan(event,job){
  event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));
  const picks=job.terms.items.filter(item=>values[`pick:${item.id}`]==='on').map(item=>({id:item.id,quantity:item.quantity}));
  act({action:event.nativeEvent.submitter?.value==='submit'?'submit':'save',id:job.id,revision:job.revision,plan:{picks,arrivalInstructions:values.arrivalInstructions,departureInstructions:values.departureInstructions,clientInstructions:values.clientInstructions}});
 }
 return <main className="shell visit-workspace activity-workspace"><section className="personal-welcome"><div><div className="eyebrow">BISS · הכנת ביקורים ופעילויות</div><h1>{manager?'שיוך ובניית פעילות':'הפעילויות שלי'}</h1><p>מההזמנה בארבוקס, דרך הכנת המקום, ועד הביקור האישי של הלקוח.</p></div><Link className="btn" href={manager?'/my-sessions':'/operations'}>האזור האישי</Link></section>
 {!user&&<section className="panel"><p>{status==='loading'?'בודק כניסה…':'יש להיכנס לחשבון האישי.'}</p><Link className="btn primary" href="/login?next=operations">כניסה</Link></section>}
 {message&&<p role="status" className="notice">{message}</p>}
 {user&&<div className="row"><button className="btn" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{await load();}catch(error){setMessage(error.message);}finally{setBusy(false);}}}>רענון הפעילויות</button><Link className="btn" href="/operations">כל המשימות שלי</Link>{manager&&<Link className="btn" href="/?tab=integrations">חזרה ללוח ארבוקס</Link>}</div>}
 {ready&&!ready.jobs.length&&<section className="panel"><h2>אין כרגע משימות בתצוגה הזו</h2><p>{manager?'פתחו פעילות שעתית מתוך לוח ארבוקס כדי לשייך אחראי ולהכין אותה.':'משימות ששויכו אליך יופיעו כאן.'}</p></section>}
 {ready?.jobs.map(job=><article className="panel activity-job" key={job.id} id={`activity-${job.id}`}>
  <div className="row between"><div><div className="eyebrow">{activityKinds[job.kind]}</div><h2>{job.title}</h2><p>{visitDay.format(new Date(job.starts_at))} · <bdi>{visitTime.format(new Date(job.starts_at))}–{visitTime.format(new Date(job.ends_at))}</bdi></p></div><span className="tag">{activityStatuses[job.status]}</span></div>
  <p className="small">המועד וסוג הפעילות נקבעו לפי היומן. שיבוץ האחראי כאן הוא ב־Studio; שינוי איש הצוות בארבוקס נעשה בנפרד.</p>
  <p><strong>אחראי/ת להכנה: </strong>{person(job.assigned_id)?.full_name||(job.assigned_id?'משויך אליך':'טרם שויך')}</p>
  {manager&&<p><strong>לקוח/ה: </strong>{person(job.customer_id)?.full_name||'טרם נבחר'}</p>}
  {job.customer_preferences&&(job.customer_preferences.equipmentRequests||job.customer_preferences.musicUrl)&&<section className="card"><h3>ההכנה של הלקוח לסט</h3><p className="visit-lines">{job.customer_preferences.equipmentRequests}</p>{job.customer_preferences.musicUrl&&<a className="btn" href={job.customer_preferences.musicUrl} target="_blank" rel="noreferrer">פתיחת {job.customer_preferences.musicTitle||'המוזיקה של הלקוח'}</a>}<p className="small">בקשה נוספת אינה משנה את הציוד הכלול או את התשלום. יש לתאם שינוי עם המנהל.</p></section>}
  {job.status!=='cancelled'&&job.status!=='ready'&&manager&&<details className="card" open={!job.assigned_id}><summary>פרטי ההזמנה ושיוך אחראי</summary><form key={`config:${job.id}:${job.revision}`} onSubmit={event=>configure(event,job)} className="visit-manager-form"><fieldset disabled={busy}><div className="filters">
   <label className="field">לקוח/ה רשום/ה<select name="customerId" defaultValue={job.customer_id||''} required><option value="">בחירת לקוח</option>{ready.users.map(person=><option key={person.id} value={person.id}>{person.full_name} · {person.email}</option>)}</select></label>
   <label className="field">{job.kind==='self_workout'?'מדריכה להכנת אימון':'מתפעל/ת להכנת הפעילות'}<select name="assignedId" defaultValue={job.assigned_id||''} required><option value="">בחירת אחראי</option>{ready.users.filter(person=>activityRoleAllowed(person.role,job.kind)).map(person=><option key={person.id} value={person.id}>{person.full_name} · {person.role==='manager'?'מנהל/ת':person.role==='operator'?'מתפעל/ת':'מדריכה'}</option>)}</select></label>
   <label className="field">אסמכתת הזמנה בארבוקס<input name="bookingReference" required maxLength={120} defaultValue={job.booking_reference||''}/></label><label className="field">אסמכתת בדיקת תשלום<input name="receipt" required maxLength={160} defaultValue={job.receipt||''} placeholder="מספר קבלה או רישום תשלום שנבדק"/></label>
   <label className="field">מספר מבקרים<input name="partySize" type="number" min="1" max="12" required defaultValue={job.party_size}/></label>
  </div><h3>מה כלול בהזמנה?</h3><p className="small">סמנו רק פריטים שנרכשו או הובטחו ללקוח. זו רשימת הכנה; הכמויות אינן אישור מלאי. ציוד כושר והרשאות שימוש בו מנוהלים בתוכנית האישית בנפרד.</p>
   <div className="activity-catalog">{ready.catalog.map(item=><div className="activity-catalog-item" key={item.id}><label className="permission-check"><input type="checkbox" name={`item:${item.id}`} defaultChecked={job.terms.items.some(row=>row.id===item.id)}/>{item.name}</label><label className="field">כמות<input name={`qty:${item.id}`} type="number" min="1" max="100" defaultValue={job.terms.items.find(row=>row.id===item.id)?.quantity||1}/></label></div>)}</div>
   <label className="field">פירוט כלול בהזמנה<textarea name="notes" maxLength={1600} defaultValue={job.terms.notes||''} placeholder="כמויות שתייה, חיבורים ודגשים שנקבעו עם הלקוח"/></label>
   <label className="permission-check"><input name="verified" type="checkbox" required/>בדקתי מול ההזמנה בארבוקס את זהות הלקוח, התשלום והתוספות. אין כאן אימות תשלום אוטומטי.</label><button className="btn primary">שמירת פרטי ההזמנה והשיוך</button><p className="small">שינוי הפרטים מאפס את רשימת ההכנה ודורש הגשה מחדש.</p></fieldset></form></details>}
  {job.assigned_id&&job.status!=='cancelled'&&job.status!=='ready'&&<form key={`plan:${job.id}:${job.revision}`} onSubmit={event=>savePlan(event,job)} className="visit-preparation"><fieldset disabled={busy}><h3>בניית הפעילות והכנת המקום</h3>
   <p>סמנו את הציוד והמתקנים שנבדקו ונמצאים מוכנים לקראת הביקור.</p>
   {job.terms.items.map(item=><label key={item.id} className="permission-check"><input type="checkbox" name={`pick:${item.id}`} defaultChecked={job.plan.picks.some(row=>row.id===item.id)}/>{item.name} × {item.quantity}</label>)}
   <label className="field">הוראות הגעה וקבלת פנים<textarea name="arrivalInstructions" maxLength={1200} defaultValue={job.plan.arrivalInstructions||''} placeholder="מי מקבל את הלקוח, מה להביא ואיך מקבלים הסבר לציוד"/></label>
   <label className="field">הוראות שימוש ללקוח<textarea name="clientInstructions" maxLength={2000} defaultValue={job.plan.clientInstructions||''}/></label>
   <label className="field">הוראות לסיום הביקור<textarea name="departureInstructions" maxLength={1200} defaultValue={job.plan.departureInstructions||''} placeholder="בדיקת ציוד, החזרה ותיאום יציאה"/></label>
   <div className="row"><button className="btn" name="action" value="save">שמירת טיוטה</button><button className="btn primary" name="action" value="submit">הגשת ההכנה לאישור מנהל</button></div></fieldset></form>}
  {job.kind==='self_workout'&&<p className="notice">אפשר לשייך מדריכה ולהכין את הביקור. פרסום אימון אישי מהמשימה יתווסף בהמשך; אין כאן הרשאה לשימוש במכשירים.</p>}
  {manager&&job.assigned_id&&job.status!=='cancelled'&&<section><h3>שליחת המשימה לאחראי/ת</h3><StaffAccessShare userId={job.assigned_id} activityId={job.id} name={person(job.assigned_id)?.full_name}/></section>}
  {manager&&job.visit_id&&job.status!=='ready'&&job.status!=='cancelled'&&<div className="card"><h3>הביקור באזור האישי של הלקוח</h3><p>ההזמנה מופיעה עם הפריטים שאומתו, וההכנה מסומנת כממתינה לאישור.</p><Link className="btn" href={`/my-visits?preview=${job.customer_id}&visit=${job.visit_id}`}>תצוגת הלקוח</Link><StaffAccessShare userId={job.customer_id} visitId={job.visit_id} name={person(job.customer_id)?.full_name}/></div>}
  {manager&&job.status==='submitted'&&job.kind!=='self_workout'&&<form className="card" onSubmit={event=>{event.preventDefault();act({action:'approve',id:job.id,revision:job.revision,availabilityVerified:true});}}><h3>אישור ופתיחת הביקור ללקוח</h3><label className="permission-check"><input type="checkbox" required disabled={busy}/>בדקתי שוב את ההזמנה והתשלום בארבוקס, את זמינות המקום וכל הציוד, ואת הוראות קבלת הפנים והיציאה. כרגע בדיקת המלאי ידנית.</label><button className="btn primary" disabled={busy}>אישור הפעילות והצגתה ללקוח</button></form>}
  {job.status==='ready'&&<div className="safe"><strong>הפעילות מוכנה והביקור מופיע באזור האישי של הלקוח</strong><p className="visit-lines">{job.plan.clientInstructions}</p><p className="visit-lines">הגעה: {job.plan.arrivalInstructions}</p><p className="visit-lines">סיום: {job.plan.departureInstructions}</p>{manager&&<><Link className="btn" href={`/my-visits?preview=${job.customer_id}&visit=${job.visit_id}`}>תצוגת הביקור של הלקוח</Link><StaffAccessShare userId={job.customer_id} visitId={job.visit_id} name={person(job.customer_id)?.full_name}/></>}</div>}
  {manager&&!['cancelled'].includes(job.status)&&<div className="row">{job.status==='ready'&&<button className="btn" disabled={busy} onClick={()=>{if(window.confirm('להחזיר לעריכה? ההזמנה תישאר באזור הלקוח וההכנה תסומן כממתינה לאישור מחדש.'))act({action:'reopen',id:job.id,revision:job.revision});}}>החזרה לעריכה</button>}<button className="btn" disabled={busy} onClick={()=>{if(window.confirm('לבטל את המשימה והביקור ב־Studio? ביטול וחיוב בארבוקס דורשים טיפול נפרד.'))act({action:'cancel',id:job.id,revision:job.revision});}}>ביטול הפעילות ב־Studio</button></div>}
 </article>)}
 </main>;
}
