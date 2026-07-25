import Link from "next/link";
import {notFound} from "next/navigation";
import exercises from "../../../data/exercises.json";
import ExerciseActions from "../ExerciseActions";

export function generateStaticParams(){return exercises.map(x=>({id:x.id}))}

export async function generateMetadata({params}){
  const {id}=await params;
  const x=exercises.find(e=>e.id===id);
  if(!x)return {title:"תרגיל | BISS"};
  return {title:`${x.he} | BISS`,description:`${x.he} (${x.en}) – ${x.muscles}. ציוד: ${x.equipment}.`};
}

export default async function ExercisePage({params}){
  const {id}=await params;
  const x=exercises.find(e=>e.id===id);
  if(!x)notFound();
  const youtube=`https://www.youtube.com/results?search_query=${encodeURIComponent(`How to ${x.en} exercise`)}`;
  return <main className="share-shell exercise-page">
    <header className="share-brand">
      <Link href="/" aria-label="חזרה ל-BISS"><img src="/biss-logo.png" alt="BISS"/></Link>
    </header>
    <section className="share-card exercise-detail">
      <div className="row between detail-heading">
        <div>
          <div className="eyebrow">BISS EXERCISE LIBRARY</div>
          <h1>{x.he}</h1>
          <div className="sub">{x.en}</div>
        </div>
        <Link className="btn" href="/?tab=exercises">חזרה לספרייה</Link>
      </div>

      <div className="tags detail-tags">
        <span className="tag green">{x.region}</span>
        <span className="tag blue">{x.equipment}</span>
        <span className="tag">{x.level}</span>
        <span className="tag">{x.goal}</span>
      </div>

      <div className="detail-grid">
        <section className="detail-block"><h3>מה עובד</h3><p>{x.muscles}</p></section>
        <section className="detail-block"><h3>דפוס תנועה</h3><p>{x.pattern}</p></section>
        <section className="detail-block wide"><h3>דגש לביצוע</h3><p>{x.cue}</p></section>
        {x.regression&&<section className="detail-block"><h3>קל יותר</h3><p>{x.regression}</p></section>}
        {x.progression&&<section className="detail-block"><h3>מתקדם יותר</h3><p>{x.progression}</p></section>}
      </div>

      {x.safety&&<div className="notice detail-safety"><strong>⚠️ בטיחות והתאמה</strong><div>{x.safety}</div><div className="small">אם קיימים כאב, מגבלה, הריון או הנחיה רפואית — המדריכה מתאימה את התרגיל לפי המצב בפועל. הדף אינו אבחון רפואי.</div></div>}

      <div className="row detail-links">
        <a className="btn" href={youtube} target="_blank" rel="noreferrer">סרטון הדגמה ב-YouTube</a>
      </div>
      <ExerciseActions exercise={x}/>
    </section>
    <footer className="footer">BISS · ספריית תרגילים</footer>
  </main>;
}
