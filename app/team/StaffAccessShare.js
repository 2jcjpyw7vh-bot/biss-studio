"use client";

import Link from "next/link";
import {useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";

export default function StaffAccessShare({userId,taskId,visitId,activityId,name,token}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [whatsapp,setWhatsapp]=useState("");
  const [login,setLogin]=useState(false);

  async function prepare(channel){
    setBusy(true);
    setMessage("");
    setWhatsapp("");
    setLogin(false);
    try{
      const client=supabaseBrowser();
      const {data}=client?await client.auth.getSession():{};
      const accessToken=data?.session?.access_token||token;
      if(!accessToken){setLogin(true);throw Error("יש להיכנס לחשבון המנהלת האישי כדי לשלוח כניסה אישית.");}
      const response=await fetch("/api/team/access",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({userId,taskId,visitId,activityId,channel})});
      const result=await response.json();
      if(!response.ok){setLogin(response.status===401);throw Error(result.error);}
      setWhatsapp(result.whatsapp||"");
      setMessage(result.message||`ההודעה עבור ${result.recipient} מוכנה. וואטסאפ נפתח עם ההודעה; שם יש ללחוץ על שליחה.`);
      if(channel==="whatsapp"&&result.whatsapp)window.location.assign(result.whatsapp);
    }catch(error){setMessage(error.message||"לא ניתן להכין את ההודעה.");}
    finally{setBusy(false);}
  }

  return <div className="staff-access-share">
    {whatsapp?<a className="btn green" href={whatsapp}>פתיחת ההודעה בוואטסאפ שוב</a>:<button className="btn green" type="button" disabled={busy} onClick={()=>prepare("whatsapp")}>{busy?"מכין הודעה…":`שליחת כניסה בוואטסאפ${name?` ל${name}`:""}`}</button>}
    <button className="btn" type="button" disabled={busy} onClick={()=>prepare("email")}>שליחת מייל כניסה{taskId?" למשימה":""}</button>
    {message&&<p role="status" className="small">{message}</p>}
    {login&&<Link className="btn" href="/login">כניסת מנהלת</Link>}
  </div>;
}
