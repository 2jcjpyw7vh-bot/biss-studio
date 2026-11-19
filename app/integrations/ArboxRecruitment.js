"use client";
import {useState} from "react";
import {studioAdminHeaders} from "../../lib/studio-admin-client";
import RecruitmentPanel from "../team/RecruitmentPanel";
export default function ArboxRecruitment({lesson}){
  const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function open(){setBusy(true);setMessage("");try{
    const response=await fetch("/api/recruitment/arbox",{method:"POST",headers:await studioAdminHeaders(),body:JSON.stringify({scheduleId:lesson.scheduleId})});
    const result=await response.json();if(!response.ok)throw Error(result.error);setData(result);
  }catch(error){setMessage(error.message||"לא ניתן לפתוח גיוס");}finally{setBusy(false);}}
  return <div><button className="btn primary" disabled={busy} onClick={()=>data?setData(null):open()}>{busy?"בודק שיבוץ עדכני…":data?"סגירת הגיוס":"מציאת מדריכה / הכנת מודעה"}</button>
    {message&&<p role="status" className="notice">{message}</p>}
    {data&&<><p className="small">השיעור נשמר ב־Studio לצורך גיוס. השיבוץ בארבוקס מתעדכן בנפרד על ידי המנהל.</p><RecruitmentPanel embedded users={data.users} sessions={[data.session]} initialSessionId={data.session.id}/></>}
  </div>;
}
