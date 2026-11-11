"use client";

import {studioShareMessage} from "../../lib/studio-share-message";
import {useState} from "react";
import {recruitmentDate} from "../../lib/recruitment";
import RecruitmentPayment from "./RecruitmentPayment";

const money={type:"number",min:0,max:999999.99,step:"0.01"};

function Applicant({person,terms,taken,open,busy,onApprove}) {
  const [selected,setSelected]=useState([]);
  const approved=person.approved_ids;
  const candidates=terms.slots.filter(slot=>person.requested_ids.includes(slot.id));
  return <article className="card">
    <h4>{person.name}</h4>
    <p dir="ltr" style={{textAlign:"right"}}>{person.email}{person.phone&&` · ${person.phone}`}</p>
    {person.qualifications&&<p>הסמכות · {person.qualifications}</p>}
    {person.experience&&<p>ניסיון · {person.experience}</p>}
    {person.note&&<p>הערות · {person.note}</p>}
    {candidates.map(slot=>{
      const accepted=approved.includes(slot.id);
      const unavailable=taken.has(slot.id)&&!accepted;
      return <label className="permission-check" key={slot.id}>
        <input type="checkbox" checked={accepted||(!unavailable&&selected.includes(slot.id))} disabled={!open||busy||accepted||unavailable}
          onChange={e=>setSelected(ids=>e.target.checked?[...ids,slot.id]:ids.filter(id=>id!==slot.id))}/>
        <span>{slot.title} · {recruitmentDate.format(new Date(slot.startsAt))}{accepted?" · אושר":unavailable?" · שובץ":""}</span>
      </label>;
    })}
    {approved.length>0&&<><strong>סכום למועדים שאושרו</strong><RecruitmentPayment terms={terms} ids={approved}/></>}
    {open&&selected.some(id=>!taken.has(id))&&<>
      <strong>סכום אחרי אישור הבחירה</strong>
      <RecruitmentPayment terms={terms} ids={[...approved,...selected.filter(id=>!taken.has(id))]}/>
      <button className="btn primary" type="button" disabled={busy} onClick={async()=>{
        if(await onApprove(person.id,selected.filter(id=>!taken.has(id))))setSelected([]);
      }}>אישור שיבוץ למועדים שנבחרו</button>
    </>}
  </article>;
}

