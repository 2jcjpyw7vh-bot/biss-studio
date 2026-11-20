"use client";
import {useState} from 'react';
import {studioAdminHeaders} from '../../lib/studio-admin-client';
export default function ActivityTaskLink({lesson}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function open(){setBusy(true);setMessage('');try{
  const response=await fetch('/api/activity-jobs',{method:'POST',headers:await studioAdminHeaders(),body:JSON.stringify({action:'import',scheduleId:lesson.scheduleId})});
  const result=await response.json();if(!response.ok)throw Error(result.error);window.location.assign(`/operations?job=${result.id}`);
 }catch(error){setMessage(error.message||'לא ניתן לפתוח פעילות');setBusy(false);}}
 return <div><button className="btn primary" disabled={busy} onClick={open}>{busy?'פותח פעילות…':'שיוך ובניית פעילות'}</button>{message&&<p role="status" className="notice">{message}</p>}</div>;
}
