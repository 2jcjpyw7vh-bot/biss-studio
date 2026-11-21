"use client";
import {useState} from "react";
import ProgramSessionDetails from "./ProgramSessionDetails";
import {programPlaylistUrl} from "../../lib/program-session";
import ProgramExercisePicker from './ProgramExercisePicker';

function SessionPlaylistEditor({session, onSave}) {
  const [error, setError] = useState("");

  function save(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const url = String(fields.get("musicUrl")).trim();
    const musicUrl = programPlaylistUrl(url);
    if (url && !musicUrl) {
      setError("הזיני קישור שמתחיל ב־https:// או http://.");
      return;
    }
    onSave({musicUrl, musicTitle:musicUrl ? String(fields.get("musicTitle")).trim() : ""});
    setError("");
  }

  return <details>
    <summary>בחירת פלייליסט לאימון</summary>
    <form onSubmit={save}>
      <div className="filters">
        <label className="field">שם הפלייליסט<input name="musicTitle" maxLength={120} defaultValue={session.musicTitle || ""}/></label>
        <label className="field">קישור לפלייליסט<input name="musicUrl" type="url" maxLength={500} defaultValue={session.musicUrl || ""}/></label>
      </div>
      <p className="small">כדי להשתמש בפלייליסט ברירת המחדל, השאירי את הקישור ריק.</p>
      <button className="btn" type="submit">החלת פלייליסט</button>
      {error && <p role="alert" className="notice">{error}</p>}
    </form>
  </details>;
}

export default function ProgramResult({program, onPlaylist, onOffer, library=[],onReplace,onExercise,taskId=''}) {
  return <>
    <h2>{program.title}</h2>
    <div className="sub">{program.meta}</div>
    {program.sessions.map((session,index) => <article className="card" id={`program-session-${index}`} style={{marginTop:10,scrollMarginTop:140}} key={index}>
      <div className="row between">
        <h3>{session.name}</h3>
        <button className="btn" type="button" disabled={!session.items.length} onClick={() => onOffer(session)}>הציעי למחליפה</button>
      </div>
      <p className="small">{session.progression}</p>
      <SessionPlaylistEditor session={session} onSave={playlist => onPlaylist(index,playlist)}/>
      <ProgramSessionDetails program={program} session={session} exerciseHref={onExercise?item=>`/exercise/${encodeURIComponent(item.id)}?from=program&session=${index}${taskId?`&task=${encodeURIComponent(taskId)}`:''}`:undefined} onExercise={item=>onExercise?.(item,index)}/>
      {onReplace&&<details><summary>עריכת תרגילים באימון</summary>{session.items.map((item,itemIndex)=><div key={`${itemIndex}-${item.id}`} className="card"><h4>{item.he}</h4><label className="field">חזרות, סטים והנחיות · {item.he}<input maxLength={180} value={item.prescription||''} onChange={event=>onReplace(index,itemIndex,{...item,prescription:event.target.value})}/></label><ProgramExercisePicker item={item} items={session.items} library={library} onPick={replacement=>onReplace(index,itemIndex,replacement)}/></div>)}</details>}
    </article>)}
  </>;
}
