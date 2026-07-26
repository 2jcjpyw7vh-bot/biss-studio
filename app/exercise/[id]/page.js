import Link from "next/link";
import {notFound} from "next/navigation";
import exercises from "../../../data/exercises.json";
import ExerciseActions from "../ExerciseActions";
import ExerciseMedia from "./ExerciseMedia";

export function generateStaticParams(){return exercises.map(x=>({id:x.id}))}

export async function generateMetadata({params}){
  const {id}=await params;
  const x=exercises.find(e=>e.id===id);
  if(!x)return {title:"תרגיל | BISS"};
  return {title:`${x.he} | BISS`,description:`${x.he} (${x.en}) – ${x.muscles}. ציוד: ${x.equipment}.`};
}

export default async function ExercisePage({params,searchParams}){
  const {id}=await params;
  const query=await searchParams;
  const x=exercises.find(e=>e.id===id);
  if(!x)notFound();
  const youtube=`https://www.youtube.com/results?search_query=${encodeURIComponent(`How to ${x.en} exercise`)}`;

  const fromWorkout=query?.from==="workout";

  return <main className="exercise-page v26-exercise-page">
    <header className="v26-exercise-nav">
      <Link href="/" className="v26-brand-link" aria-label="BISS"><img src="/biss-logo.png" alt="BISS"/></Link>
      <Link className="btn v26-back-btn" href={fromWorkout?"/?tab=workout":"/?tab=exercises"}>{fromWorkout?"← חזרה לאימון":"← חזרה לספרייה"}</Link>
    </header>

    <section className="v26-exercise-hero">
   <ExerciseMedia exercise={x} youtube={youtube}/>   
      <div className="v26-exercise-summary">
        <div className="eyebrow">BISS EXERCISE LIBRARY</div>
        <h1>{x.he}</h1>
        <div className="v26-en">{x.en}</div>
        <p className="v26-lead">{x.muscles}</p>
        <div className="tags v26-tags">
          <span className="tag green">{x.region}</span>
          <span className="tag blue">{x.equipment}</span>
          <span className="tag">{x.level}</span>
          <span className="tag">{x.goal}</span>
        </div>
        <div className="v26-quick-grid">
          <div><span>דפוס תנועה</span><strong>{x.pattern}</strong></div>
          <div><span>ציוד</span><strong>{x.equipment}</strong></div>
          <div><span>רמה</span><strong>{x.level}</strong></div>
        </div>
      </div>
    </section>

    <section className="v26-content-grid">
      <article className="v26-card v26-cue-card"><div className="v26-card-icon">✓</div><div><h3>דגש לביצוע</h3><p>{x.cue}</p></div></article>
      {x.regression&&<article className="v26-card"><div className="v26-card-icon">−</div><div><h3>קל יותר</h3><p>{x.regression}</p></div></article>}
      {x.progression&&<article className="v26-card"><div className="v26-card-icon">＋</div><div><h3>מתקדם יותר</h3><p>{x.progression}</p></div></article>}
    </section>

    {x.safety&&<section className="v26-safety"><div className="v26-safety-icon">!</div><div><strong>בטיחות והתאמה</strong><p>{x.safety}</p><span>בכאב, מגבלה, הריון או הנחיה רפואית — המדריכה מתאימה את התרגיל לפי המצב בפועל. הדף אינו אבחון רפואי.</span></div></section>}

    <section className="v26-action-panel">
      <div><div className="eyebrow">SHARE & PRACTICE</div><h3>הדגמה ושיתוף</h3><p className="small">פתחו הדגמה או שתפו את דף התרגיל ישירות.</p></div>
      <div className="v26-action-buttons">
        <a className="btn primary" href={youtube} target="_blank" rel="noreferrer">▶ סרטון הדגמה</a>
        <ExerciseActions exercise={x}/>
      </div>
    </section>
    <footer className="footer">BISS · ספריית תרגילים</footer>
  </main>;
}
