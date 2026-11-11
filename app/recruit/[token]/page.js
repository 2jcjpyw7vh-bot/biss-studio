"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {recruitmentDate,shekels} from "../../../lib/recruitment";
import RecruitmentPayment from "../../team/RecruitmentPayment";

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
      const fields=Object.fromEntries(new FormData(event.currentTarget));
      const response=await fetch(`/api/recruitment/${token}`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...fields,sessionIds:selected})
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
        {(slot.workout.length>0||slot.playlist)&&<details>
          <summary>תוכנית האימון</summary>
          {slot.workout.length>0&&<ul>{slot.workout.map((item,index)=><li key={index}>{item.name} · {item.prescription}</li>)}</ul>}
          {slot.playlist&&<a className="btn" href={slot.playlist} target="_blank" rel="noreferrer">פתיחת הפלייליסט</a>}
        </details>}
      </article>)}
      <RecruitmentPayment terms={terms} ids={selected}/>
      {!saved&&<form onSubmit={submit} className="save-workout-panel">
        <h2>הגשת מועמדות</h2>
        <div className="filters">
          <label className="field">שם מלא<input name="name" autoComplete="name" maxLength={100} required/></label>
          <label className="field">מייל<input name="email" type="email" autoComplete="email" maxLength={180} required/></label>
          <label className="field">טלפון<input name="phone" type="tel" autoComplete="tel" maxLength={35}/></label>
          <label className="field">הסמכות<textarea name="qualifications" maxLength={800} required={Boolean(terms.certifications)}/></label>
          <label className="field">ניסיון מקצועי<textarea name="experience" maxLength={600} required={Boolean(terms.experience)}/></label>
          <label className="field">הערות<textarea name="note" maxLength={900}/></label>
          <input name="website" hidden autoComplete="off" tabIndex={-1}/>
        </div>
        <p className="small">פרטי המועמדות יועברו לצוות Studio לצורך בחינת השיבוץ.</p>
        <button className="btn primary" disabled={busy||!selected.length}>{busy?"שולח…":"שליחת מועמדות"}</button>
      </form>}
    </>}
    {message&&<p role="status" className={saved?"safe":"notice"}>{message}</p>}
  </section></main>;
}
