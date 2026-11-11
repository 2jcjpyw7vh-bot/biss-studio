"use client";
import StudioSocialLinks from "../../StudioSocialLinks";
import {certificateMaxBytes} from "../../../lib/recruitment-certificate";
import {Fragment,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {recruitmentDate,shekels} from "../../../lib/recruitment";
import RecruitmentPayment from "../../team/RecruitmentPayment";
import StationRotation from "../../StationRotation";
import WorkoutTiming from "../../WorkoutTiming";
import {sharedWorkoutPlan,trioStationLabel} from "../../../lib/workout-structure";

function PublishedWorkout({slot}) {
  const workout=slot.workoutPlan;
  const plan=workout?sharedWorkoutPlan(workout):null;
  if(!plan&&!slot.workout.length&&!slot.playlist)return null;

  return <details>
    <summary>תוכנית האימון</summary>
    {plan&&<>
      {plan.duration&&<p><strong>{plan.duration} דקות</strong></p>}
      <WorkoutTiming workout={workout}/>
      <StationRotation workout={workout}/>
      {!!workout.warm.length&&<p className="small">{workout.warm.join(" · ")}</p>}
      {plan.exercises.map((item,index)=>{
        const section=plan.sections.find(section=>section.start===index);
        const allocation=workout.stationRotation?.length?item.allocation:trioStationLabel(item);
        return <Fragment key={index}>
          {section&&<div className="section-title"><div>
            <strong>{section.title}</strong><p className="small">{section.detail}</p>
          </div></div>}
          <div className="workout-item">
            <strong>{index+1}. {item.he}</strong>
            <div>{item.prescription}</div>
            {allocation&&<div className="small">{allocation}</div>}
          </div>
        </Fragment>;
      })}
      {!!workout.cool.length&&<p className="small">{workout.cool.join(" · ")}</p>}
    </>}
    {!plan&&!!slot.workout.length&&<ul>{slot.workout.map((item,index)=><li key={index}>{item.name} · {item.prescription}</li>)}</ul>}
    {slot.playlist&&<a className="btn" href={slot.playlist} target="_blank" rel="noreferrer">פתיחת הפלייליסט</a>}
  </details>;
}

export default function RecruitmentPage() {
  const {token}=useParams();
  const [terms,setTerms]=useState(null);
  const [selected,setSelected]=useState([]);
  const [message,setMessage]=useState("טוען את הצעת ההחלפה…");
  const [saved,setSaved]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const abort=new AbortController();
    async function load() {
      const response=await fetch(`/api/recruitment/${token}`,{cache:"no-store",signal:abort.signal});
      const data=await response.json();
      if(!response.ok)throw Error(data.error);
      setTerms(data.publication);
      if(data.publication.slots.length===1)setSelected([data.publication.slots[0].id]);
      setMessage("");
    }
    load().catch(error=>{if(!abort.signal.aborted)setMessage(error.message||"לא ניתן לפתוח את ההצעה.");});
    return()=>abort.abort();
  },[token]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const fields=new FormData(event.currentTarget);
      const certificate=fields.get("certificate");
      if(certificate?.size>certificateMaxBytes)throw Error("אפשר לצרף תעודה בגודל של עד 3 MB.");
      fields.set("sessionIds",JSON.stringify(selected));
      const response=await fetch(`/api/recruitment/${token}`,{
        method:"POST",body:fields
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.error);
      setSaved(true);
      setMessage("המועמדות התקבלה. השיבוץ נקבע לאחר אישור הסטודיו.");
    } catch(error) {
      setMessage(error instanceof TypeError?"החיבור נקטע. אפשר לנסות שוב.":error.message);
    } finally {setBusy(false);}
  }

  return <main className="shell substitute-page"><section className="panel">
    <div className="eyebrow">BISS STUDIO · גיוס מחליפה</div>
    <h1>{terms?.title||"הצעת החלפה"}</h1>
    {terms&&<>
      <div><strong>כתובת הסטודיו</strong><p>{terms.address}</p>
        <div className="row">
          <a className="btn" target="_blank" rel="noreferrer" href={`https://www.waze.com/ul?q=${encodeURIComponent(terms.address)}&navigate=yes`}>פתיחה ב־Waze</a>
          <a className="btn" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(terms.address)}`}>פתיחה ב־Google Maps</a>
        </div>
      </div>
      {terms.certifications&&<div><strong>הסמכות נדרשות</strong><p style={{whiteSpace:"pre-wrap"}}>{terms.certifications}</p></div>}
      {terms.experience&&<div><strong>ניסיון נדרש</strong><p style={{whiteSpace:"pre-wrap"}}>{terms.experience}</p></div>}
      {terms.notes&&<div><strong>הערות כלליות</strong><p style={{whiteSpace:"pre-wrap"}}>{terms.notes}</p></div>}
      <p>החזר נסיעות להגעה אחת · אימון אחד {shekels(terms.travelSingle)} · כמה אימונים {shekels(terms.travelMultiple)}</p>
      {terms.slots.map(slot=><article className="card" key={slot.id}>
        <label className="permission-check">
          <input type="checkbox" checked={selected.includes(slot.id)} disabled={saved||busy} onChange={e=>setSelected(values=>e.target.checked?[...values,slot.id]:values.filter(id=>id!==slot.id))}/>
          <span><strong>{slot.title}</strong> · {recruitmentDate.format(new Date(slot.startsAt))} · {shekels(slot.pay)}</span>
        </label>
        <p className="small">הגעה {slot.visit}</p>
        <PublishedWorkout slot={slot}/>
      </article>)}
      <RecruitmentPayment terms={terms} ids={selected}/>
      {!saved&&<form onSubmit={submit} className="save-workout-panel">
        <h2>הגשת מועמדות</h2>
        <div className="filters">
          <label className="field">שם מלא<input name="name" autoComplete="name" maxLength={100} required/></label>
          <label className="field">מייל<input name="email" type="email" autoComplete="email" maxLength={180} required/></label>
          <label className="field">טלפון<input name="phone" type="tel" autoComplete="tel" maxLength={35}/></label>
          <label className="field">סוג ההסמכה שלך<textarea name="qualifications" maxLength={800} required/></label>
          <label className="field">צירוף תעודת הסמכה (אופציונלי)<input name="certificate" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"/><span className="small">PDF, JPG או PNG עד 3 MB</span></label>
          <label className="field">ניסיון מקצועי<textarea name="experience" maxLength={600} required={Boolean(terms.experience)}/></label>
          <label className="field">הערות<textarea name="note" maxLength={900}/></label>
          <input name="website" hidden autoComplete="off" tabIndex={-1}/>
        </div>
        <label className="permission-check">
          <input type="checkbox" name="professionalInsurance" value="yes" required/>
          אני מאשרת שיש לי ביטוח אחריות מקצועית בתוקף המכסה את פעילותי כמדריכה.
        </label>
        <p className="small">פרטי המועמדות יועברו לצוות Studio לצורך בחינת השיבוץ.</p>
        <button className="btn primary" disabled={busy||!selected.length}>{busy?"שולח…":"שליחת מועמדות"}</button>
      </form>}
    </>}
    {message&&<p role="status" className={saved?"safe":"notice"}>{message}</p>}
  </section><StudioSocialLinks/></main>;
}
