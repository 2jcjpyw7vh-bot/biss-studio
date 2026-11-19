"use client";
import {studioAdminHeaders} from "../../lib/studio-admin-client";

import {studioShareMessage} from "../../lib/studio-share-message";
import {useEffect,useState} from "react";
import {recruitmentApprovalError,recruitmentDocumentError,recruitmentAd,recruitmentDate} from "../../lib/recruitment";
import RecruitmentPayment from "./RecruitmentPayment";

const money={type:"number",min:0,max:999999.99,step:"0.01"};

function Applicant({person,terms,taken,open,busy,onApprove,onCertificate,onReview}) {
  const [selected,setSelected]=useState([]);
  const approved=person.approved_ids;
  const candidates=terms.slots.filter(slot=>person.requested_ids.includes(slot.id));
  const approvalError=recruitmentApprovalError(person,terms,selected.length?selected:person.requested_ids);
  return <article className="card">
    <h4>{person.name}</h4>
    <p dir="ltr" style={{textAlign:"right"}}>{person.email}{person.phone&&` · ${person.phone}`}</p>
    <p>סוג הסמכה · {person.qualifications||"טרם נמסר"}</p>
    <p>ביטוח אחריות מקצועית · {person.professional_insurance?"המועמדת הצהירה על ביטוח בתוקף":"טרם התקבלה הצהרה"}</p>
    {person.certificate_mime&&<button className="btn" type="button" disabled={busy} onClick={()=>onCertificate(person.id)}>הורדת תעודת הסמכה</button>}
    {person.insurance_mime&&<button className="btn" type="button" disabled={busy} onClick={()=>onCertificate(person.id,"insurance")}>הורדת מסמך ביטוח</button>}
    {person.insurance_valid_until&&<p>ביטוח בתוקף עד · <bdi>{person.insurance_valid_until}</bdi></p>}
    {terms.documentPolicy===1&&<p>{person.documents_reviewed_at?"המסמכים נבדקו ואושרו על ידי מנהל":"מסמכים ממתינים לבדיקת מנהל"}</p>}
    {terms.documentPolicy===1&&!person.documents_reviewed_at&&!recruitmentDocumentError(person,terms)&&<button className="btn" type="button" disabled={busy} onClick={()=>{if(window.confirm("בדקתי את הביטוח, תוקפו וההסמכה והתאמתם לאימון. לאשר את בדיקת המסמכים?"))onReview(person.id);}}>אישור בדיקת מסמכים</button>}
    {person.experience&&<p>ניסיון · {person.experience}</p>}
    {person.note&&<p>הערות · {person.note}</p>}
    {open&&approvalError&&candidates.some(slot=>!approved.includes(slot.id)&&!taken.has(slot.id))&&
      <p className="notice">השיבוץ ממתין להשלמת פרטי המועמדות. {approvalError}</p>}
    {candidates.map(slot=>{
      const accepted=approved.includes(slot.id);
      const unavailable=taken.has(slot.id)&&!accepted;
      return <label className="permission-check" key={slot.id}>
        <input type="checkbox" checked={accepted||(!unavailable&&selected.includes(slot.id))} disabled={!open||busy||accepted||unavailable||Boolean(approvalError)}
          onChange={e=>setSelected(ids=>e.target.checked?[...ids,slot.id]:ids.filter(id=>id!==slot.id))}/>
        <span>{slot.title} · {recruitmentDate.format(new Date(slot.startsAt))}{accepted?" · אושר":unavailable?" · שובץ":""}</span>
      </label>;
    })}
    {approved.length>0&&<><strong>סכום למועדים שאושרו</strong><RecruitmentPayment terms={terms} ids={approved}/></>}
    {open&&!approvalError&&selected.some(id=>!taken.has(id))&&<>
      <strong>סכום אחרי אישור הבחירה</strong>
      <RecruitmentPayment terms={terms} ids={[...approved,...selected.filter(id=>!taken.has(id))]}/>
      <button className="btn primary" type="button" disabled={busy} onClick={async()=>{
        if(await onApprove(person.id,selected.filter(id=>!taken.has(id))))setSelected([]);
      }}>אישור שיבוץ למועדים שנבחרו</button>
    </>}
  </article>;
}

