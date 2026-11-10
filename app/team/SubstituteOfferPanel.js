"use client";

import {useState} from "react";
import {canAccessInstructorArea} from "../../lib/studio-permissions";

const israelDate = new Intl.DateTimeFormat("he-IL",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jerusalem"});

export default function SubstituteOfferPanel({data,call,busy,draftWorkout}){
  const planned=data.planned_sessions||[];
  const groups=data.groups||[];
  const activeGroups=groups.filter(group=>group.active);
  const eligible=(data.users||[]).filter(canAccessInstructorArea);
  const [planning,setPlanning]=useState(Boolean(draftWorkout)||!planned.length);
  const [groupId,setGroupId]=useState("");
  const [addingGroup,setAddingGroup]=useState(!activeGroups.length);
  const [sessionId,setSessionId]=useState("");
  const [instructorId,setInstructorId]=useState("");
  const [shareUrl,setShareUrl]=useState("");
  const [offerMessage,setOfferMessage]=useState("");
  const chosenGroup=groupId||(activeGroups.length===1?activeGroups[0].id:"");
  const chosenSession=sessionId||(planned.length===1?planned[0].id:"");
  const session=planned.find(item=>item.id===chosenSession);
  const canShareWorkout=Boolean(session?.workout_summary||session?.playlist_url);

  const addGroup=async event=>{
    event.preventDefault();
    const result=await call({action:"offer_group",...Object.fromEntries(new FormData(event.currentTarget))});
    if(result?.created_group_id){setGroupId(result.created_group_id);setAddingGroup(false);}
  };
  const planSession=async event=>{
    event.preventDefault();
    const result=await call({action:"plan_offer_session",...Object.fromEntries(new FormData(event.currentTarget)),workout:draftWorkout});
    if(result?.created_session_id){setSessionId(result.created_session_id);setPlanning(false);setShareUrl("");}
  };
  const createOffer=async event=>{
    event.preventDefault();
    setShareUrl("");
    setOfferMessage("");
    const result=await call({action:"offer",...Object.fromEntries(new FormData(event.currentTarget))});
    if(result?.share_path){
      setShareUrl(new URL(result.share_path,window.location.origin).href);
      setOfferMessage(result.reused_offer?"כבר קיימת הצעה פעילה למדריכה הזאת. לשינוי פרטי ההצעה, בטלי אותה וצרי קישור חדש.":"הקישור מוכן. אפשר לפתוח, להעתיק או לשלוח אותו למדריכה.");
    }
  };
  const copy=async()=>{
    try{await navigator.clipboard.writeText(shareUrl);setOfferMessage("הקישור הועתק.");}
    catch{setOfferMessage("אפשר לסמן ולהעתיק את הקישור מהשדה.");}
  };

  return <section className="card" aria-labelledby="substitute-offer-heading">
    <h3 id="substitute-offer-heading">הצעת אימון למחליפה</h3>
    <p className="small">בחרי אימון עתידי ומדריכה. הקישור מאפשר לה לאשר או לדחות את השיבוץ.</p>
    <div className="row">
      <button className="btn" type="button" disabled={!planned.length||busy} aria-pressed={!planning} onClick={()=>setPlanning(false)}>בחירת אימון קיים</button>
      <button className="btn" type="button" disabled={busy} aria-pressed={planning} onClick={()=>setPlanning(true)}>תכנון אימון חדש</button>
    </div>
    {planning ? <>
      {!planned.length&&<p className="notice">אין עדיין אימון עתידי לבחירה. אפשר לתכנן אותו כאן.</p>}
      {addingGroup ? <form onSubmit={addGroup} className="save-workout-panel">
        <label className="field">שם קבוצה חדשה<input name="name" required maxLength={100}/></label>
        <button className="btn primary" disabled={busy}>שמירת קבוצה</button>
        {!!activeGroups.length&&<button className="btn" type="button" onClick={()=>setAddingGroup(false)}>חזרה לבחירת קבוצה</button>}
      </form> : <form onSubmit={planSession} className="save-workout-panel">
        <label className="field">קבוצה<select name="group_id" value={chosenGroup} onChange={event=>setGroupId(event.target.value)} required>
          <option value="">בחירת קבוצה</option>{activeGroups.map(group=><option value={group.id} key={group.id}>{group.name}</option>)}
        </select></label>
        <button className="btn" type="button" onClick={()=>setAddingGroup(true)}>הוספת קבוצה</button>
        <label className="field">כותרת האימון<input name="title" defaultValue={draftWorkout?.title||""} required maxLength={160}/></label>
        <label className="field">תאריך ושעה לפי שעון ישראל<input name="starts_at" type="datetime-local" required/></label>
        {draftWorkout ? <p className="small">התוכנית שבנית תצורף לאימון המתוכנן.</p>
          : <><label className="field">תוכנית כללית להצגה לפי בחירה<textarea name="workout_summary" maxLength={4000} placeholder="תרגילים ודגשים כלליים, ללא שמות או מידע רפואי"/></label>
            <label className="field">קישור לפלייליסט<input name="playlist_url" type="url" maxLength={500}/></label></>}
        <button className="btn primary" disabled={busy||!chosenGroup}>שמירה והמשך להצעה</button>
      </form>}
    </> : <form onSubmit={createOffer} className="save-workout-panel">
      <label className="field">אימון מתוכנן<select name="session_id" required value={chosenSession} onChange={event=>{setSessionId(event.target.value);setShareUrl("");setOfferMessage("");}}>
        <option value="">בחירת אימון</option>
        {planned.map(item=><option key={item.id} value={item.id}>{israelDate.format(new Date(item.starts_at))} · {groups.find(group=>group.id===item.group_id)?.name||"קבוצה"} · {item.title}</option>)}
      </select></label>
      {session&&<p className="small">{session.instructor_name?`שיבוץ נוכחי: ${session.instructor_name}`:"האימון עדיין ללא מדריכה."}</p>}
      <label className="field">מדריכה<select name="instructor_id" required value={instructorId} onChange={event=>{setInstructorId(event.target.value);setShareUrl("");setOfferMessage("");}}>
        <option value="">בחירת מדריכה</option>{eligible.map(user=><option key={user.id} value={user.id}>{user.full_name}</option>)}
      </select></label>
      {!eligible.length&&<p className="notice">אין מדריכה או מנהלת פעילה. הוסיפי משתמשת פעילה כדי ליצור הצעה.</p>}
      <label className="field">תוקף ההצעה<select name="expires_hours" defaultValue="48"><option value="24">24 שעות</option><option value="48">48 שעות</option><option value="72">72 שעות</option></select></label>
      <p className="small">התוקף מסתיים לכל המאוחר בתחילת האימון.</p>
      <label className="field">הודעה למדריכה<textarea name="message" maxLength={1200} placeholder="פרטים כלליים בלבד, ללא שמות מתאמנות או מידע רפואי"/></label>
      <label className="permission-check"><input key={chosenSession} type="checkbox" name="show_workout" value="true" disabled={!canShareWorkout}/> הצגת תוכנית האימון והפלייליסט בקישור</label>
      {session&&!canShareWorkout&&<p className="small">לא צורפה תוכנית או רשימת השמעה. אפשר ליצור קישור עם המועד והקבוצה.</p>}
      <button className="btn primary" disabled={busy||!session||!instructorId}>{busy?"שומר…":"יצירת קישור הצעה"}</button>
    </form>}
    {offerMessage&&<p role="status" className="safe">{offerMessage}</p>}
    {shareUrl&&<div className="save-workout-panel">
      <label className="field">קישור ההצעה<input value={shareUrl} dir="ltr" readOnly onFocus={event=>event.target.select()}/></label>
      <div className="row">
        <a className="btn" href={shareUrl} target="_blank" rel="noreferrer">פתיחת קישור</a>
        <button className="btn" type="button" onClick={copy}>העתקת קישור</button>
        <a className="btn green" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`הצעת אימון מ־BISS Studio\n${shareUrl}`)}`}>WhatsApp</a>
        <a className="btn blue" href={`mailto:?subject=${encodeURIComponent("הצעת אימון מ־BISS Studio")}&body=${encodeURIComponent(shareUrl)}`}>מייל</a>
      </div>
    </div>}
  </section>;
}
