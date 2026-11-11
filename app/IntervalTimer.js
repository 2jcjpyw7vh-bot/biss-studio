"use client";

import {useEffect,useRef,useState} from "react";
import {intervalTimerPosition} from "../lib/interval-timer";

const defaultPlan={work:40,rest:20,sets:3};
const idleClock={elapsed:0,startedAt:null};
const labels={work:"עבודה",rest:"מנוחה",done:"הטיימר הסתיים"};
const timeLabel=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;

function playCue(audio,phase) {
  if(audio?.state!=="running")return;
  const notes=phase==="done"?[660,880]:phase==="rest"?[440]:[880];
  notes.forEach((frequency,index)=>{
    const start=audio.currentTime+index*0.14;
    const tone=audio.createOscillator();
    const volume=audio.createGain();
    tone.frequency.value=frequency;
    volume.gain.setValueAtTime(0.001,start);
    volume.gain.exponentialRampToValueAtTime(0.12,start+0.015);
    volume.gain.exponentialRampToValueAtTime(0.001,start+0.12);
    tone.connect(volume);
    volume.connect(audio.destination);
    tone.onended=()=>{tone.disconnect();volume.disconnect();};
    tone.start(start);
    tone.stop(start+0.13);
  });
}

export default function IntervalTimer(){
  const [inputs,setInputs]=useState(defaultPlan);
  const [plan,setPlan]=useState(defaultPlan);
  const [clock,setClock]=useState(idleClock);
  const [now,setNow]=useState(0);
  const [sound,setSound]=useState(true);
  const [soundStatus,setSoundStatus]=useState("");
  const audio=useRef(null);
  const lastCue=useRef("");
  const mounted=useRef(false);
  const running=clock.startedAt!==null;
  const elapsed=clock.elapsed+(running?Math.max(0,now-clock.startedAt):0);
  const position=intervalTimerPosition(plan,elapsed);
  const started=running||clock.elapsed>0;
  const finished=position.phase==="done";
  const valid=Number.isInteger(+inputs.work)&&+inputs.work>=1&&+inputs.work<=300&&
    inputs.rest!==""&&Number.isInteger(+inputs.rest)&&+inputs.rest>=0&&+inputs.rest<=300&&
    Number.isInteger(+inputs.sets)&&+inputs.sets>=1&&+inputs.sets<=30;

  useEffect(()=>{
    mounted.current=true;
    return()=>{
      mounted.current=false;
      audio.current?.close().catch(()=>{});
      audio.current=null;
    };
  },[]);

  useEffect(()=>{
    if(!running)return;
    const tick=()=>setNow(Date.now());
    const timer=setInterval(tick,150);
    document.addEventListener("visibilitychange",tick);
    return()=>{
      clearInterval(timer);
      document.removeEventListener("visibilitychange",tick);
    };
  },[running]);

  useEffect(()=>{
    if(!running)return;
    const key=`${position.set}:${position.phase}`;
    if(key!==lastCue.current){
      lastCue.current=key;
      if(sound&&!document.hidden&&position.phaseAge<1000)playCue(audio.current,position.phase);
    }
    if(finished)setClock({elapsed,startedAt:null});
  },[running,position.phase,position.set,position.phaseAge,finished,elapsed,sound]);

  async function enableAudio(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){setSoundStatus("צלילי מעבר אינם זמינים בדפדפן הזה.");return;}
    try {
      audio.current??=new Audio();
      if(audio.current.state!=="running")await audio.current.resume();
      if(mounted.current)setSoundStatus("");
    } catch {
      if(mounted.current)setSoundStatus("לא ניתן להפעיל צליל. הטיימר ממשיך בתצוגה.");
    }
  }

  function toggle(){
    const time=Date.now();
    if(running){
      setClock({elapsed:clock.elapsed+Math.max(0,time-clock.startedAt),startedAt:null});
      return;
    }
    if(sound)void enableAudio();
    if(!started||finished){
      const settings={work:+inputs.work,rest:+inputs.rest,sets:+inputs.sets};
      setPlan(settings);
      lastCue.current="1:work";
      setClock({elapsed:0,startedAt:time});
    }else{
      setClock({elapsed:clock.elapsed,startedAt:time});
    }
    setNow(time);
  }

  function reset(){
    setClock(idleClock);
    lastCue.current="";
  }

  return <details className="interval-timer">
    <summary>טיימר סטים</summary>
    <div className="filters">
      {[["work","עבודה בשניות",1,300],["rest","מנוחה בשניות",0,300],["sets","מספר סטים",1,30]].map(([key,label,min,max])=>
        <label className="field" key={key}>{label}<input type="number" min={min} max={max} step="1" value={inputs[key]}
          disabled={started&&!finished} onChange={event=>setInputs(current=>({...current,[key]:event.target.value}))}/></label>)}
    </div>
    <label className="permission-check"><input type="checkbox" checked={sound} onChange={event=>{
      setSound(event.target.checked);
      if(event.target.checked)void enableAudio();
    }}/> צליל במעבר בין שלבים</label>
    {soundStatus&&sound&&<p className="small" role="status">{soundStatus}</p>}
    <div className="interval-timer-readout">
      <div role="status">{started?labels[position.phase]:"מוכן להפעלה"}{started&&!finished&&` · סט ${position.set} מתוך ${plan.sets}`}</div>
      <strong>{timeLabel(started?position.seconds:(valid?+inputs.work:0))}</strong>
    </div>
    <div className="row">
      <button className="btn primary" type="button" disabled={(!started||finished)&&!valid} onClick={toggle}>
        {running?"השהיה":finished?"התחלה מחדש":started?"המשך":"הפעלת טיימר"}
      </button>
      {started&&<button className="btn" type="button" onClick={reset}>איפוס טיימר</button>}
    </div>
  </details>;
}
