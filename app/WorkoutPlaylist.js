"use client";

import {useState} from "react";
import {spotifyPlaylistUrl} from "../lib/program-session";

export default function WorkoutPlaylist({url,title,playlists=[]}) {
  const [input,setInput]=useState("");
  const [playlist,setPlaylist]=useState("");
  const [error,setError]=useState("");
  const [selected,setSelected]=useState("");
  const chosen=playlists.find(item=>item.id===selected);
  const playingUrl=selected==="none"?"":chosen?.url||url;

  function open(event) {
    event.preventDefault();
    const link=spotifyPlaylistUrl(input);
    if(!link){setError("יש להדביק קישור שיתוף לפלייליסט ב־Spotify.");return;}
    setError("");
    setPlaylist(link);
    window.open(link,"_blank","noopener,noreferrer");
  }

  return <div className="runner-playlist">
    {playingUrl&&<a className="btn" href={playingUrl} target="_blank" rel="noopener noreferrer">פתיחת פלייליסט · {chosen?.title||title||"מוזיקה לאימון"}</a>}
    <details className="runner-cast-help">
    <summary>פלייליסט לאימון</summary>
    {(url||playlists.length>0)&&<div className="row">
      <label className="field">בחירת פלייליסט
        <select value={selected} onChange={event=>setSelected(event.target.value)}>
          <option value="">{url?title||"פלייליסט ברירת מחדל":"בחרי מהספרייה"}</option>
          {playlists.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}
          <option value="none">בלי פלייליסט</option>
        </select>
      </label>
    </div>}
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
    </details>
  </div>;
}
