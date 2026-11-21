"use client";
import {useState} from 'react';
import {requestWorkoutTask} from '../../lib/workout-task-client';
import SaveProgramPanel from './SaveProgramPanel';
import {useStudioSession} from '../StudioSession';
import {safeProgram} from '../../lib/follow-up-program';
export default function TaskProgramDraft({task,program,canSubmit,onSaved}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const {user}=useStudioSession();
 const draft=task.frame.follow_up;
 const unsaved=Boolean(program)&&JSON.stringify(safeProgram(program))!==JSON.stringify(safeProgram(draft?.program));
 async function save(){setBusy(true);setMessage('');try{const result=await requestWorkoutTask('',{action:'program-draft',id:task.id,program,expectedVersion:draft?.updated_at||null});onSaved(result.task);setMessage('טיוטת התוכנית נשמרה במשימה וממתינה לבדיקת מנהל. היא עדיין לא פורסמה ללקוח.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <section className="panel"><h2>תוכנית ההמשך של {task.frame.brief.customerName}</h2><p>5 אימונים עצמאיים לאחר מפגש הפתיחה. המדריכה שומרת טיוטה; מנהל בודק ומשייך ללקוח לאחר המפגש.</p>{draft&&<p className="safe">טיוטה שמורה בענן · {new Date(draft.updated_at).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})}</p>}{unsaved&&<p role="status" className="notice">יש שינויים שעדיין לא נשמרו למשימה. יש ללחוץ על שמירת הטיוטה.</p>}{canSubmit&&program&&<button className="btn primary" disabled={busy||!unsaved} onClick={save}>{busy?'שומר…':unsaved?'שמירת טיוטת התוכנית והעברה לבדיקת מנהל':'התוכנית שמורה במשימה'}</button>}{!canSubmit&&<p className="notice">זו תצוגת ניהול. בנייה ושמירה זמינות בחשבון המדריכה המשויכת למשימה.</p>}{user?.role==='manager'&&draft?.program&&!unsaved&&<SaveProgramPanel program={draft.program} sourceTask={task}/>}<p role="status">{message}</p></section>;
}
