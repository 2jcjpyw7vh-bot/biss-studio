import {supabaseAdmin} from "../../../lib/supabase";
import {Fragment} from "react";
import {sharedWorkoutPlan} from "../../../lib/workout-structure";
import {boneDemos,BONE_NOTICE} from "../../../lib/bone-strength";
import BoneDemoLinks from "../../exercise/BoneDemoLinks";
function Music({url,title}){return url?<div className="music">🎧 <a href={url} target="_blank" rel="noreferrer">פתחו ב-Spotify · {title||"מוזיקה"}</a></div>:null}
export default async function SharePage({params}){const {id}=await params,db=supabaseAdmin();if(!db)return <main className="shell"><div className="panel"><h2>השיתוף עדיין לא מחובר</h2></div></main>;const {data}=await db.from("shared_items").select("*").eq("id",id).single();if(!data)return <main className="shell"><div className="panel"><h2>הקישור לא נמצא</h2></div></main>;const p=data.payload,plan=data.type==="workout"?sharedWorkoutPlan(p):null;return <main className="shell"><div className="preview-header"><img className="preview-logo" src="/biss-logo.png" alt="BISS"/></div><section className="panel">
{data.type==="exercise"&&<><h1>{p.he}</h1><div className="sub">{p.en}</div><div className="tags" style={{margin:"12px 0"}}><span className="tag green">{p.region}</span><span className="tag blue">{p.equipment}</span></div><p><strong>עובד בעיקר על:</strong> {p.muscles}</p><p><strong>דגש:</strong> {p.cue}</p>{p.regression&&<p className="small">אפשרות קלה יותר: {p.regression}</p>}{p.safety&&<div className="notice">{p.safety}</div>}<Music url={p.musicUrl}/></>}
{data.type==="workout"&&<><h1>{p.title}</h1>{plan.duration&&<p><strong>משך כולל: {plan.duration} דק׳</strong></p>}<div className="sub">{p.meta}</div><Music url={p.musicUrl} title={p.musicTitle}/>
  {boneDemos(p).length>0&&<p className="notice">{BONE_NOTICE}</p>}
  {plan.legacyTiming&&<p className="notice">חלוקת זמן מוצעת לאימון ששיתפה המדריכה: {plan.legacyTiming.warm} דק׳ חימום, {plan.legacyTiming.mainMinutes} דק׳ לחלק המרכזי{plan.legacyTiming.finisher>0&&`, ${plan.legacyTiming.finisher} דק׳ פינישר`} ו־{plan.legacyTiming.cool} דק׳ שחרור. מספרי הסבבים הם הצעה להדרכה.</p>}
  <div className="section-title"><span className="dot blue"/><strong>חימום</strong></div>
  {p.warm?.map((line,i)=><div className="workout-item" key={i}>{line}</div>)}
  <div className="section-title"><span className="dot"/><strong>האימון</strong></div>
  {plan.exercises.map((exercise,i)=>{
    const section=plan.sections.find(item=>item.start===i);
    return <Fragment key={i}>
      {section&&<div className="section-title"><div>
        {section.title.startsWith("בלוק 2")&&p.transitionMinutes===2&&<p className="small">2 דק׳ התארגנות בין הבלוקים</p>}
        <h3>{section.title}</h3><p className="small">{section.detail}</p>
      </div></div>}
      <div className="workout-item"><strong>{i+1}. {exercise.he}</strong><div>{exercise.prescription}</div><div className="small">{exercise.cue}</div></div>
    </Fragment>
  })}
  {p.cool?.length>0&&<><div className="section-title"><span className="dot red"/><strong>שחרור</strong></div>{p.cool.map((line,i)=><div className="workout-item" key={i}>{line}</div>)}</>}
  <BoneDemoLinks demos={boneDemos(p)}/>
</>}
{data.type==="homework"&&<><h1>{p.title}</h1><div className="sub">{p.meta}</div><Music url={p.musicUrl} title={p.musicTitle}/>{p.note&&<div className="safe">הערת המדריכה: {p.note}</div>}{p.items?.map((x,i)=><div className="workout-item" key={i}><strong>{i+1}. {x.he}</strong><div>{x.prescription}</div><div className="small">{x.cue}</div></div>)}<div className="notice">אם מופיע כאב משמעותי, החמרה, נימול/הקרנה או תחושה חריגה — להפסיק ולפנות למדריכה/איש מקצוע מתאים.</div></>}
{data.type==="program"&&<><h1>{p.title}</h1><div className="sub">{p.meta}</div><Music url={p.musicUrl} title={p.musicTitle}/>{p.sessions?.map((s,i)=><div className="card" style={{marginTop:10}} key={i}><h3>{s.name}</h3><div className="small">{s.progression}</div>{s.items?.map((x,j)=><div className="workout-item" key={j}><strong>{x.he}</strong> · {x.prescription}</div>)}</div>)}</>}
</section><footer className="footer">BISS</footer></main>}
