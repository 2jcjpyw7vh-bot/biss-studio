"use client";
import {useRef,useState} from "react";
import {programDateError} from "../../lib/program-session";
import ProgramAssignmentHistory from "./ProgramAssignmentHistory";

export default function SaveProgramPanel({program}) {
  const [open,setOpen] = useState(false);
  const [pin,setPin] = useState("");
  const [data,setData] = useState(null);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [needsCoach,setNeedsCoach] = useState(false);
  const [traineeId,setTraineeId] = useState("");
  const [revision,setRevision] = useState(0);
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
    const body = {action:"assign",program,trainee_id:traineeId,...fields};
    const fingerprint = JSON.stringify(body);
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = {fingerprint,id:crypto.randomUUID()};
    }
    if (await request(JSON.stringify({...body,assignment_id:pending.current.id}))) {
      pending.current = null;
      setRevision(value=>value+1);
      form.reset();
      setNeedsCoach(false);
    }
  }

  if (!open) return <button className={program?"btn green":"btn"} onClick={()=>setOpen(true)}>{program?"שמירה למתאמנת":"תוכניות ששויכו"}</button>;
  return <div className="save-workout-panel">
    <div className="row between"><strong>{program?"שמירת תוכנית אישית":"צפייה בשיוכי תוכניות"}</strong><button className="btn" disabled={busy} onClick={()=>setOpen(false)}>סגירה</button></div>
    <div className="filters">
      <label className="field">PIN מנהל<input type="password" value={pin} disabled={busy} onChange={e=>{setPin(e.target.value);setData(null);setTraineeId("");setMessage("");}}/></label>
      {!data&&<button className="btn" disabled={!pin||busy} onClick={()=>request()}>טעינת משתמשות</button>}
    </div>
    {data&&<label className="field">מתאמנת<select name="trainee_id" disabled={busy} value={traineeId} onChange={e=>{setTraineeId(e.target.value);setMessage("");}}>
        <option value="" disabled>בחירה</option>{data.trainees.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}
    </select></label>}
    {data&&program&&<form className="program-assignment" onSubmit={submit}>
      <label className="field">מדריכה מאשרת<select name="coach_id" defaultValue="" required={needsCoach}>
        <option value="">ללא מדריכה מאשרת</option>{data.coaches.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}
      </select></label>
      <label className="permission-check"><input name="equipment_access" value="true" type="checkbox" checked={needsCoach} onChange={e=>setNeedsCoach(e.target.checked)}/> אישור שימוש במכשירים לפי התוכנית בלבד</label>
      <p className="small">אישור שימוש במכשירים מחייב בחירת מדריכה מאשרת.</p>
      <div className="filters">
        <label className="field">מתאריך<input name="starts_on" type="date"/></label>
        <label className="field">עד תאריך<input name="ends_on" type="date"/></label>
      </div>
      <button className="btn primary" disabled={busy||!pin||!traineeId}>{busy?"שומר…":"שמירת תוכנית"}</button>
    </form>}
    {data?.trainees.length===0&&<div className="notice">יש להוסיף תחילה מתאמנת פעילה במסך צוות והרשאות.</div>}
    {message&&<div role="status" className={message.startsWith("✓")?"safe":"notice"}>{message}</div>}
    {data&&traineeId&&<ProgramAssignmentHistory key={traineeId} traineeId={traineeId} pin={pin} coaches={data.coaches} revision={revision}/>}
  </div>;
}
