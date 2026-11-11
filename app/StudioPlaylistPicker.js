"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../lib/supabase-browser";
import {studioPlaylistUrl} from "../lib/studio-playlists";

export default function StudioPlaylistPicker({type,url,title,onPick}) {
  const [playlists,setPlaylists]=useState([]);
  const [access,setAccess]=useState("loading");
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const [attempt,retry]=useState(0);
  const client=supabaseBrowser();

  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      const {data}=client?await client.auth.getSession():{};
      if(controller.signal.aborted)return;
      if(!data?.session){setAccess("login");return;}
      const response=await fetch(`/api/studio-playlists?type=${encodeURIComponent(type)}`,{
        headers:{Authorization:`Bearer ${data.session.access_token}`},signal:controller.signal,cache:"no-store"
      });
      const result=await response.json();
      if(controller.signal.aborted)return;
      if(response.status===401){setAccess("login");return;}
      if(response.status===403){setAccess("restricted");return;}
      if(!response.ok)throw Error(result.error);
      setPlaylists(result.playlists);
      setAccess("ready");
    }
    load().catch(()=>{if(!controller.signal.aborted)setAccess("error");});
    return()=>controller.abort();
  },[client,type,attempt]);

  async function save(){
    setSaving(true);
    setMessage("");
    try{
      const {data}=await client.auth.getSession();
      if(!data?.session)throw Error("יש להיכנס לחשבון הצוות.");
      const response=await fetch("/api/studio-playlists",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session.access_token}`},
        body:JSON.stringify({type,url,title})
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.error);
      setPlaylists(result.playlists);
      setMessage(result.alreadySaved?"הפלייליסט כבר קיים בספריית סוג האימון.":"הפלייליסט נשמר לסוג האימון הזה.");
    }catch(error){setMessage(error.message||"לא ניתן לשמור את הפלייליסט.");}
    finally{setSaving(false);}
  }

  if(access==="loading")return null;
  if(access==="login")return <p className="small"><Link href="/login">כניסת צוות</Link> כדי לבחור מספריית הפלייליסטים או לשמור אליה.</p>;
  if(access==="restricted")return null;
  if(access==="error")return <p className="small">ספריית הפלייליסטים אינה זמינה כרגע. <button className="btn" type="button" onClick={()=>retry(value=>value+1)}>ניסיון חוזר</button></p>;
  return <div>
    <div className="row">
      {playlists.length>0&&<label className="field">פלייליסטים לסוג האימון
        <select value={playlists.find(item=>item.url===studioPlaylistUrl(url))?.id||""} onChange={event=>{
          const selected=playlists.find(item=>item.id===event.target.value);
          if(selected)onPick(selected);
        }}>
          <option value="">בחרי מהספרייה</option>
          {playlists.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}
        </select>
      </label>}
      {studioPlaylistUrl(url)&&title.trim()&&<button className="btn" type="button" disabled={saving} onClick={save}>שמירה לצוות</button>}
    </div>
    {message&&<p className="small" role="status">{message}</p>}
  </div>;
}
