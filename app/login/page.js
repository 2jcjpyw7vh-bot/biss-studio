"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";

const roleLabels={manager:"מנהלת",instructor:"מדריכה",trainee:"מתאמנת"};

export default function LoginPage(){
 const[email,setEmail]=useState(""),[message,setMessage]=useState(""),[profile,setProfile]=useState(null),[busy,setBusy]=useState(false);
 const client=supabaseBrowser();
 const loadProfile=async session=>{if(!session?.access_token)return;const r=await fetch("/api/me",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"}),d=await r.json();if(r.ok)setProfile(d.user);else setMessage(d.error)};
 useEffect(()=>{if(!client)return;client.auth.getSession().then(({data})=>loadProfile(data.session));const{data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>loadProfile(session));return()=>subscription.unsubscribe()},[client]);
 const sendLink=async e=>{e.preventDefault();if(!client)return;setBusy(true);setMessage("");const{error}=await client.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{shouldCreateUser:false,emailRedirectTo:`${window.location.origin}/login`}});setMessage(error?"לא ניתן לשלוח קישור. ודאי שהכתובת רשומה בצוות Studio.":"קישור כניסה חד־פעמי נשלח למייל.");setBusy(false)};
 const signOut=async()=>{await client?.auth.signOut();setProfile(null);setMessage("יצאת מהמערכת.")};
 return <main className="shell auth-shell"><section className="panel auth-card">
  <div className="eyebrow">BISS STUDIO · כניסה לצוות</div>
  <h1>כניסה אישית</h1>
  <div className="sub">קישור חד־פעמי נשלח למייל הרשום. אין צורך בסיסמה.</div>
  {!client&&<div className="notice">הכניסה האישית מוכנה בקוד ותופעל לאחר הוספת המפתח הציבורי של Studio ב‑Vercel.</div>}
  {client&&profile&&<div className="safe"><strong>שלום {profile.full_name}</strong><p>תפקיד: {roleLabels[profile.role]||profile.role}</p>{profile.role!=="trainee"&&<Link className="btn primary" href="/my-sessions">האימונים שלי</Link>}<button className="btn" onClick={signOut}>יציאה</button></div>}
  {client&&!profile&&<form onSubmit={sendLink}><label className="field">כתובת המייל הרשומה<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><button className="btn primary" disabled={busy}>{busy?"שולח…":"שליחת קישור כניסה"}</button></form>}
  {message&&<div className={message.includes("נשלח")?"safe":"notice"}>{message}</div>}
  <Link className="btn" href="/">חזרה למערכת</Link>
 </section></main>
}

