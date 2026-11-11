"use client";

import Link from "next/link";
import {useState} from "react";
import ProgramSessionDetails from "../programs/ProgramSessionDetails";
import exercises from "../../data/exercises.json";
import {approvedSessionChoices,matchingApprovedSessions} from "../../lib/self-service-choices";

const exerciseAreas=Object.fromEntries(exercises.map(item=>[item.id,item.region]));

export default function ApprovedSessionPicker({program,progress}) {
  const [mode,setMode]=useState("recommended");
  const [area,setArea]=useState("");
  const [equipment,setEquipment]=useState("");
  const payload=program.program_payload;
  const choices=approvedSessionChoices(payload?.sessions,exerciseAreas);
  const completed=new Set(progress.completed_sessions);
  const recommended=choices.find(choice=>choice.index===progress.next_session_index)||
    choices.find(choice=>!completed.has(choice.index))||choices[0];
  if(!recommended)return <section className="panel"><h2>התוכנית האישית</h2><p>עדיין אין אימונים זמינים בתוכנית.</p></section>;

  const areas=[...new Set(choices.flatMap(choice=>choice.areas))];
  const equipmentOptions=[...new Set(choices.flatMap(choice=>choice.equipment))];
  const filtered=mode==="recommended"?[recommended]:mode==="filter"?matchingApprovedSessions(choices,area,equipment):choices;

  return <section className="panel trainee-picker">
    <h2>בחירת אימון</h2>
    <p className="sub">{payload.title||program.title}</p>
    <div className="row trainee-picker-options" aria-label="דרך בחירת האימון">
      {[["recommended","האימון המומלץ"],["program","כל התוכנית"],["filter","לפי גוף וציוד"]].map(([key,label])=>
        <button key={key} className={`btn${mode===key?" primary":""}`} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}
    </div>
    {mode==="filter"&&<div className="filters">
      <label className="field">אזור גוף<select value={area} onChange={event=>setArea(event.target.value)}>
        <option value="">כל האזורים</option>
        {areas.map(option=><option key={option}>{option}</option>)}
      </select></label>
      <label className="field">ציוד שמופיע באימון<select value={equipment} onChange={event=>setEquipment(event.target.value)}>
        <option value="">כל הציוד המאושר</option>
        {equipmentOptions.map(option=><option key={option}>{option}</option>)}
      </select></label>
    </div>}
    {filtered.length===0&&<p className="notice">אין בתוכנית אימון שמתאים לשתי הבחירות. אפשר לשנות את הסינון.</p>}
    <div className="trainee-session-list">{filtered.map(({session,index,areas,equipment})=><article className="card" key={index}>
      <div className="row between">
        <div>
          <h3>{session.name} {completed.has(index)&&<span className="tag">הושלם</span>}</h3>
          {session.progression&&<div className="small">{session.progression}</div>}
        </div>
        <Link className="btn primary" href={`/train/${program.id}/${index}`}>{completed.has(index)?"ביצוע חוזר":"התחלת אימון"}</Link>
      </div>
      {areas.length>0&&<p className="small">אזורי גוף · {areas.join(" · ")}</p>}
      {equipment.length>0&&<p className="small">ציוד באימון · {equipment.join(" · ")}</p>}
      <details><summary>מה באימון?</summary><ProgramSessionDetails program={payload} session={session}/></details>
    </article>)}</div>
  </section>;
}
