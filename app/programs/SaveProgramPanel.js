"use client";
import {useRef,useState} from "react";
import {programDateError} from "../../lib/program-session";

export default function SaveProgramPanel({program}) {
  const [open,setOpen] = useState(false);
  const [pin,setPin] = useState("");
  const [data,setData] = useState(null);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [needsCoach,setNeedsCoach] = useState(false);
  const pending = useRef(null);

  async function request(body) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/programs", {
        method:body ? "POST" : "GET",
        headers:{"Content-Type":"application/json","x-admin-pin":pin},
        body,cache:"no-store"
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "לא ניתן להשלים את הפעולה. אפשר לנסות שוב.");
        return false;
      }
      if (!body) setData(result);
      setMessage(body ? "✓ התוכנית נשמרה למתאמנת" : "");
      return true;
    } catch {
      setMessage(body ? "לא התקבל אישור שמירה. אפשר ללחוץ שוב על ״שמירת תוכנית״." : "לא ניתן לטעון משתמשות. אפשר לנסות שוב.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const dateError = programDateError(fields.starts_on,fields.ends_on);
    if (dateError) {setMessage(dateError);return;}
    const body = {action:"assign",program,...fields};
    const fingerprint = JSON.stringify(body);
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = {fingerprint,id:crypto.randomUUID()};
    }
    if (await request(JSON.stringify({...body,assignment_id:pending.current.id}))) {
      pending.current = null;
      form.reset();
      setNeedsCoach(false);
    }
  }

  if (!open) return <button className="btn green" onClick={()=>setOpen(true)}>שמירה למתאמנת</button>;
  return <div className="save-workout-panel">
    <div className="row between"><strong>שמירת תוכנית אישית</strong><button className="btn" disabled={busy} onClick={()=>setOpen(false)}>סגירה</button></div>
    <div className="filters">
      <label className="field">PIN מנהל<input type="password" value={pin} onChange={e=>setPin(e.target.value)}/></label>
      {!data&&<button className="btn" disabled={!pin||busy} onClick={()=>request()}>טעינת משתמשות</button>}
    </div>
    {data&&<form className="program-assignment" onSubmit={submit}>
      <label className="field">מתאמנת<select name="trainee_id" required defaultValue="">
        <option value="" disabled>בחירה</option>{data.trainees.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}
      </select></label>
      <label className="field">מדריכה מאשרת<select name="coach_id" defaultValue="" required={needsCoach}>
        <option value="">ללא מדריכה מאשרת</option>{data.coaches.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}
      </select></label>
      <label className="permission-check"><input name="equipment_access" value="true" type="checkbox" checked={needsCoach} onChange={e=>setNeedsCoach(e.target.checked)}/> אישור שימוש במכשירים לפי התוכנית בלבד</label>
      <p className="small">אישור שימוש במכשירים מחייב בחירת מדריכה מאשרת.</p>
      <div className="filters">
        <label className="field">מתאריך<input name="starts_on" type="date"/></label>
        <label className="field">עד תאריך<input name="ends_on" type="date"/></label>
      </div>
      <button className="btn primary" disabled={busy||!pin||!data.trainees.length}>{busy?"שומר…":"שמירת תוכנית"}</button>
      {data.trainees.length===0&&<div className="notice">יש להוסיף תחילה מתאמנת פעילה במסך צוות והרשאות.</div>}
    </form>}
    {message&&<div role="status" className={message.startsWith("✓")?"safe":"notice"}>{message}</div>}
  </div>;
}
