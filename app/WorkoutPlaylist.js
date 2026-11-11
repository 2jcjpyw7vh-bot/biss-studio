"use client";

import {useState} from "react";
import {spotifyPlaylistUrl} from "../lib/program-session";

export default function WorkoutPlaylist({url,title}) {
  const [input,setInput]=useState("");
  const [playlist,setPlaylist]=useState("");
  const [error,setError]=useState("");

  if(url)return <div className="row"><a className="btn" href={url} target="_blank" rel="noopener noreferrer">פתיחת פלייליסט · {title||"מוזיקה לאימון"}</a></div>;

  function open(event) {
    event.preventDefault();
    const link=spotifyPlaylistUrl(input);
    if(!link){setError("יש להדביק קישור שיתוף לפלייליסט ב־Spotify.");return;}
    setError("");
    setPlaylist(link);
    window.open(link,"_blank","noopener,noreferrer");
  }

  return <details className="runner-cast-help">
    <summary>פלייליסט לאימון</summary>
    <form onSubmit={open}>
      <label className="field">קישור לפלייליסט מ־Spotify
        <input dir="ltr" type="url" maxLength={500} value={input} onChange={event=>{setInput(event.target.value);setError("");}} required/>
      </label>
      {error&&<p role="alert">{error}</p>}
      <div className="row" style={{marginTop:8}}>
        <button className="btn" type="submit">פתיחת הפלייליסט</button>
        {playlist&&<a className="btn" href={playlist} target="_blank" rel="noopener noreferrer">פתיחה חוזרת</a>}
      </div>
    </form>
  </details>;
}
