"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function SavePersonalWorkout({workout}) {
  const id = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const client = supabaseBrowser();
      if (!client) throw new Error("הכניסה האישית עדיין לא הופעלה.");
      const {data} = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setNeedsLogin(true);
        return;
      }
      setNeedsLogin(false);
      id.current ||= workout.saveId || crypto.randomUUID();
      const response = await fetch("/api/saved-workouts", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({id:id.current, workout})
      });
      const result = await response.json();
      if (response.status === 401) setNeedsLogin(true);
      if (!response.ok) throw new Error(result.error || "השמירה נכשלה");
      setSaved(true);
      setMessage("האימון נשמר בספרייה האישית שלך.");
    } catch (error) {
      setMessage(error.message || "השמירה נכשלה. אפשר לנסות שוב.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <button type="button" className="btn primary" onClick={save} disabled={busy || saved}>{busy ? "שומר…" : saved ? "האימון נשמר" : "שמירה לאימונים שלי"}</button>
    <div role="status">
      {message && <p className="small">{message}</p>}
      {needsLogin && <p className="small"><Link href="/login" target="_blank" rel="noopener noreferrer">כניסה אישית בלשונית חדשה</Link>. לאחר הכניסה חזרי לכאן ולחצי שוב על שמירה.</p>}
      {saved && <Link href="/my-sessions#saved-workouts">לספריית האימונים שלי</Link>}
    </div>
  </div>;
}
