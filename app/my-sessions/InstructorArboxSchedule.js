"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {studioAdminHeaders} from "../../lib/studio-admin-client";
import {suggestedWorkoutType} from "../../lib/instructor-schedule";
import {taskWorkoutTypes} from "../../lib/workout-task";
export default function InstructorArboxSchedule(){
  const [data,setData]=useState(null),[error,setError]=useState(""),[offset,setOffset]=useState(0),[attempt,retry]=useState(0),[selected,setSelected]=useState([]),[types,setTypes]=useState({}),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();setData(null);setSelected([]);setError("");async function load(){const r=await fetch(`/api/instructor-schedule?offset=${offset}`,{headers:await studioAdminHeaders(),cache:"no-store",signal:controller.signal});const d=await r.json();if(!r.ok)throw Error(d.error);if(!controller.signal.aborted)setData(d);}load().catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[offset,attempt]);
  async function build(ids){setBusy(true);setError("");try{const r=await fetch("/api/instructor-schedule",{method:"POST",headers:await studioAdminHeaders(),body:JSON.stringify({scheduleIds:ids,types,offset})});const d=await r.json();if(!r.ok)throw Error(d.error);if(ids.length===1){window.location.assign(`/?buildTask=${d.tasks[0].id}`);return;}setSelected([]);retry(n=>n+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="panel" id="arbox-personal-schedule"><h2>השיעורים שלי בארבוקס</h2><p className="small">מועדים וסוגי השיעור לפי השיבוץ בארבוקס. לבניית סדרה אפשר לסמן כמה שיעורים ולבנות לכל מפגש את האימון שלו.</p>
    {error&&<p className="notice" role="status">{error} <button className="btn" onClick={()=>retry(n=>n+1)}>ניסיון חוזר</button></p>}
    {!data&&!error&&<p role="status">טוען את השיבוצים שלך…</p>}
    {data?.mappingRequired?<p className="notice">כדי לראות את השיעורים שלך, מנהלת הסטודיו צריכה לקשר את חשבון הצוות שלך לארבוקס דרך ״צוות והחלפות״.</p>:data&&<>
      <div className="row"><button className="btn" disabled={!offset||busy} onClick={()=>setOffset(n=>n-28)}>התקופה הקודמת</button><strong><bdi>{data.from} – {data.to}</bdi></strong><button className="btn" disabled={offset>=336||busy} onClick={()=>setOffset(n=>n+28)}>ארבעת השבועות הבאים</button></div>
      {data.limited&&<p className="notice">הלוח מכיל יותר מ־500 שיעורים בטווח; מוצגת רשימה חלקית.</p>}
      {!data.lessons.length&&<p>אין שיעורים עתידיים משובצים לך בתקופה הזו.</p>}
      {data.lessons.map(lesson=><article className="card workout-task-card" key={lesson.scheduleId||`${lesson.date}:${lesson.start}:${lesson.name}`} style={{marginTop:12}}>
        <div><h3>{lesson.name}</h3><p className="small">{lesson.date} · <bdi>{lesson.start}–{lesson.end}</bdi>{lesson.location&&` · ${lesson.location}`}</p><span className={`tag ${lesson.task?.submitted_at||lesson.hasSavedWorkout?"green":""}`}>{lesson.task?.submitted_at||lesson.hasSavedWorkout?"אימון בנוי":lesson.task?"ממתין לבנייה":"טרם נבנה אימון"}</span></div>
        {lesson.task?<Link className="btn primary" href={`/?buildTask=${lesson.task.id}`}>{lesson.task.submitted_at?"פתיחת האימון ועריכה":"המשך בניית האימון"}</Link>:<>
          <label className="field">סגנון הבנייה<select value={types[lesson.scheduleId]||suggestedWorkoutType(lesson.name)} onChange={event=>setTypes(current=>({...current,[lesson.scheduleId]:event.target.value}))}>{Object.entries(taskWorkoutTypes).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <p className="small">שם השיעור, המועד, משך האימון וגודל הקבוצה נשארים לפי ארבוקס. התאמות אישיות שנקבעו במשימה קיימת נשמרות.</p>
          <button className="btn primary" disabled={busy||!lesson.scheduleId} onClick={()=>build([lesson.scheduleId])}>{lesson.hasSavedWorkout?"פתיחת האימון ועריכה":"בניית אימון לשיעור"}</button>
          <label className="permission-check"><input type="checkbox" disabled={busy||!lesson.scheduleId||selected.length>=12&&!selected.includes(lesson.scheduleId)} checked={selected.includes(lesson.scheduleId)} onChange={event=>setSelected(current=>event.target.checked?[...current,lesson.scheduleId]:current.filter(id=>id!==lesson.scheduleId))}/>בחירה לסדרת אימונים</label>
        </>}
      </article>)}
      {selected.length>0&&<button className="btn primary" style={{marginTop:14}} disabled={busy} onClick={()=>build(selected)}>{busy?"מכין משימות…":`הכנת סדרה ל־${selected.length} שיעורים שסומנו`}</button>}
    </>}
  </section>;
}
