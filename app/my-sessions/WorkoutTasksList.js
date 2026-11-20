"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {requestWorkoutTask} from "../../lib/workout-task-client";
import StaffAccessShare from "../team/StaffAccessShare";
import WorkoutTaskBrief from '../WorkoutTaskBrief';
import TaskBriefEditor from './TaskBriefEditor';
import {isPersonalIntroduction} from '../../lib/activity-operations';

export default function WorkoutTasksList() {
  const [tasks,setTasks]=useState(null);
  const [error,setError]=useState("");
  const [attempt,retry]=useState(0);
  const [canManage,setCanManage]=useState(false);
  const [filter,setFilter]=useState("pending");

  useEffect(()=>{
    let active=true;
    requestWorkoutTask().then(result=>{if(active){setTasks(result.tasks);setCanManage(result.canManage);setError("");}})
      .catch(failure=>{if(active)setError(failure.message);});
    return()=>{active=false;};
  },[attempt]);

  const visibleTasks=(tasks||[]).filter(task=>filter==="all"||(filter==="submitted"?Boolean(task.submitted_at):!task.submitted_at));

  return <section className="panel" id="workout-tasks">
    <h2>{canManage?"משימות בניית אימון בצוות":"משימות לבניית אימון"}</h2>
    <label className="field">הצגת משימות<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="pending">ממתינות לבנייה</option><option value="submitted">אימונים שנשלחו למנהלת</option><option value="all">כל המשימות</option></select></label>
    {error?<div className="notice" role="status">{error} <button className="btn" onClick={()=>retry(value=>value+1)}>ניסיון חוזר</button></div>
      :tasks===null?<p role="status">טוען משימות…</p>
      :visibleTasks.length===0?<p>אין משימות בתצוגה שנבחרה.</p>
      :visibleTasks.map(task=><article className="card workout-task-card" key={task.id}>
        <div><strong>{task.title}</strong><div className="small">{new Date(task.starts_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})} · {task.submitted_at?"האימון נשלח":"ממתין לבנייה"}</div></div>
        <Link className="btn" href={`/?buildTask=${task.id}`}>פתיחת המשימה</Link>
        <WorkoutTaskBrief task={task}/>
        {canManage&&!task.submitted_at&&isPersonalIntroduction(task.title)&&<TaskBriefEditor task={task} onSaved={()=>retry(n=>n+1)}/>}
        {canManage&&<StaffAccessShare userId={task.instructor_id} taskId={task.id}/>}
      </article>)}
  </section>;
}
