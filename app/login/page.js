"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";

const roleLabels={manager:"מנהלת",instructor:"מדריכה",trainee:"מתאמנת"};

export default function LoginPage(){
 const[email,setEmail]=useState(""),[message,setMessage]=useState(""),[profile,setProfile]=useState(null),[accessToken,setAccessToken]=useState(""),[pin,setPin]=useState(""),[pinConfirm,setPinConfirm]=useState(""),[busy,setBusy]=useState(false);
 const client=supabaseBrowser();
 const loadProfile=async session=>{if(!session?.access_token)return;setAccessToken(session.access_token);const r=await fetch("/api/me",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"}),d=await r.json();if(r.ok)setProfile(d.user);else setMessage(d.error)};
 useEffect(()=>{if(!client)return;client.auth.getSession().then(({data})=>loadProfile(data.session));const{data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>loadProfile(session));return()=>subscription.unsubscribe()},[client]);
 const sendLink=async e=>{e.preventDefault();if(!client)return;setBusy(true);setMessage("");const{error}=await client.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{shouldCreateUser:true,emailRedirectTo:`${window.location.origin}/login`}});setMessage(error?"לא ניתן לשלוח קישור. ודאי שהכתובת רשומה בצוות Studio.":"קישור כניסה חד־פעמי נשלח למייל.");setBusy(false)};
 const resetPin=async e=>{e.preventDefault();setBusy(true);setMessage("");const r=await fetch("/api/admin/pin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({pin,confirm:pinConfirm})}),d=await r.json();setMessage(r.ok?`✓ ${d.message}`:d.error||"איפוס ה-PIN נכשל");if(r.ok){setPin("");setPinConfirm("")}setBusy(false)};
 const signOut=async()=>{await client?.auth.signOut();setProfile(null);setAccessToken("");setMessage("יצאת מהמערכת.")};
 return <main className="shell auth-shell"><section className="panel auth-card">
  <div className="eyebrow">BISS STUDIO · כניסה לצוות</div>
  <h1>כניסה אישית</h1>
  <div className="sub">קישור חד־פעמי נשלח למייל הרשום. אין צורך בסיסמה.</div>
  {client&&!profile&&<div className="safe"><strong>שכחת את PIN המנהל?</strong><div className="small">היכנס עם מייל המנהל הרשום. לאחר פתיחת הקישור במייל יוצג כאן מסך לבחירת PIN חדש.</div></div>}
  {!client&&<div className="notice">הכניסה האישית הושהתה כדי למנוע מעבר למערכת Vineyard. היא תופעל רק לאחר חיבור הזדהות נפרד ומאומת של Studio.</div>}
  {client&&profile&&<><div className="safe"><strong>שלום {profile.full_name}</strong><p>תפקיד: {roleLabels[profile.role]||profile.role}</p>{profile.role!=="trainee"?<Link className="btn primary" href="/my-sessions">האימונים שלי</Link>:<Link className="btn primary" href="/my-program">התוכנית שלי</Link>}<button className="btn" onClick={signOut}>יציאה</button></div>{profile.role==="manager"&&<form className="pin-reset-card" onSubmit={resetPin}><h2>איפוס PIN מנהל</h2><div className="sub">הזיהוי בוצע באמצעות הקישור החד־פעמי למייל. בחרי PIN חדש בן 6 ספרות.</div><label className="field">PIN חדש<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))}/></label><label className="field">אימות PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,6))}/></label><button className="btn primary" disabled={busy||pin.length!==6||pinConfirm.length!==6}>{busy?"שומר…":"שמירת PIN חדש"}</button></form>}</>}
  {client&&!profile&&<form onSubmit={sendLink}><label className="field">כתובת המייל הרשומה<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><button className="btn primary" disabled={busy}>{busy?"שולח…":"שליחת קישור כניסה"}</button></form>}
  {message&&<div className={message.includes("נשלח")||message.startsWith("✓")?"safe":"notice"}>{message}</div>}
  <Link className="btn" href="/">חזרה למערכת</Link>
 </section></main>
}

