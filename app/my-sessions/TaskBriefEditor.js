"use client";
import {useState} from 'react';
import {requestWorkoutTask} from '../../lib/workout-task-client';
export default function TaskBriefEditor({task,onSaved}){
 const [customers,setCustomers]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){try{const d=await requestWorkoutTask('?customers=1');setCustomers(d.customers);}catch(e){setMessage(e.message);}}
 async function save(event){event.preventDefault();setBusy(true);setMessage('');try{const f=new FormData(event.currentTarget);await requestWorkoutTask('',{action:'brief',id:task.id,customerId:f.get('customerId'),sessions:6,verified:f.get('verified')==='on'});setMessage('התדריך נשמר. הודעת הוואטסאפ תכלול את הלקוח ואת השלב הבא.');onSaved();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <details><summary onClick={()=>{if(!customers)load();}}>תדריך לסדרת אימונים עצמאיים</summary>{customers&&<form onSubmit={save}><label className="field">הלקוח הרשום<select name="customerId" required defaultValue={task.frame?.brief?.customerId||''}><option value="">בחירת לקוח</option>{customers.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><p>6 מפגשים: ראשון עם מדריכה ועוד 5 עצמאיים.</p><label className="permission-check"><input type="checkbox" name="verified" required/>בדקתי בארבוקס שהלקוח רכש את הסדרה הזו ושזהו מפגש הפתיחה שלו.</label><button className="btn" disabled={busy}>שמירת התדריך להודעה ולמשימה</button></form>}{message&&<p role="status">{message}</p>}</details>;
}
