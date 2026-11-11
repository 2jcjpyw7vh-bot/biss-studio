"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabase-browser";
import WorkoutTaskForm from "./WorkoutTaskForm";

const displayDate = value => new Intl.DateTimeFormat("he-IL", {timeZone:"UTC",day:"numeric",month:"numeric"}).format(new Date(`${value}T00:00:00Z`));
const matchLabels = {
  linked:"מקושר ל־Studio",
  linked_time_changed:"מקושר · המועד שונה ב־Studio",
  possible:"התאמה אפשרית לפי שם ומועד",
  ambiguous:"יותר מהתאמה אפשרית אחת",
  same_time:"אימון אחר באותו מועד ב־Studio",
  unmatched:"לא נמצאה התאמה ב־Studio",
  missing_id:"מזהה שיעור חסר",
};

function connectionStatus(result) {
  if (result.ok) return "הגישה אומתה";
  if (result.status === 401 || result.status === 403) return "הגישה נדחתה";
  return result.status ? `הבדיקה נכשלה (HTTP ${result.status})` : "לא התקבלה תשובה מארבוקס";
}

export default function ArboxPanel() {
  const [pin, setPin] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [scheduleError, setScheduleError] = useState("");
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [scheduleToken,setScheduleToken]=useState("");
  const [selectedLesson,setSelectedLesson]=useState("");

  const check = async (event) => {
    event.preventDefault();
    setChecking(true);
    setError("");
    setData(null);
    try {
      const response = await fetch("/api/integrations/arbox", {
        headers: { "x-admin-pin": pin },
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok) setData(result);
      else setError(result.error || "בדיקת החיבור נכשלה");
    } catch {
      setError("בדיקת החיבור נכשלה. אפשר לנסות שוב.");
    } finally {
      setChecking(false);
    }
  };

  const loadSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    setSchedule(null);
    setSelectedLesson("");
    setScheduleError("");
    setNeedsLogin(false);
    try {
      const client = supabaseBrowser();
      const auth = client ? await client.auth.getSession() : null;
      const token = auth?.data?.session?.access_token;
      if (!token) {
        setNeedsLogin(true);
        setScheduleError("יש להיכנס עם החשבון האישי של מנהלת Studio.");
        return;
      }
      const response = await fetch("/api/integrations/arbox?view=schedule", {
        headers: {Authorization:`Bearer ${token}`},
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok) {
        setSchedule(result);
        setScheduleToken(token);
      }
      else {
        setNeedsLogin(response.status === 401 || response.status === 403);
        setScheduleError(result.error || "טעינת הלוח נכשלה.");
      }
    } catch {
      setScheduleError("טעינת הלוח נכשלה. אפשר לנסות שוב.");
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  return <section className="panel integration-panel">
    <div className="row between">
      <div>
        <h2>חיבור Arbox</h2>
        <div className="sub">בדיקת גישה לסניפים וללוח השיעורים דרך API V3.</div>
      </div>
      <span className="tag blue">קריאה בלבד</span>
    </div>
    <div className="notice">בכניסה אישית של מנהלת אפשר לקרוא את הלוח וליצור ממנו משימת בניית אימון ב־Studio.</div>
    <form className="continuity-login" onSubmit={check}>
      <label className="field">PIN מנהל<input type="password" value={pin} onChange={e => setPin(e.target.value)} /></label>
      <button className="btn primary" disabled={!pin || checking}>{checking ? "בודק חיבור…" : "בדיקת חיבור"}</button>
    </form>
    <div role="status">
      {error && <div className="notice">{error}</div>}
      {data && <>
        <div className="continuity-kpis">
          <div><strong>{data.mappings.groups}</strong><span>קבוצות ממופות</span></div>
          <div><strong>{data.mappings.users}</strong><span>משתמשות ממופות</span></div>
          <div><strong>{data.mappings.sessions}</strong><span>אימונים ממופים</span></div>
        </div>
        {!data.configuration.validHost && <div className="notice">כתובת ה־API בשרת שונה מהכתובת הרשמית של Arbox V3.</div>}
        {!data.configuration.hasKey && <div className="notice">מפתח API טרם הוגדר בשרת Studio.</div>}
        {data.connection && <>
          <div className={data.connection.locations.ok ? "safe" : "notice"}>סניפים · {connectionStatus(data.connection.locations)}</div>
          <div className={data.connection.schedule.ok ? "safe" : "notice"}>לוח שיעורים · {connectionStatus(data.connection.schedule)}</div>
        </>}
      </>}
    </div>
    <section className="continuity-list" aria-labelledby="arbox-schedule-title">
      <h3 id="arbox-schedule-title">תצוגה מקדימה של לוח השבוע</h3>
      <p className="small">עד 20 שיעורים מהיום ובששת הימים הבאים. מוצגים פרטי השיעור ומספר הרשמות, ככל שארבוקס מספקת אותו.</p>
      <div className="row">
        <button className="btn primary" disabled={loadingSchedule} onClick={loadSchedule}>{loadingSchedule ? "טוען לוח…" : "הצגת לוח השבוע"}</button>
        {needsLogin && <Link className="btn" href="/login?next=arbox">כניסת מנהלת ללוח Arbox</Link>}
      </div>
      <div role="status">
        {scheduleError && <p className="notice">{scheduleError}</p>}
        {schedule && <>
          <p className="small">{displayDate(schedule.from)}–{displayDate(schedule.to)} · {schedule.lessons.length} שיעורים בתצוגה</p>
          {schedule.comparisonUnavailable
            ? <p className="notice">הלוח נטען, אך לא היה אפשר להשוות אותו לאימוני Studio.</p>
            : schedule.lessons.length>0&&<p className="small">השוואה ל־Studio לפי מזהה קיים, או שם ומועד. התאמה אפשרית דורשת בדיקה.</p>}
          {schedule.limited && <p className="small">ייתכן שיש שיעורים נוספים בטווח. מוצגות עד 20 רשומות.</p>}
          {schedule.skipped>0 && <p className="notice">חלק מהרשומות חסרות מועד תקין ולכן הושמטו.</p>}
          {schedule.lessons.length===0 && schedule.skipped===0 && <p>לא נמצאו שיעורים בטווח הזה.</p>}
          {schedule.lessons.map((lesson,index)=><article className="card" key={index}>
            <div className="row">
              <strong>{lesson.name}</strong>{lesson.cancelled&&<span className="tag">בוטל</span>}
              {matchLabels[lesson.match]&&<span className={`tag ${lesson.match==="linked"?"green":""}`}>{matchLabels[lesson.match]}</span>}
            </div>
            <div className="small">{displayDate(lesson.date)} · <bdi>{lesson.start}{lesson.end ? `–${lesson.end}` : ""}</bdi>{lesson.location && ` · ${lesson.location}`}</div>
            <div className="small">{lesson.capacity!==null && `קיבולת ${lesson.capacity}`}{lesson.capacity!==null && lesson.registrations!==null && " · "}{lesson.registrations!==null && `נרשמו ${lesson.registrations}`}</div>
            {!lesson.cancelled&&lesson.scheduleId&&<button className="btn" onClick={()=>setSelectedLesson(selectedLesson===lesson.scheduleId?"":lesson.scheduleId)}>בקשת בניית אימון</button>}
            {selectedLesson&&selectedLesson===lesson.scheduleId&&<WorkoutTaskForm key={lesson.scheduleId} lesson={lesson} token={scheduleToken}/>}
          </article>)}
        </>}
      </div>
    </section>
  </section>;
}
