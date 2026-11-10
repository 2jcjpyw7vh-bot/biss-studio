"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";
import {loginDestination, loginTarget} from "../../lib/studio-login";

const roleLabels={manager:"מנהלת",instructor:"מדריכה",trainee:"מתאמנת"};

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

  async function finish(session, target) {
    const user = await studioProfile(session);
    const destination = loginDestination(target, user.role);
    if (destination) {
      window.location.replace(destination);
      return;
    }
    setProfile(user);
    setAccessToken(session.access_token);
    if (target === "arbox") setMessage("לוח ארבוקס זמין רק למנהלת Studio. אפשר לצאת ולהיכנס בחשבון מנהלת.");
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const target = loginTarget(url.searchParams.get("next"));
    const fragment = new URLSearchParams(url.hash.slice(1));
    setNext(target);
    if (!client) { setChecking(false); return; }
    const hash = fragment.get("token_hash");
    if (hash) {
      window.history.replaceState(null, "", url.pathname + url.search);
      if (/^[A-Za-z0-9_-]{20,200}$/.test(hash)) setTokenHash(hash);
      else setMessage("קישור הכניסה אינו תקף. אפשר להשתמש בקוד מהמייל או לבקש הודעה חדשה.");
      setChecking(false);
      return;
    }
    if (fragment.has("error") || url.searchParams.has("error")) {
      setMessage("קישור הכניסה פג או כבר נפתח. הזיני את הקוד מהמייל אם הוא עדיין בתוקף, או בקשי הודעה חדשה.");
      setShowCode(true);
    }
    async function check() {
      const {data,error} = await client.auth.getSession();
      if (error) throw error;
      if (data.session) {
        setBlocked(true);
        await finish(data.session, target);
      }
    }
    check().catch(error => setMessage(error.message || "לא ניתן לבדוק את הכניסה.")).finally(() => setChecking(false));
  }, [client]);

  async function sendLink(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const redirect = new URL("/login", window.location.origin);
      if (next) redirect.searchParams.set("next", next);
      const {error} = await client.auth.signInWithOtp({
        email:email.trim().toLowerCase(),
        options:{shouldCreateUser:true,emailRedirectTo:redirect.href}
      });
      if (error) {
        setMessage(error.status === 429
          ? "נשלחו לאחרונה יותר מדי בקשות. המתיני לפני ניסיון נוסף או השתמשי בהודעה שכבר קיבלת."
          : "שליחת מייל הכניסה נכשלה. בדקי שזו הכתובת הרשומה ב־BISS Studio.");
        return;
      }
      setShowCode(true);
      setMessage("נשלחה הודעה מ־BISS Studio. אפשר לפתוח את הקישור במייל או להזין כאן את הקוד שמופיע בו.");
    } catch {
      setMessage("שליחת מייל הכניסה נכשלה. אפשר לנסות שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(credentials) {
    setBusy(true);
    setMessage("");
    try {
      const {data,error} = await client.auth.verifyOtp({...credentials,type:"email"});
      if (error || !data.session) {
        setTokenHash("");
        setShowCode(true);
        setMessage("קוד או קישור הכניסה פג, שגוי או שכבר נעשה בו שימוש. אפשר לבקש הודעה חדשה.");
        return;
      }
      setBlocked(true);
      await finish(data.session, next);
    } catch (error) {
      setMessage(error.message || "לא ניתן להשלים את הכניסה.");
    } finally {
      setBusy(false);
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
    setAccessToken("");
    setTokenHash("");
    setBlocked(false);
    setCode("");
    setMessage("יצאת מהמערכת.");
  }

  return <main className="shell auth-shell"><section className="panel auth-card">
    <div className="eyebrow">BISS STUDIO · כניסה אישית</div>
    <h1>{next === "arbox" ? "כניסת מנהלת ללוח Arbox" : "כניסה אישית ל־BISS Studio"}</h1>
    <p className="sub">השתמשי בכתובת שרשומה בסטודיו. אפשר להיכנס בקישור או בקוד חד־פעמי מהמייל.</p>
    {!client && <div className="notice">שירות הכניסה של BISS Studio אינו זמין כרגע.</div>}
    {client && checking && <p role="status">בודק כניסה קיימת…</p>}
    {client && !checking && !blocked && tokenHash && <div className="safe">
      <button className="btn primary" disabled={busy} onClick={() => verify({token_hash:tokenHash})}>אישור כניסה ל־BISS Studio</button>
      <button className="btn" disabled={busy} onClick={() => {setTokenHash("");setShowCode(true);}}>כניסה עם קוד</button>
    </div>}
    {client && !checking && !blocked && !tokenHash && <>
      <form onSubmit={sendLink}>
        <label className="field">כתובת המייל הרשומה<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
        <button className="btn primary" disabled={busy}>{showCode?"שליחת הודעת כניסה חדשה":"שליחת הודעת כניסה"}</button>
        {!showCode && <button type="button" className="btn" disabled={busy} onClick={() => setShowCode(true)}>כבר יש לי קוד</button>}
      </form>
      {showCode && <form onSubmit={event => {event.preventDefault();verify({email:email.trim().toLowerCase(),token:code});}}>
        <label className="field">קוד מהמייל<input inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code} maxLength={10} onChange={e=>setCode(e.target.value.replace(/\D/g,""))}/></label>
        <button className="btn primary" disabled={busy || !email || code.length < 6}>אימות קוד וכניסה</button>
      </form>}
    </>}
    {profile && <div className="safe"><strong>שלום {profile.full_name}</strong><p>תפקיד: {roleLabels[profile.role] || profile.role}</p>
      {profile.role === "trainee" ? <Link className="btn primary" href="/my-program">התוכנית שלי</Link> : <Link className="btn primary" href="/my-sessions">האימונים שלי</Link>}
    </div>}
    {blocked && !checking && <button className="btn" disabled={busy} onClick={signOut}>יציאה והחלפת חשבון</button>}
    {profile?.role === "manager" && <form className="pin-reset-card" onSubmit={resetPin}>
      <h2>איפוס PIN מנהל</h2><div className="sub">בחרי PIN חדש בן 6 ספרות.</div>
      <label className="field">PIN חדש<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))}/></label>
      <label className="field">אימות PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,""))}/></label>
      <button className="btn primary" disabled={busy || pin.length!==6 || pinConfirm.length!==6}>שמירת PIN חדש</button>
    </form>}
    {message && <div role="status" className={message.startsWith("נשלחה") || message.startsWith("✓") ? "safe" : "notice"}>{message}</div>}
    <Link className="btn" href="/">חזרה למערכת</Link>
  </section></main>;
}
