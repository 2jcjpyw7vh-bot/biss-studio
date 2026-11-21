"use client";
import StudioSocialLinks from "../StudioSocialLinks";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";
import {existingLoginAction,loginEntryDestination, loginTarget} from "../../lib/studio-login";
import {resendWait,pendingLoginKey,pendingLoginRequest,loginFlowError} from '../../lib/login-email-flow';

const roleLabels={manager:"מנהלת",instructor:"מדריכה",trainee:"לקוח/ה",operator:"מתפעל/ת"};

async function studioProfile(session) {
  const response = await fetch("/api/me", {
    headers:{Authorization:`Bearer ${session.access_token}`},
    cache:"no-store"
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "לא ניתן לאמת את הכניסה.");
  return result.user;
}

export default function LoginPage() {
  const client = supabaseBrowser();
  const [email,setEmail] = useState("");
  const [code,setCode] = useState("");
  const [message,setMessage] = useState("");
  const [profile,setProfile] = useState(null);
  const [accessToken,setAccessToken] = useState("");
  const [pin,setPin] = useState("");
  const [pinConfirm,setPinConfirm] = useState("");
  const [busy,setBusy] = useState(false);
  const [checking,setChecking] = useState(true);
  const [blocked,setBlocked] = useState(false);
  const [showCode,setShowCode] = useState(false);
  const [tokenHash,setTokenHash] = useState("");
  const [next,setNext] = useState("");
  const [checkFailed,setCheckFailed] = useState(false);
  const [checkAttempt,setCheckAttempt] = useState(0);
  const [sentAt,setSentAt]=useState(0),[clock,setClock]=useState(Date.now());
  const [verifyUntil,setVerifyUntil]=useState(0);
  const sending=useRef(false);
  const verifying=useRef(false);
  const resendSeconds=resendWait(sentAt,clock);
  const verifySeconds=Math.max(0,Math.ceil((verifyUntil-clock)/1000));
  useEffect(()=>{if(!sentAt&&!verifyUntil)return;const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[sentAt,verifyUntil]);
  function clearPending(target=next){try{sessionStorage.removeItem(pendingLoginKey(target));}catch{}}
  function changeEmail(){clearPending();setCode('');setShowCode(false);setMessage('הזיני את הכתובת הנכונה ושלחי אליה קוד חדש.');}

  async function finish(session, target, verifiedUser) {
    const user = verifiedUser || await studioProfile(session);
    clearPending(target);
    const destination = loginEntryDestination(target,user.role);
    if (destination) {
      window.location.replace(destination);
      return;
    }
    setProfile(user);
    setAccessToken(session.access_token);
    if(!target)setMessage('הכניסה הושלמה. אפשר לבחור את הביקורים שלך כלקוח או את אזור העבודה שלך, באותו חשבון.');
    if (target === "arbox") setMessage("לוח ארבוקס זמין רק למנהלת Studio. אפשר לצאת ולהיכנס בחשבון מנהלת.");
  }

  useEffect(() => {
    let active=true;
    setChecking(true);
    setCheckFailed(false);
    const url = new URL(window.location.href);
    const target = loginTarget(url.searchParams.get("next"));
    const fragment = new URLSearchParams(url.hash.slice(1));
    setNext(target);
    if (!client) { setChecking(false); return; }
    const hash = fragment.get("token_hash");
    if(!hash&&!fragment.has('error')&&!url.searchParams.has('error')){
      try{const pending=pendingLoginRequest(sessionStorage.getItem(pendingLoginKey(target)),target);if(pending){setEmail(pending.email);setSentAt(pending.sentAt);setShowCode(true);}}catch{}
    }
    if (hash) {
      window.history.replaceState(null, "", url.pathname + url.search);
      if (/^[A-Za-z0-9_-]{20,200}$/.test(hash)) setTokenHash(hash);
      else setMessage("קישור הכניסה אינו תקף. אפשר להשתמש בקוד מהמייל או לבקש הודעה חדשה.");
    }
    if (fragment.has("error") || url.searchParams.has("error")) {
      setMessage("קישור הכניסה אינו זמין. הזיני את כתובת המייל ושלחי קוד חדש כדי להמשיך.");
      setShowCode(false);
    }
    async function check() {
      const {data,error} = await client.auth.getSession();
      if(!active)return;
      if (error) throw error;
      if (data.session) {
        setBlocked(true);
        const user=await studioProfile(data.session);
        if(!active)return;
        const action=existingLoginAction(user.id,url.searchParams.get('account'),url.searchParams.get('switch')==='1');
        if (action !== 'reuse') {
          setProfile(user);
          setAccessToken(data.session.access_token);
          setMessage(action==='other-account'?"הקישור נשלח לחשבון אחר. החיבור הנוכחי נשמר; כדי לעבור אליו השתמשי בקישור האישי או בהחלפת חשבון.":"את מחוברת כבר. אפשר להמשיך בחשבון הזה או לבחור יציאה והחלפת חשבון.");
          if(action==='other-account'&&hash)setBlocked(false);
        } else await finish(data.session, target,user);
      }
    }
    check().catch(error => {if(active){setCheckFailed(true);setMessage(error.message || "לא ניתן לבדוק את הכניסה כרגע. החיבור השמור לא נמחק.");}}).finally(() => {if(active)setChecking(false);});
    return()=>{active=false;};
  }, [client,checkAttempt]);

  async function sendLink(event) {
    event.preventDefault();
    if(sending.current||resendWait(sentAt)>0)return;
    sending.current=true;
    setBusy(true);
    setMessage("");
    setCode('');
    try {
      const redirect = new URL("/login", window.location.origin);
      if (next) redirect.searchParams.set("next", next);
      const {error} = await client.auth.signInWithOtp({
        email:email.trim().toLowerCase(),
        options:{shouldCreateUser:true,emailRedirectTo:redirect.href}
      });
      if (error) {
        setMessage(loginFlowError(error,'send'));
        if(error.status===429){setSentAt(Date.now());setClock(Date.now());}
        return;
      }
      setShowCode(true);
      const sent=Date.now();setSentAt(sent);setClock(sent);setEmail(email.trim().toLowerCase());
      try{sessionStorage.setItem(pendingLoginKey(next),JSON.stringify({email:email.trim().toLowerCase(),target:next,sentAt:sent}));}catch{}
      setMessage("הבקשה לשליחת קוד התקבלה. פתחי את המייל האחרון מ־BISS Studio והעתיקי את הקוד לכאן. ייתכן שהגעת המייל תימשך מעט זמן.");
    } catch {
      setMessage("שליחת מייל הכניסה נכשלה. אפשר לנסות שוב.");
    } finally {
      setBusy(false);
      sending.current=false;
    }
  }

  async function verify(credentials) {
    if(verifying.current||Date.now()<verifyUntil)return;
    verifying.current=true;
    setBusy(true);
    setMessage("");
    let authenticated=false;
    try {
      const {data,error} = await client.auth.verifyOtp({...credentials,type:"email"});
      if (error || !data.session) {
        const throttled=error?.status===429||['over_request_rate_limit','over_email_send_rate_limit'].includes(error?.code);
        if(!throttled)setTokenHash("");
        if(throttled){setVerifyUntil(Date.now()+60000);setClock(Date.now());}
        setCode('');
        setShowCode(Boolean(email));
        setMessage(loginFlowError(error,'verify'));
        return;
      }
      setBlocked(true);
      authenticated=true;
      await finish(data.session, next);
    } catch (error) {
      if(authenticated)setCheckFailed(true);
      setMessage(error.message || "לא ניתן להשלים את הכניסה.");
    } finally {
      setBusy(false);
      verifying.current=false;
    }
  }

  async function resetPin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pin", {
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},
        body:JSON.stringify({pin,confirm:pinConfirm})
      });
      const result = await response.json();
      setMessage(response.ok ? `✓ ${result.message}` : result.error || "איפוס ה-PIN נכשל");
      if (response.ok) { setPin(""); setPinConfirm(""); }
    } catch {
      setMessage("איפוס ה-PIN נכשל. אפשר לנסות שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const {error} = await client.auth.signOut({scope:"local"});
    if (error) { setMessage("היציאה נכשלה. אפשר לנסות שוב."); return; }
    setProfile(null);
    clearPending();
    setShowCode(false);
    setCheckFailed(false);
    setVerifyUntil(0);
    setAccessToken("");
    setTokenHash("");
    setBlocked(false);
    setCode("");
    setMessage("יצאת מהמערכת.");
  }

  return <main className="shell auth-shell"><section className="panel auth-card">
    <div className="eyebrow">BISS STUDIO · כניסה אישית</div>
    <h1>{next==="account"?"הגדרות החשבון":next === "arbox" ? "כניסת מנהלת ללוח Arbox" : "כניסה אישית ל־BISS Studio"}</h1>
    {!profile&&<p className="sub">נשלח קוד למייל הרשום בסטודיו. לאחר הכניסה החיבור נשמר בדפדפן הזה כל עוד הוא תקף.</p>}
    {!client && <div className="notice">שירות הכניסה של BISS Studio אינו זמין כרגע.</div>}
    {client && checking && <p role="status">בודק כניסה קיימת…</p>}
    {client && !checking && checkFailed && <button className="btn primary" onClick={()=>setCheckAttempt(n=>n+1)}>בדיקה חוזרת של החיבור השמור</button>}
    {client && !checking && !checkFailed && !blocked && tokenHash && <div className="safe">
      <button className="btn primary" disabled={busy||verifySeconds>0} onClick={() => verify({token_hash:tokenHash})}>{verifySeconds>0?`אפשר לנסות שוב בעוד ${verifySeconds} שנ׳`:'אישור כניסה ל־BISS Studio'}</button>
      <button className="btn" disabled={busy} onClick={() => {setTokenHash("");setShowCode(false);setCode('');setMessage('הזיני את כתובת המייל ושלחי קוד חדש כדי להמשיך.');}}>בקשת קוד חדש למייל</button>
    </div>}
    {client && !checking && !checkFailed && !blocked && !tokenHash && <>
      {!showCode?<form onSubmit={sendLink}>
        <p className="login-step">שלב 1 מתוך 2 · לאן לשלוח את הקוד?</p>
        <label className="field">כתובת המייל הרשומה<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
        <button className="btn primary" disabled={busy||resendSeconds>0}>{busy?'שולח קוד…':resendSeconds>0?`אפשר לשלוח שוב בעוד ${resendSeconds} שנ׳`:'שליחת קוד למייל'}</button>
      </form>:<div className="login-code-step">
      <p className="login-step">שלב 2 מתוך 2 · הקוד מהמייל האחרון</p>
      <p>הקוד נשלח לכתובת <strong dir="ltr">{email}</strong></p>
      <p className="small">פתחי את ההודעה האחרונה מ־BISS Studio, בדקי את שעת השליחה והעתיקי את כל ספרות הקוד. אין להשתמש בקודים מהודעות קודמות. אין צורך לבקש מייל נוסף בזמן ההמתנה.</p>
      <form onSubmit={event => {event.preventDefault();verify({email:email.trim().toLowerCase(),token:code});}}>
        <label className="field">הקוד מההודעה האחרונה<input autoFocus inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code} maxLength={10} onChange={e=>setCode(e.target.value.replace(/\D/g,""))}/></label>
        <button className="btn primary" disabled={busy || !email || code.length < 6||verifySeconds>0}>{verifySeconds>0?`אפשר לנסות שוב בעוד ${verifySeconds} שנ׳`:'אימות קוד וכניסה'}</button>
      </form><details><summary>המייל לא הגיע או שהקוד לא עובד?</summary><p className="small">בדקי דואר זבל ואת הכתובת שמופיעה למעלה. אם התקבלו כמה הודעות, השתמשי באחרונה בלבד. שליחה חוזרת עשויה לחייב המתנה נוספת אצל ספק הכניסה.</p><button type="button" className="btn" disabled={busy||resendSeconds>0} onClick={sendLink}>{resendSeconds>0?`אפשר לשלוח קוד חדש בעוד ${resendSeconds} שנ׳`:'שליחת קוד חדש לאותה כתובת'}</button><button type="button" className="btn" disabled={busy} onClick={changeEmail}>שינוי כתובת המייל</button></details>
      </div>}
    </>}
    {!profile&&!checking&&<p className="small">באייפון מומלץ לפתוח תמיד ב־Safari באותו דפדפן, או לשמור קיצור למסך הבית. דפדפן פנימי של וואטסאפ, גלישה פרטית או מחיקת נתוני האתר עשויים לדרוש כניסה נפרדת.</p>}
    {profile && <div className="safe"><strong>שלום {profile.full_name}</strong><p>תפקיד: {roleLabels[profile.role] || profile.role}</p>
      {profile.role!=='trainee'&&<Link className="btn primary" href="/my-visits">כניסה לאזור שלי כלקוח</Link>}
      {profile.role === "operator" ? <Link className="btn primary" href="/operations">הפעילויות שלי</Link> : profile.role === "trainee" ? <Link className="btn primary" href="/my-visits">הביקורים שלי</Link> : <Link className="btn primary" href="/my-sessions">האימונים שלי</Link>}
    </div>}
    {blocked && !checking && <button className="btn" disabled={busy} onClick={signOut}>יציאה והחלפת חשבון</button>}
    {profile?.role === "manager" && next==='account' && <form className="pin-reset-card" onSubmit={resetPin}>
      <h2>איפוס PIN מנהל</h2><div className="sub">בחרי PIN חדש בן 6 ספרות.</div>
      <label className="field">PIN חדש<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))}/></label>
      <label className="field">אימות PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,""))}/></label>
      <button className="btn primary" disabled={busy || pin.length!==6 || pinConfirm.length!==6}>שמירת PIN חדש</button>
    </form>}
    {message && <div role="status" className={message.startsWith("נשלחה") || message.startsWith("✓") ? "safe" : "notice"}>{message}</div>}
    <Link className="btn" href="/">חזרה למערכת</Link>
  </section><StudioSocialLinks/></main>;
}
