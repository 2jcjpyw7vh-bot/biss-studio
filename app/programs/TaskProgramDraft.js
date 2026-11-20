"use client";
import {useState} from 'react';
import {requestWorkoutTask} from '../../lib/workout-task-client';
import SaveProgramPanel from './SaveProgramPanel';
import {useStudioSession} from '../StudioSession';
export default function TaskProgramDraft({task,program,canSubmit,onSaved}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const {user}=useStudioSession();
 const draft=task.frame.follow_up;
 async function save(){setBusy(true);setMessage('');try{const result=await requestWorkoutTask('',{action:'program-draft',id:task.id,program,expectedVersion:draft?.updated_at||null});onSaved(result.task);setMessage('טיוטת התוכנית נשמרה במשימה וממתינה לבדיקת מנהל. היא עדיין לא פורסמה ללקוח.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <section className="panel"><h2>תוכנית ההמשך של {task.frame.brief.customerName}</h2><p>5 אימונים עצמאיים לאחר מפגש הפתיחה. המדריכה שומרת טיוטה; מנהל בודק ומשייך ללקוח לאחר המפגש.</p>{draft&&<p className="safe">טיוטה שמורה · {new Date(draft.updated_at).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})}</p>}{canSubmit&&program&&<button className="btn primary" disabled={busy} onClick={save}>{busy?'שומר…':'שמירת טיוטת התוכנית והעברה לבדיקת מנהל'}</button>}{user?.role==='manager'&&draft?.program&&<SaveProgramPanel program={draft.program} sourceTask={task}/>}<p role="status">{message}</p></section>;
}
