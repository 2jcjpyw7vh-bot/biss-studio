"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import BoneDemoLinks from "../exercise/BoneDemoLinks";
import { boneDemos } from "../../lib/bone-strength";

export default function SavedWorkoutLibrary({client}) {
  const [workouts, setWorkouts] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!client) return;
    const controller = new AbortController();
    async function load() {
      const {data} = await client.auth.getSession();
      if (!data.session) return;
      const response = await fetch("/api/saved-workouts", {
        headers:{Authorization:`Bearer ${data.session.access_token}`},
        cache:"no-store",
        signal:controller.signal
      });
      const result = await response.json();
      if (response.ok) setWorkouts(result.workouts);
      else setMessage(result.error);
    }
    load().catch(() => {
      if (!controller.signal.aborted) setMessage("לא ניתן לטעון את הספרייה. אפשר לרענן ולנסות שוב.");
    });
    return () => controller.abort();
  }, [client]);

  if (!workouts && !message) return null;
  return <section className="panel" id="saved-workouts">
    <h2>אימונים ששמרתי</h2>
    {message && <p role="status" className="notice">{message}</p>}
    {workouts?.length === 0 && <p className="sub">כשתלחצי על ״שמירה לאימונים שלי״ באימון שבנית, הוא יופיע כאן.</p>}
    {workouts?.map(({id, workout_payload:plan, saved_at:savedAt}) => <details key={id} className="card">
      <summary><strong>{plan.title || "אימון BISS"}</strong> <span className="small">· {new Date(savedAt).toLocaleDateString("he-IL", {timeZone:"Asia/Jerusalem"})}</span></summary>
      <p className="sub">{plan.meta}</p>
      {/^https:\/\//i.test(plan.musicUrl) && <a href={plan.musicUrl} target="_blank" rel="noreferrer">{plan.musicTitle || "פלייליסט האימון"}</a>}
      {plan.warm.length > 0 && <><h3>חימום</h3><ul>{plan.warm.map((step,index) => <li key={index}>{step}</li>)}</ul></>}
      <h3>תוכנית האימון</h3>
      {plan.exercises.map((exercise,index) => {
        const section = plan.sections.find(item => item.start === index);
        return <Fragment key={index}>
          {section && <><h4>{section.title}</h4><p className="small">{section.detail}</p>
            {section.title.startsWith("בלוק 2") && plan.transitionMinutes > 0 && <p className="small">{plan.transitionMinutes} דק׳ מעבר בין הבלוקים</p>}</>}
          <p><strong>{index + 1}. {exercise.he}</strong> · {exercise.prescription}<br/>{exercise.cue} {exercise.allocation}
          {exercise.equipment && <span className="small"> · {exercise.equipment}</span>}
          {exercise.supersetGroup && <span className="small"> · סופר סט {exercise.supersetGroup}{exercise.supersetSlot}</span>}
          {exercise.id && <> · <Link href={`/exercise/${encodeURIComponent(exercise.id)}`} target="_blank" rel="noopener noreferrer">פתיחת תרגיל</Link></>}</p>
        </Fragment>;
      })}
      <BoneDemoLinks demos={boneDemos(plan)}/>
      {plan.cool.length > 0 && <><h3>שחרור</h3><ul>{plan.cool.map((step,index) => <li key={index}>{step}</li>)}</ul></>}
    </details>)}
  </section>;
}