export default function RecruitmentPanel({pin,sessions,onAssigned}) {
  const [open,setOpen]=useState(false);
  const [posts,setPosts]=useState([]);
  const [detail,setDetail]=useState(null);
  const [selected,setSelected]=useState([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [creation,setCreation]=useState(null);

  async function request(path="",body) {
    const response=await fetch(`/api/recruitment${path}`,{
      method:body?"POST":"GET",headers:{"Content-Type":"application/json","x-admin-pin":pin},
      body:body?JSON.stringify(body):undefined,cache:"no-store"
    });
    const result=await response.json();
    if(!response.ok)throw Error(result.error);
    return result;
  }

  async function run(task) {
    setBusy(true);
    setMessage("");
    try {await task();return true;}
    catch(error){setMessage(error instanceof TypeError?"החיבור נקטע. אפשר לנסות שוב.":error.message);return false;}
    finally {setBusy(false);}
  }
  async function list(){setPosts((await request()).posts);}
  async function load(id){setDetail(await request(`?id=${encodeURIComponent(id)}`));}

  async function publish(event) {
    event.preventDefault();
    const form=event.currentTarget;
    const fields=Object.fromEntries(new FormData(form));
    const terms={
      title:fields.title,address:fields.address,travelSingle:fields.travelSingle,travelMultiple:fields.travelMultiple,
      certifications:fields.certifications,experience:fields.experience,notes:fields.notes,showWorkout:fields.showWorkout==="on",
      slots:selected.map(id=>({id,pay:fields[`pay-${id}`]||fields.defaultPay,visit:fields[`visit-${id}`]}))
    };
    const signature=JSON.stringify(terms);
    const id=creation?.signature===signature?creation.id:crypto.randomUUID();
    setCreation({id,signature});
    await run(async()=>{
      const {post}=await request("",{action:"create",id,...terms});
      await load(post.id);
      setCreation(null);
      form.reset();
      setSelected([]);
      setMessage("הקישור מוכן לפרסום.");
      await list();
    });
  }

  const post=detail?.post;
  const taken=new Set(detail?.applications.flatMap(person=>person.approved_ids));
  const link=post?new URL(`/recruit/${post.token}`,window.location.origin).href:"";
  return <section className="card">
    <div className="row between">
      <h3>גיוס מחליפה בקישור פתוח</h3>
      <button className="btn" disabled={busy} onClick={()=>{setOpen(!open);if(!open)run(list);}}>{open?"סגירה":"פתיחת גיוס"}</button>
    </div>
    {open&&<>
      <p className="small">אפשר לפרסם בקבוצת WhatsApp או Facebook. מדריכות יכולות להגיש מועמדות בלי חשבון Studio.</p>
      <details>
        <summary>יצירת קישור חדש</summary>
        {sessions.length===0?<p>תחילה יש לתכנן אימון עתידי במסך ההחלפה.</p>:<form className="save-workout-panel" onSubmit={publish}>
          <div className="filters">
            <label className="field">כותרת וסוג האימון<input name="title" required maxLength={120}/></label>
            <label className="field">כתובת מלאה לניווט<input name="address" required maxLength={220}/></label>
            <label className="field">תשלום ברירת מחדל לאימון (₪)<input name="defaultPay" {...money} required/></label>
            <label className="field">נסיעות להגעה לאימון אחד (₪)<input name="travelSingle" {...money} required/></label>
            <label className="field">נסיעות להגעה לכמה אימונים (₪)<input name="travelMultiple" {...money} required/></label>
          </div>
          <p className="small">בחרי עד 20 מועדים. למועדים שמתקיימים באותה הגעה הזיני אותו מספר הגעה.</p>
          {sessions.map((session,index)=>{
            const checked=selected.includes(session.id);
            return <div key={session.id} className="card">
              <label className="permission-check"><input type="checkbox" checked={checked} disabled={busy||(!checked&&selected.length>=20)}
                onChange={e=>setSelected(ids=>e.target.checked?[...ids,session.id]:ids.filter(id=>id!==session.id))}/>
                {session.title} · {recruitmentDate.format(new Date(session.starts_at))}
              </label>
              {checked&&<div className="filters">
                <label className="field">תשלום אחר למועד (₪)<input name={`pay-${session.id}`} {...money}/></label>
                <label className="field">מספר הגעה<input name={`visit-${session.id}`} type="number" min="1" max="100" defaultValue={index+1} required/></label>
              </div>}
            </div>;
          })}
          <div className="filters">
            <label className="field">הסמכות נדרשות לפי סוג האימון<textarea name="certifications" maxLength={1000}/></label>
            <label className="field">וותק וניסיון נדרשים<textarea name="experience" maxLength={600}/></label>
            <label className="field">הערות כלליות לפרסום<textarea name="notes" maxLength={1600}/></label>
          </div>
          <label className="permission-check"><input type="checkbox" name="showWorkout"/> הצגת תרגילים ופלייליסט בקישור</label>
          <p className="small">הכותרת, הכתובת, הדרישות וההערות יופיעו בקישור. השאירי פרטים אישיים ומידע רפואי מחוץ לפרסום.</p>
          <button className="btn primary" disabled={busy||!selected.length}>יצירת קישור לפרסום</button>
        </form>}
      </details>
      <div className="row">
        <label className="field">פרסומים אחרונים<select value={post?.id||""} disabled={busy} onChange={e=>{if(e.target.value)run(()=>load(e.target.value));else setDetail(null);}}>
          <option value="">בחירת פרסום</option>
          {posts.map(item=><option key={item.id} value={item.id}>{item.title} · {item.status==="open"?"פתוח":"סגור"}</option>)}
        </select></label>
        {post&&<button className="btn" disabled={busy} onClick={()=>run(()=>load(post.id))}>רענון מועמדויות</button>}
      </div>
      {post&&<section className="save-workout-panel">
        <h4>{post.terms.title}</h4>
        {post.status==="open"&&<>
          <label className="field">קישור לפרסום<input value={link} dir="ltr" readOnly onFocus={e=>e.target.select()}/></label>
          <div className="row">
            <a className="btn" href={link} target="_blank" rel="noreferrer">פתיחת הקישור</a>
            <a className="btn green" href={`https://wa.me/?text=${encodeURIComponent(studioShareMessage("recruitment",post.terms.title,link))}`} target="_blank" rel="noreferrer">שיתוף ב־WhatsApp</a>
            <button className="btn" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(studioShareMessage("recruitment",post.terms.title,link));setMessage("ההודעה הועתקה.");}catch{setMessage("לא ניתן להעתיק את ההודעה.");}}}>העתקת הודעה</button>
            <button className="btn" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage("הקישור הועתק.");}catch{setMessage("אפשר להעתיק את הקישור מהשדה.");}}}>העתקת קישור</button>
            <button className="btn" disabled={busy} onClick={()=>run(async()=>{await request("",{action:"close",id:post.id});await load(post.id);await list();})}>סגירת הפרסום</button>
          </div>
        </>}
        {post.status!=="open"&&<p>הפרסום סגור להגשת מועמדות.</p>}
        <h3>מועמדויות</h3>
        {!detail.applications.length&&<p>עדיין אין מועמדויות.</p>}
        {detail.applications.map(person=><Applicant key={person.id} person={person} terms={post.terms} taken={taken} open={post.status==="open"} busy={busy}
          onApprove={(id,sessionIds)=>run(async()=>{await request("",{action:"approve",id,sessionIds});await load(post.id);setMessage("השיבוץ אושר ונשמר.");onAssigned?.();})}/>)}
      </section>}
      {message&&<p role="status" className="notice">{message}</p>}
    </>}
  </section>;
}
