"use client";
import {useEffect,useState} from "react";
import ProgramSessionDetails from "./ProgramSessionDetails";

const statusLabels={active:"פעילה",draft:"טיוטה",paused:"מושהית",completed:"הושלמה"};
const formatDate=date=>date.split("-").reverse().join(".");

function SavedProgramDetails({traineeId,programId,pin}) {
  const [program,setProgram]=useState(null);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);

  useEffect(()=>{
    const controller=new AbortController();
    setError("");
    async function load() {
      const params=new URLSearchParams({trainee_id:traineeId,program_id:programId});
      const response=await fetch(`/api/programs?${params}`,{
        headers:{"x-admin-pin":pin},cache:"no-store",signal:controller.signal
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error || "לא ניתן לפתוח את התוכנית.");
      if(!controller.signal.aborted)setProgram(result.program);
    }
    load().catch(error=>{
      if(!controller.signal.aborted)setError(error instanceof TypeError ? "החיבור נקטע. אפשר לנסות שוב." : error.message);
    });
    return()=>controller.abort();
  },[traineeId,programId,pin,retry]);

  if(error)return <p role="status">{error} <button type="button" className="btn" onClick={()=>setRetry(value=>value+1)}>ניסיון חוזר</button></p>;
  if(!program)return <p role="status">טוען תוכנית…</p>;
  if(!program.sessions.length)return <p>אין אימונים בתוכנית שנשמרה.</p>;
  return <div>
    {program.meta&&<p className="sub">{program.meta}</p>}
    {program.sessions.map((session,index)=><details key={index} className="card">
      <summary>{session.name || `אימון ${index+1}`}</summary>
      {session.progression&&<p className="small">{session.progression}</p>}
      <ProgramSessionDetails program={program} session={session}/>
    </details>)}
  </div>;
}

export default function ProgramAssignmentHistory({traineeId,pin,coaches,revision}) {
  const [programs,setPrograms]=useState(null);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const [openedId,setOpenedId]=useState("");

  useEffect(()=>{
    const controller=new AbortController();
    setPrograms(null);
    setError("");
    async function load() {
      const response=await fetch(`/api/programs?trainee_id=${encodeURIComponent(traineeId)}`,{
        headers:{"x-admin-pin":pin},cache:"no-store",signal:controller.signal
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error || "לא ניתן לטעון שיוכים.");
      if(!controller.signal.aborted)setPrograms(result.programs);
    }
    load().catch(error=>{
      if(!controller.signal.aborted)setError(error instanceof TypeError ? "החיבור נקטע. אפשר לנסות שוב." : error.message);
    });
    return()=>controller.abort();
  },[traineeId,pin,revision,retry]);

  return <section aria-label="תוכניות ששויכו" className="card">
    <h3>תוכניות ששויכו</h3>
    {error ? <div role="status">{error} <button type="button" className="btn" onClick={()=>setRetry(value=>value+1)}>ניסיון חוזר</button></div>
      : programs===null ? <p role="status">טוען שיוכים…</p>
      : programs.length===0 ? <p>עדיין אין תוכניות ששויכו למתאמנת הזאת.</p>
      : <ul>{programs.map(item=>{
        const coachName=coaches.find(coach=>coach.id===item.coach_id)?.full_name;
        const opened=openedId===item.id;
        return <li key={item.id}>
        <strong>{item.title}</strong> · {statusLabels[item.status] || "סטטוס לא ידוע"}
        <div className="small">
          {item.starts_on ? `מ־${formatDate(item.starts_on)}` : "ללא תאריך התחלה"} · {item.ends_on ? `עד ${formatDate(item.ends_on)}` : "ללא תאריך סיום"}
        </div>
        <div className="small">
          {item.equipment_access&&item.approved_at&&item.coach_id ? "כוללת אישור ציוד" : "ללא אישור ציוד"}
          {coachName && ` · ${coachName}`}
        </div>
        <button type="button" className="btn" aria-expanded={opened} onClick={()=>setOpenedId(opened?"":item.id)}>{opened?"סגירת תוכנית":"פתיחת תוכנית"}</button>
        {opened&&<SavedProgramDetails traineeId={traineeId} programId={item.id} pin={pin}/>}
        </li>;
      })}</ul>}
    {programs?.length===50&&<p className="small">מוצגים 50 השיוכים האחרונים.</p>}
  </section>;
}
