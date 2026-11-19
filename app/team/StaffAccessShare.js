"use client";

import Link from "next/link";
import {useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";

export default function StaffAccessShare({userId,taskId,name,token}) {
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
      if(!accessToken){setLogin(true);throw Error("יש להיכנס לחשבון המנהלת האישי כדי לשלוח כניסה למדריכה.");}
      const response=await fetch("/api/team/access",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({userId,taskId,channel})});
      const result=await response.json();
      if(!response.ok){setLogin(response.status===401);throw Error(result.error);}
      setWhatsapp(result.whatsapp||"");
      setMessage(result.message||`ההודעה האישית עבור ${result.recipient} מוכנה. פתחי וואטסאפ ושלחי אותה בשיחה.`);
    }catch(error){setMessage(error.message||"לא ניתן להכין את ההודעה.");}
    finally{setBusy(false);}
  }

  return <div>
    <button className="btn green" type="button" disabled={busy} onClick={()=>prepare("whatsapp")}>{busy?"מכין כניסה…":`הכנת כניסה אישית בוואטסאפ${name?` ל${name}`:""}`}</button>
    <button className="btn" type="button" disabled={busy} onClick={()=>prepare("email")}>שליחת מייל כניסה{taskId?" למשימה":""}</button>
    {whatsapp&&<a className="btn primary" href={whatsapp} target="_blank" rel="noreferrer">פתיחת וואטסאפ לשליחת הכניסה</a>}
    {message&&<p role="status" className="small">{message}</p>}
    {login&&<Link className="btn" href="/login">כניסת מנהלת</Link>}
  </div>;
}
