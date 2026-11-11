"use client";
import {useState} from "react";
import ProgramSessionDetails from "./ProgramSessionDetails";
import {programPlaylistUrl} from "../../lib/program-session";

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

export default function ProgramResult({program, onPlaylist, onOffer}) {
  return <>
    <h2>{program.title}</h2>
    <div className="sub">{program.meta}</div>
    {program.sessions.map((session,index) => <article className="card" style={{marginTop:10}} key={index}>
      <div className="row between">
        <h3>{session.name}</h3>
        <button className="btn" type="button" disabled={!session.items.length} onClick={() => onOffer(session)}>הציעי למחליפה</button>
      </div>
      <p className="small">{session.progression}</p>
      <SessionPlaylistEditor session={session} onSave={playlist => onPlaylist(index,playlist)}/>
      <ProgramSessionDetails program={program} session={session}/>
    </article>)}
  </>;
}