export default function RecruitmentPanel({pin,sessions,onAssigned,users=[],initialSessionId="",embedded=false}) {
  const [open,setOpen]=useState(embedded);
  const [posts,setPosts]=useState([]);
  const [detail,setDetail]=useState(null);
  const [selected,setSelected]=useState(initialSessionId?[initialSessionId]:[]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [creation,setCreation]=useState(null);
  const [recipients,setRecipients]=useState([]);
  const [image,setImage]=useState(null);
  const eligible=users.filter(user=>user.status==="active"&&["manager","instructor"].includes(user.role));
  useEffect(()=>{if(embedded)run(list);},[]);

  async function request(path="",body) {
    const response=await fetch(`/api/recruitment${path}`,{
      method:body?"POST":"GET",headers:await studioAdminHeaders(pin),
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
  async function downloadCertificate(id,kind="certificate"){
    const response=await fetch(`/api/recruitment?${kind}=${encodeURIComponent(id)}`,{headers:await studioAdminHeaders(pin),cache:"no-store"});
    if(!response.ok)throw Error("לא ניתן להוריד את תעודת ההסמכה.");
    const file=await response.blob();
    const url=URL.createObjectURL(file);
    const link=document.createElement("a");
    link.href=url;
    link.download=response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]||"studio-certificate";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function publish(event) {
    event.preventDefault();
    const form=event.currentTarget;
    const fields=Object.fromEntries(new FormData(form));
    const terms={
      image,title:fields.title,address:fields.address,travelSingle:fields.travelSingle,travelMultiple:fields.travelMultiple,
      certifications:fields.certifications,experience:fields.experience,notes:fields.notes,showWorkout:fields.showWorkout==="on",recurring:fields.recurring,destinations:fields.destinations,
      requireInsurance:fields.requireInsurance==="on",requireCertificate:fields.requireCertificate==="on",recipientIds:recipients,
      slots:selected.map(id=>({id,pay:fields[`pay-${id}`]||fields.defaultPay,visit:fields[`visit-${id}`]}))
    };
    const signature=JSON.stringify(terms);
    const id=creation?.signature===signature?creation.id:crypto.randomUUID();
    setCreation({id,signature});
    await run(async()=>{
      const {post}=await request("",{action:"create",id,...terms});
      await load(post.id);
      setCreation(null);
      setImage(null);
      form.reset();
      setSelected([]);
      setMessage("הטיוטה נשמרה. יש לעבור על התוכן ולאשר לפני שיתוף.");
      await list();
    });
  }

  const post=detail?.post;
  const taken=new Set(detail?.applications.flatMap(person=>person.approved_ids));
  const link=post?new URL(`/recruit/${post.token}`,window.location.origin).href:"";
  return <section className="card recruitment-panel">
    <div className="row between">
      <h3>גיוס מדריכה והחלפות</h3>
      <button className="btn" disabled={busy} onClick={()=>{setOpen(!open);if(!open)run(list);}}>{open?"סגירה":"פתיחת גיוס"}</button>
    </div>
    {open&&<>
      <p className="small">אפשר לפרסם בקבוצת WhatsApp או Facebook. מדריכות יכולות להגיש מועמדות בלי חשבון Studio.</p>
      <details open={embedded||undefined}>
        <summary>הכנת מודעה או פנייה למדריכות</summary>
        {sessions.length===0?<p>תחילה יש לתכנן אימון עתידי במסך ההחלפה.</p>:<form className="save-workout-panel" onSubmit={publish}>
          <div className="filters">
            <label className="field">כותרת וסוג האימון<input name="title" defaultValue={sessions.find(session=>session.id===initialSessionId)?.title||""} required maxLength={120}/></label>
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
            <label className="field">שעות קבועות ותקופת ההתחייבות (אם רלוונטי)<textarea name="recurring" maxLength={1000}/></label>
            <label className="field">הערות כלליות לפרסום<textarea name="notes" maxLength={1600}/></label>
          </div>
          <label className="permission-check"><input type="checkbox" name="requireInsurance" defaultChecked/> חובה לצרף מסמך ביטוח אחריות מקצועית</label>
          <label className="permission-check"><input type="checkbox" name="requireCertificate" defaultChecked/> חובה לצרף תעודת הסמכה</label>
          <p className="small">הצהרת ביטוח, סוג הסמכה ותוקף הביטוח נדרשים תמיד. המסמכים פרטיים למנהלי Studio בלבד.</p>
          <label className="field">תמונה למודעה (JPG / PNG עד 1 MB)<input type="file" accept="image/jpeg,image/png" onChange={async e=>{
            const file=e.target.files?.[0];if(!file){setImage(null);return;}
            if(file.size>1024*1024||!["image/jpeg","image/png"].includes(file.type)){setMessage("יש לבחור JPG או PNG עד 1 MB");e.target.value="";setImage(null);return;}
            const reader=new FileReader();reader.onload=()=>setImage({mime:file.type,base64:String(reader.result).split(",")[1]});reader.onerror=()=>setMessage("לא ניתן לקרוא תמונה");reader.readAsDataURL(file);
          }}/><span className="small">אפשר להעלות תמונת BISS שיש לכם רשות להשתמש בה. ללא תמונה תופיע תמונת המותג.</span></label>
          <label className="field">יעדי השיתוף לאישור (קבוצות WhatsApp / Facebook וכדומה)<textarea name="destinations" maxLength={1000} placeholder="למשל: קבוצת מדריכות האזור"/></label>
          {!!eligible.length&&<fieldset><legend>פנייה למדריכות רשומות</legend>
            <button type="button" className="btn" onClick={()=>setRecipients(eligible.map(person=>person.id))}>בחירת כל המדריכות הפעילות</button>
            <button type="button" className="btn" onClick={()=>setRecipients([])}>ניקוי בחירה</button>
            {eligible.map(person=><label className="permission-check" key={person.id}><input type="checkbox" checked={recipients.includes(person.id)} onChange={e=>setRecipients(ids=>e.target.checked?[...ids,person.id]:ids.filter(id=>id!==person.id))}/>{person.full_name}</label>)}
          </fieldset>}
          <label className="permission-check"><input type="checkbox" name="showWorkout"/> הצגת תרגילים ופלייליסט בקישור</label>
          <p className="small">הכותרת, הכתובת, הדרישות וההערות יופיעו בקישור. השאירי פרטים אישיים ומידע רפואי מחוץ לפרסום.</p>
          <button className="btn primary" disabled={busy||!selected.length}>שמירת טיוטה לבדיקה</button>
        </form>}
      </details>
      <div className="row">
        <label className="field">פרסומים אחרונים<select value={post?.id||""} disabled={busy} onChange={e=>{if(e.target.value)run(()=>load(e.target.value));else setDetail(null);}}>
          <option value="">בחירת פרסום</option>
          {posts.map(item=><option key={item.id} value={item.id}>{item.title} · {item.status==="open"?"פתוח":"טיוטה / סגור"}</option>)}
        </select></label>
        {post&&<button className="btn" disabled={busy} onClick={()=>run(()=>load(post.id))}>רענון מועמדויות</button>}
      </div>
      {post&&<section className="save-workout-panel">
        <h4>{post.terms.title}</h4>
        <p className="small">{post.terms.recurring?"גיוס לשעות קבועות":"החלפה למועדים נבחרים"} · {post.terms.requireInsurance?"מסמך ביטוח נדרש":"הצהרת ביטוח נדרשת"} · {post.terms.requireCertificate?"תעודת הסמכה נדרשת":"סוג הסמכה נדרש"}</p>
        {post.terms.draft&&<section className="card"><h4>בדיקה ואישור לפני שיתוף</h4>
          <img src={post.terms.image?`data:${post.terms.image.mime};base64,${post.terms.image.base64}`:"/api/share-image"} alt="BISS Studio" style={{width:"100%",maxWidth:600,borderRadius:16}}/>
          <p>יעדים: {post.terms.destinations||"שיתוף ידני לבחירת המנהל"}</p>
          <p>מדריכות שנבחרו: {eligible.filter(person=>post.terms.recipientIds?.includes(person.id)).map(person=>person.full_name).join(" · ")||"לא נבחרו"}</p>
          <pre className="recruitment-ad">{recruitmentAd(post.terms,link)}</pre>
          <button className="btn primary" disabled={busy} onClick={()=>run(async()=>{await request("",{action:"publish",id:post.id,confirmed:true});await load(post.id);await list();setMessage("התוכן אושר והקישור נפתח. אפשר כעת לשלוח ליעדים שאושרו.");})}>אישור התוכן, התמונה והיעדים ופתיחת הקישור</button>
          <p className="small">האישור פותח את דף המועמדות. השיתוף מתבצע רק באמצעות כפתורי השליחה, ואינו מפרסם אוטומטית ברשתות.</p>
        </section>}
        {post.status==="open"&&<>
          <label className="field">קישור לפרסום<input value={link} dir="ltr" readOnly onFocus={e=>e.target.select()}/></label>
          <div className="row">
            <a className="btn" href={link} target="_blank" rel="noreferrer">פתיחת הקישור</a>
            <a className="btn green" href={`https://wa.me/?text=${encodeURIComponent(recruitmentAd(post.terms,link))}`} target="_blank" rel="noreferrer">שיתוף ב־WhatsApp</a>
            <button className="btn" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(recruitmentAd(post.terms,link));setMessage("ההודעה הועתקה.");}catch{setMessage("לא ניתן להעתיק את ההודעה.");}}}>העתקת הודעה</button>
            <a className="btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer">פתיחת שיתוף ב־Facebook</a>
            <button className="btn" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage("הקישור הועתק.");}catch{setMessage("אפשר להעתיק את הקישור מהשדה.");}}}>העתקת קישור</button>
            <button className="btn" disabled={busy} onClick={()=>run(async()=>{await request("",{action:"close",id:post.id});await load(post.id);await list();})}>סגירת הפרסום</button>
          </div>
        </>}
        {post.status==="open"&&eligible.filter(person=>post.terms.recipientIds?.includes(person.id)).map(person=><div className="card" key={person.id}><strong>{person.full_name}</strong><div className="row">
          {person.phone&&<a className="btn green" target="_blank" rel="noreferrer" href={`https://wa.me/${person.phone.replace(/\D/g,"").replace(/^0/,"972")}?text=${encodeURIComponent(recruitmentAd(post.terms,link))}`}>שליחה אישית ב־WhatsApp</a>}
          {person.email&&<a className="btn" href={`mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(post.terms.title+" · BISS Studio")}&body=${encodeURIComponent(recruitmentAd(post.terms,link))}`}>פתיחת מייל בתוכנת הדואר</a>}
        </div></div>)}
        {post.status!=="open"&&<p>הפרסום סגור להגשת מועמדות.</p>}
        <h3>מועמדויות</h3>
        {!detail.applications.length&&<p>עדיין אין מועמדויות.</p>}
        {detail.applications.map(person=><Applicant key={person.id} person={person} terms={post.terms} taken={taken} open={post.status==="open"} busy={busy}
          onCertificate={(id,kind)=>run(()=>downloadCertificate(id,kind))}
          onReview={id=>run(async()=>{await request("",{action:"review_documents",id,confirmed:true});await load(post.id);})}
          onApprove={(id,sessionIds)=>run(async()=>{await request("",{action:"approve",id,sessionIds});await load(post.id);setMessage("השיבוץ אושר ונשמר.");onAssigned?.();})}/>)}
      </section>}
      {message&&<p role="status" className="notice">{message}</p>}
    </>}
  </section>;
}
