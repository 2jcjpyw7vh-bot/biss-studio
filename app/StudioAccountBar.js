"use client";

import Link from "next/link";
import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";
import {useStudioSession} from "./StudioSession";
import {accountArea,personalArea,publicStudioPath} from "../lib/studio-navigation";

const roles={manager:"מנהלת הסטודיו",instructor:"מדריכה",trainee:"לקוח/ה",operator:"מתפעל/ת"};

export default function StudioAccountBar(){
  const path=usePathname();
  const {user,status,message,signOut,retry}=useStudioSession();
  const menu=useRef(null);
  useEffect(()=>{
    if(menu.current)menu.current.open=false;
  },[path]);
  useEffect(()=>{
    const close=event=>{if(menu.current&&!menu.current.contains(event.target))menu.current.open=false;};
    document.addEventListener("pointerdown",close);
    return()=>document.removeEventListener("pointerdown",close);
  },[]);
  if(publicStudioPath(path)&&(!user||path.startsWith("/train/")))return null;
  const area=accountArea(user?.role,path),customerView=Boolean(user)&&area==='/my-visits';
  return <header className="studio-account-bar">
    <div className="studio-account-inner">
      <Link className="studio-brand" href={user?area:"/"} aria-label="BISS Studio — האזור האישי"><img src="/biss-logo.png" alt=""/><span>BISS <b>Studio</b></span></Link>
      <nav className="studio-account-nav" aria-label="ניווט אישי">
        {user?<>
          <Link className={`studio-personal-link ${path===area?"current":""}`} aria-current={path===area?"page":undefined} href={area}>{customerView?'האזור שלי כלקוח':'האזור האישי'}</Link>
          <details className="studio-account-menu" ref={menu} onKeyDown={event=>{if(event.key==="Escape")event.currentTarget.open=false;}}>
            <summary><span className="studio-connected">מחובר</span><strong>{user.full_name}</strong><span aria-hidden="true">⌄</span></summary>
            <div className="studio-account-dropdown">
              <strong>{user.full_name}</strong><span className="small">{roles[user.role]}</span>
              <Link href={area}>פתיחת האזור האישי</Link>
              {user.role!=='trainee'&&<Link href={customerView?personalArea(user.role):'/my-visits'}>{customerView?(user.role==='manager'?'מעבר לניהול הסטודיו':'מעבר לאזור הצוות'):'הביקורים שלי כלקוח'}</Link>}
              {user.role==="manager"&&<Link href="/login?next=account">הגדרות חשבון ו־PIN</Link>}
              <p className="small">הכניסה נשמרת במכשיר הזה ומתחדשת אוטומטית.</p>
              <button type="button" onClick={async()=>{if(await signOut())window.location.assign("/login");}}>יציאה מהחשבון</button>
              {message&&<p role="status">{message}</p>}
            </div>
          </details>
        </>:status==="loading"?<span className="small" role="status">בודק חיבור…</span>
          :status==="error"?<details className="studio-account-menu"><summary>בדיקת חיבור</summary><div className="studio-account-dropdown"><p role="status">{message}</p><button onClick={retry}>ניסיון חוזר</button><Link href="/login?switch=1">כניסה או החלפת חשבון</Link></div></details>
          :<Link className="studio-personal-link" href="/login">כניסה לאזור האישי</Link>}
      </nav>
    </div>
  </header>;
}
