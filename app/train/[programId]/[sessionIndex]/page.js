"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {supabaseBrowser} from "../../../../lib/supabase-browser";
import IntervalTimer from "../../../IntervalTimer";
import WorkoutPlaylist from "../../../WorkoutPlaylist";

const clock=value=>`${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;
const defaultTimerSeconds=45;
const remainingSeconds=deadline=>Math.max(0,Math.ceil((deadline-Date.now())/1000));

export default function TrainingRunner(){
 const {programId,sessionIndex}=useParams();
 const router=useRouter(),client=supabaseBrowser();
 const [data,setData]=useState(null),[message,setMessage]=useState("טוען אימון מאושר…");
 const [current,setCurrent]=useState(0),[seconds,setSeconds]=useState(defaultTimerSeconds);
 const [deadline,setDeadline]=useState(null);
 const [runId,setRunId]=useState(""),[busy,setBusy]=useState(false);
 const [presenting,setPresenting]=useState(false);
 const runnerRef=useRef(null);
 const presentationButtonRef=useRef(null);

 async function accessToken() {
  const {data:auth}=await client.auth.getSession();
  if(!auth.session)throw new Error("יש להיכנס תחילה.");
  return auth.session.access_token;
 }

 async function recordRun(action,token) {
  const response=await fetch("/api/training-runs",{
   method:"POST",
   headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
   body:JSON.stringify(action)
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.error || "לא ניתן לשמור את האימון. אפשר לנסות שוב.");
  return result.run;
 }

 async function startRun(token) {
  setBusy(true);
  setMessage("");
  try {
   const run=await recordRun({action:"start",program_id:programId,session_index:Number(sessionIndex)},token || await accessToken());
   setRunId(run.id);
  } catch (error) {
   setMessage(error instanceof TypeError ? "החיבור נקטע. אפשר לנסות להפעיל שוב את מעקב האימון." : error.message);
  } finally {
   setBusy(false);
  }
 }

 useEffect(()=>{
  if(!client){setMessage("הכניסה האישית עדיין לא הופעלה בשרת.");return}
  const controller=new AbortController();
  async function load() {
   const token=await accessToken();
   const response=await fetch(`/api/run/${programId}/${sessionIndex}`,{
    headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:controller.signal
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error || "לא ניתן לטעון את האימון.");
   if(controller.signal.aborted)return;
   setData(result);
   await startRun(token);
  }
  load().catch(error=>{
   if(!controller.signal.aborted)setMessage(error instanceof TypeError ? "החיבור נקטע. אפשר לחזור לתוכנית ולפתוח שוב את האימון." : error.message);
  });
  return()=>controller.abort();
 },[client,programId,sessionIndex]);

 useEffect(()=>{
  if(deadline===null)return;
  function syncTimer(){
   const remaining=remainingSeconds(deadline);
   setSeconds(remaining);
   if(remaining===0)setDeadline(null);
  }
  syncTimer();
  const timer=setInterval(syncTimer,250);
  document.addEventListener("visibilitychange",syncTimer);
  return()=>{
   clearInterval(timer);
   document.removeEventListener("visibilitychange",syncTimer);
  };
 },[deadline]);

 function toggleTimer(){
  if(deadline===null){
   setDeadline(Date.now()+seconds*1000);
  } else {
   setSeconds(remainingSeconds(deadline));
   setDeadline(null);
  }
 }

 function adjustTimer(delta){
  if(deadline===null){
   setSeconds(value=>Math.max(0,value+delta));
   return;
  }
  const nextDeadline=Math.max(Date.now(),deadline)+delta*1000;
  const remaining=remainingSeconds(nextDeadline);
  setSeconds(remaining);
  setDeadline(remaining>0?nextDeadline:null);
 }

 function moveExercise(offset){
  setDeadline(null);
  setSeconds(defaultTimerSeconds);
  setCurrent(value=>value+offset);
 }
 async function togglePresentation(){
  const runner=runnerRef.current;
  if(presenting){
   setPresenting(false);
   if(document.fullscreenElement===runner)await document.exitFullscreen().catch(()=>{});
   return;
  }
  setPresenting(true);
  if(document.fullscreenEnabled&&typeof runner?.requestFullscreen==="function"){
   try {await runner.requestFullscreen();} catch {/* Keep the in-page presentation. */}
  }
 }

 useEffect(()=>{
  if(!presenting)return;
  const runner=runnerRef.current;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  function onFullscreenChange(){
   if(!document.fullscreenElement)setPresenting(false);
  }
  function onKeyDown(event){
   if(event.key==="Escape"&&!document.fullscreenElement)setPresenting(false);
  }
  document.addEventListener("fullscreenchange",onFullscreenChange);
  document.addEventListener("keydown",onKeyDown);
  return()=>{
   document.body.style.overflow=previousOverflow;
   document.removeEventListener("fullscreenchange",onFullscreenChange);
   document.removeEventListener("keydown",onKeyDown);
   if(document.fullscreenElement===runner)document.exitFullscreen().catch(()=>{});
   presentationButtonRef.current?.focus({preventScroll:true});
  };
 },[presenting]);

 async function finish() {
  setBusy(true);
  if(deadline!==null)setSeconds(remainingSeconds(deadline));
  setDeadline(null);
  setMessage("שומר סיום אימון…");
  try {
   await recordRun({action:"complete",run_id:runId},await accessToken());
   router.push("/my-program");
  } catch (error) {
   setMessage(error instanceof TypeError ? "לא התקבל אישור שהאימון נשמר. לחצי שוב על ״סיום ושמירה״." : error.message);
   setBusy(false);
  }
 }
 if(!data)return <main className="training-runner"><section className="panel"><h2>{message}</h2><Link className="btn" href="/my-program">חזרה לתוכנית</Link></section></main>;
 const items=data.session.items,item=items[current];
 return <main className={`training-runner${presenting?" runner-presenting":""}`} ref={runnerRef}>
  <header className="runner-topbar"><div><div className="eyebrow">BISS STUDIO · {data.program.title}</div><strong>{data.session.name}</strong></div><div className="row"><button className="btn" ref={presentationButtonRef} onClick={togglePresentation} aria-pressed={presenting}>{presenting?"יציאה מתצוגת מסך":"תצוגת מסך"}</button><button className="btn green" disabled={!runId||busy} onClick={finish}>סיום ושמירה</button></div></header>
  {message&&<div className="notice" role="status">{message}</div>}
  {!runId&&!busy&&<button className="btn" onClick={()=>startRun()}>ניסיון חוזר להפעלת מעקב</button>}
  {!presenting&&<details className="runner-cast-help">
   <summary>שיקוף מהטלפון למסך הסטודיו</summary>
   <ol>
    <li>התחברי לרשת ה־Wi-Fi של הסטודיו.</li>
    <li>פתחי את ״שיקוף מסך״ או Cast בהגדרות המהירות של הטלפון ובחרי במסך הסטודיו.</li>
    <li>חזרי לאימון ולחצי על ״תצוגת מסך״.</li>
   </ol>
  </details>}
  <WorkoutPlaylist key={`${programId}:${sessionIndex}`} url={data.session.musicUrl} title={data.session.musicTitle}/>
  <IntervalTimer/>
  {!item?<section className="runner-stage"><h1>לא הוגדרו תרגילים באימון זה</h1></section>:<section className="runner-stage">
   <div className="runner-progress">תרגיל {current+1} מתוך {items.length}</div>
   <h1>{item.he}</h1>{item.en&&<div className="runner-english">{item.en}</div>}
   <div className="runner-prescription">{item.prescription}</div>
   <div className="runner-meta"><span>{item.equipment||"ללא ציוד"}</span>{data.session.progression&&<span>{data.session.progression}</span>}</div>
   {item.cue&&<div className="runner-cue">{item.cue}</div>}
   <div className="runner-timer"><strong>{clock(seconds)}</strong><div className="row"><button className="btn" onClick={()=>adjustTimer(-15)}>−15</button><button className="btn primary" disabled={seconds===0} onClick={toggleTimer}>{deadline!==null?"עצירה":"הפעלה"}</button><button className="btn" onClick={()=>adjustTimer(15)}>+15</button></div></div>
   {seconds===0&&<div className="safe"><strong>הזמן הסתיים</strong> — עברו לתרגיל הבא כשאתם מוכנים.</div>}
   <div className="runner-controls"><button className="btn" disabled={current===0} onClick={()=>moveExercise(-1)}>הקודם</button>{item.id&&<Link className="btn" href={`/exercise/${item.id}`} target="_blank">הסבר לתרגיל</Link>}<button className="btn primary" disabled={current===items.length-1} onClick={()=>moveExercise(1)}>הבא</button></div>
  </section>}
  <footer className="runner-footer"><span>בכאב או תחושה חריגה מפסיקים מיד.</span></footer>
 </main>
}
