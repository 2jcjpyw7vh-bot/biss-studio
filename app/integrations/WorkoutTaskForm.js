"use client";

import {useEffect,useState} from "react";
import {taskLimitations,taskWorkoutTypes,suggestedLessonDuration} from "../../lib/workout-task";
import {whatsappNumber} from "../../lib/substitute-contact";

export default function WorkoutTaskForm({lesson,token}) {
  const [instructors,setInstructors]=useState([]);
  const [recipient,setRecipient]=useState(null);
  const [link,setLink]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/workout-tasks?instructors=1",{headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
      .then(async response=>{
        const result=await response.json();
        if(!response.ok)throw Error(result.error);
        setInstructors(result.instructors);
      }).catch(error=>{if(!controller.signal.aborted)setMessage(error.message||"לא ניתן לטעון את רשימת המדריכות.");});
    return()=>controller.abort();
  },[token]);

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const form=new FormData(event.currentTarget);
      const fields=Object.fromEntries(form);
      const response=await fetch("/api/workout-tasks",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({...fields,action:"create",scheduleId:lesson.scheduleId,limitations:form.getAll("limitations")})
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.error);
      setRecipient(instructors.find(person=>person.id===fields.instructorId));
      setLink(new URL(`/?buildTask=${result.task.id}`,window.location.origin).href);
    } catch(error) {
      setMessage(error.message||"לא ניתן ליצור את המשימה.");
    } finally {setBusy(false);}
  }

  const subject="בניית אימון ב־BISS Studio";
  const shareText=`היי, מחכה לך משימה לבניית אימון עבור ״${lesson.name}״. פרטי השיעור וההתאמות כבר מוגדרים. אפשר להתחבר לחשבון Studio ולפתוח את המשימה כאן:\n\n${link}`;
  return <div className="save-workout-panel">
    {!link?<form onSubmit={create}>
      <div className="filters">
        <label className="field">מדריכה<select name="instructorId" required defaultValue="">
          <option value="">בחרי מדריכה פעילה</option>
          {instructors.map(person=><option key={person.id} value={person.id}>{person.full_name}</option>)}
        </select></label>
        <label className="field">סוג אימון<select name="type" required>
          {Object.entries(taskWorkoutTypes).map(([type,label])=><option key={type} value={type}>{label}</option>)}
        </select></label>
        <label className="field">מועד לפי שעון ישראל<input name="startsAt" type="datetime-local" required defaultValue={`${lesson.date}T${lesson.start}`}/></label>
        <label className="field">משך בדקות<input name="duration" type="number" min="20" max="90" required defaultValue={suggestedLessonDuration(lesson)}/></label>
        <label className="field">משתתפות<input name="participants" type="number" min="1" max="40" required defaultValue={lesson.registrations||lesson.capacity||""}/></label>
      </div>
      <fieldset><legend>התאמות לאימון</legend><div className="row">
        {Object.entries(taskLimitations).map(([value,label])=><label className="permission-check" key={value}>
          <input type="checkbox" name="limitations" value={value}/>{label}
        </label>)}
      </div></fieldset>
      <button className="btn primary" disabled={busy||!instructors.length}>יצירת קישור לבניית אימון</button>
    </form>:<>
      <p className="safe">המשימה נשמרה ונוספה ל״האימונים שלי״ של המדריכה שנבחרה.</p>
      <div className="row">
        <button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage("הקישור הועתק.");}catch{setMessage("אפשר להעתיק את הקישור מהשדה.");}}}>העתקת קישור</button>
        <a className="btn green" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(recipient?.phone)}?text=${encodeURIComponent(shareText)}`}>WhatsApp</a>
        <a className="btn blue" href={`mailto:${encodeURIComponent(recipient?.email||"")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`}>מייל</a>
      </div>
      <input value={link} dir="ltr" aria-label="קישור למשימת בניית אימון" readOnly onFocus={event=>event.target.select()}/>
    </>}
    {message&&<p role="status" className="notice">{message}</p>}
  </div>;
}
