"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {requestWorkoutTask} from "../../lib/workout-task-client";

export default function WorkoutTasksList() {
  const [tasks,setTasks]=useState(null);
  const [error,setError]=useState("");
  const [attempt,retry]=useState(0);

  useEffect(()=>{
    let active=true;
    requestWorkoutTask().then(result=>{if(active){setTasks(result.tasks);setError("");}})
      .catch(failure=>{if(active)setError(failure.message);});
    return()=>{active=false;};
  },[attempt]);

  return <section className="panel">
    <h2>משימות לבניית אימון</h2>
    {error?<div className="notice" role="status">{error} <button className="btn" onClick={()=>retry(value=>value+1)}>ניסיון חוזר</button></div>
      :tasks===null?<p role="status">טוען משימות…</p>
      :tasks.length===0?<p>אין משימות לבניית אימון.</p>
      :tasks.map(task=><article className="card row between" key={task.id}>
        <div><strong>{task.title}</strong><div className="small">{new Date(task.starts_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})} · {task.submitted_at?"האימון נשלח":"ממתין לבנייה"}</div></div>
        <Link className="btn" href={`/?buildTask=${task.id}`}>פתיחת המשימה</Link>
      </article>)}
  </section>;
}
