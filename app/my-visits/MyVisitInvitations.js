"use client";
import {useEffect,useState} from 'react';
import {studioAdminHeaders} from '../../lib/studio-admin-client';
import {visitDay,visitTime} from '../../lib/studio-visits';
export default function MyVisitInvitations({onAccepted}){
 const [rows,setRows]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{async function load(){const r=await fetch('/api/visit-participants',{headers:await studioAdminHeaders(),cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setRows(d.invitations);}load().catch(error=>setMessage(error.message));},[]);
 async function accept(row){setBusy(true);setMessage('');try{const r=await fetch('/api/visit-participants',{method:'POST',headers:await studioAdminHeaders(),body:JSON.stringify({action:'accept',visitId:row.visit_id})});const d=await r.json();if(!r.ok)throw Error(d.error);setRows(current=>current.filter(item=>item.id!==row.id));onAccepted();}catch(error){setMessage(error.message);}finally{setBusy(false);}}
 if(!rows.length&&!message)return null;
 return <section className="panel"><h2>הזמינו אותך לפעילות בביסס</h2><p>אין צורך ברכישה נוספת. אישור ההצטרפות מאפשר לראות את הביקור בחשבון שלך; רישום בארבוקס ואישורי האימון נבדקים בנפרד.</p>{rows.map(row=><article className="card" key={row.id}><h3>{row.visit.title}</h3><p>{visitDay.format(new Date(row.visit.starts_at))} · {visitTime.format(new Date(row.visit.starts_at))}</p><button className="btn primary" disabled={busy} onClick={()=>accept(row)}>אישור ההצטרפות והצגת הביקור שלי</button></article>)}{message&&<p role="status" className="notice">{message}</p>}</section>;
}
