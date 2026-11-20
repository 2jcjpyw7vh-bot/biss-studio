"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "../../lib/supabase-browser";
import {useStudioSession} from "../StudioSession";
import BoneDemoLinks from "../exercise/BoneDemoLinks";
import {boneDemos} from "../../lib/bone-strength";
import SavedWorkoutLibrary from "./SavedWorkoutLibrary";
import WorkoutTasksList from "./WorkoutTasksList";
import InstructorArboxSchedule from "./InstructorArboxSchedule";

const management=[
  ["integrations","לוח ארבוקס","שיעורים קרובים ובקשות לבניית אימון"],
  ["team","צוות והחלפות","אנשי קשר, הרשאות וגיוס מדריכות"],
  ["continuity","רצף קבוצות","תוכניות, תדריכים והתאמות לקבוצה"],
  ["equipment","מלאי ציוד","כמויות וזמינות הציוד בסטודיו"],
  ["program","תוכניות אישיות","בניית תוכניות ושיוך למתאמנות"]
];
const sessionLabels={planned:"מתוכנן",completed:"הסתיים",cancelled:"בוטל"};

export default function MySessionsPage(){
  const {user,status}=useStudioSession();
  const [data,setData]=useState(null);
  const [message,setMessage]=useState("");
  const [attempt,retry]=useState(0);
  const [sessionView,setSessionView]=useState("upcoming");
  const [teamView,setTeamView]=useState(false);
  const client=supabaseBrowser();
  const ready=data?.ownerId===user?.id?data:null;

  useEffect(()=>{
    if(user?.role==="trainee"){window.location.replace("/my-visits");return;}
    if(!user)return;
    const controller=new AbortController();
    setMessage("");
    async function load(){
      const {data:auth}=await client.auth.getSession();
      if(!auth.session)throw Error("יש להיכנס כדי לפתוח את האזור האישי.");
      const response=await fetch("/api/my-sessions",{headers:{Authorization:`Bearer ${auth.session.access_token}`},cache:"no-store",signal:controller.signal});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||"לא ניתן לטעון את האימונים.");
      if(!controller.signal.aborted)setData({...result,ownerId:user.id});
    }
    load().catch(error=>{if(!controller.signal.aborted)setMessage(error.message||"לא ניתן לטעון את האימונים כרגע.");});
    return()=>controller.abort();
  },[user?.id,attempt,client]);

  if(!user)return <main className="shell personal-workspace"><section className="panel personal-welcome"><h1>האזור האישי</h1>
    <p role="status">{status==="loading"?"טוען את החשבון שלך…":"היכנסי כדי לראות את המשימות, השיבוצים והאימונים ששמרת."}</p>
    {status!=="loading"&&<Link className="btn primary" href="/login?next=my-sessions">כניסה לאזור האישי</Link>}
  </section></main>;

  const sessions=(ready?.sessions||[]).filter(session=>
    (user.role!=="manager"||teamView||session.instructor_id===user.id)&&
    (sessionView==="all"||(Date.parse(session.starts_at)>=Date.now()&&session.status!=="cancelled"))
  );
  const group=id=>ready?.groups.find(item=>item.id===id);

  return <main className="shell personal-workspace">
    <section className="personal-welcome">
      <div><div className="eyebrow">האזור האישי · {user.role==="manager"?"ניהול הסטודיו":"צוות ההדרכה"}</div><h1>שלום, {user.full_name}</h1></div>
      <div className="row"><Link className="btn primary" href="/my-visits">הביקורים שלי כלקוח</Link><Link className="btn" href="/?tab=builder">בניית אימון חדש</Link></div>
    </section>
    <nav className="personal-shortcuts" aria-label="באזור האישי">
      <a href="#workout-tasks">בקשות לבניית אימון</a><a href="#upcoming-sessions">השיבוצים שלי</a><a href="#saved-workouts">האימונים ששמרתי</a>
      <a href="#arbox-personal-schedule">השיעורים שלי בארבוקס</a>
    </nav>
    {user.role==="manager"&&<section className="personal-management" aria-labelledby="management-title"><h2 id="management-title">ניהול הסטודיו</h2><div className="personal-tools">
      <Link href="/visits" className="personal-tool"><strong>ביקורים וחוויות</strong><span>לקוחות, אימון עצמאי, DJ וביקורים משולבים</span></Link>
      <Link href="/operations" className="personal-tool"><strong>הכנת פעילויות ומתפעלים</strong><span>שיוך אחראי, רשימות ציוד ואישור ביקור ללקוח</span></Link>
      <Link href="/my-visits" className="personal-tool"><strong>הביקורים שלי כלקוח</strong><span>הזמנות אישיות שבוצעו גם כשיש לך תפקיד צוות</span></Link>
      {management.map(([tab,title,description])=><Link href={`/?tab=${tab}`} className="personal-tool" key={tab}><strong>{title}</strong><span>{description}</span></Link>)}
    </div></section>}
    {message&&<section className="panel notice" role="status">{message} <button className="btn" onClick={()=>retry(value=>value+1)}>ניסיון חוזר</button></section>}
    {!ready&&!message&&<section className="panel" role="status">טוען את האימונים והמשימות שלך…</section>}
    {ready&&<>
      {ready.offers?.length>0&&<section className="panel"><h2>הצעות החלפה שממתינות לתשובה</h2>{ready.offers.map(offer=><article className="card row between" key={offer.id}><div><strong>{offer.session.title}</strong><div className="small">{new Date(offer.session.starts_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})}</div></div><Link className="btn primary" href={`/substitute/${offer.token}`}>צפייה בהצעה ומתן תשובה</Link></article>)}</section>}
      <WorkoutTasksList key={user.id}/>
      <InstructorArboxSchedule key={`arbox:${user.id}`}/>
      <section className="panel" id="upcoming-sessions"><div className="row between"><h2>השיבוצים שלי</h2><label className="field">מועד<select value={sessionView} onChange={event=>setSessionView(event.target.value)}><option value="upcoming">האימונים הקרובים</option><option value="all">גם מהשבועיים האחרונים</option></select></label></div>
        {user.role==="manager"&&<label className="permission-check"><input type="checkbox" checked={teamView} onChange={event=>setTeamView(event.target.checked)}/>הצגת השיבוצים של כל הצוות</label>}
        {sessions.length===0&&<div className="personal-empty"><strong>אין שיבוצים בתצוגה הזו</strong><p>בקשות להכנת אימון מופיעות בנפרד למעלה.</p></div>}
        {sessions.map(session=>{
          const currentGroup=group(session.group_id);
          const notes=ready.handoffs.filter(item=>item.session_id===session.id);
          const limits=ready.adaptations.filter(item=>item.group_id===session.group_id);
          return <article className="card instructor-session" key={session.id}>
            <div className="row between"><div><h3>{currentGroup?.name||"קבוצה"} · {session.title}</h3><div className="small">{new Date(session.starts_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})} · {session.instructor_name||"מדריכה טרם שובצה"}</div></div><span className="tag green">{sessionLabels[session.status]||session.status}</span></div>
            {session.workout_summary?<details><summary>תוכנית האימון</summary><p style={{whiteSpace:"pre-line"}}>{session.workout_summary}</p><BoneDemoLinks demos={boneDemos(session.workout_payload)}/></details>:<p className="small">תוכנית האימון עדיין ממתינה להכנה.</p>}
            {(session.playlist_url||currentGroup?.playlist_url)&&<a className="btn" href={session.playlist_url||currentGroup.playlist_url} target="_blank" rel="noreferrer">פתיחת הפלייליסט</a>}
            {notes.map(note=><div className="safe" key={note.id}><strong>עדכון מהצוות · {note.author_name||"ללא שם"}</strong><p>{note.note}</p></div>)}
            {ready.profile.can_view_health&&limits.length>0&&<div className="instructor-adaptations"><h3>התאמות נדרשות</h3>{limits.map(item=><div className="notice" key={item.id}><strong>{item.member_name} · {item.category}</strong><div>{item.guidance}</div></div>)}</div>}
          </article>;
        })}
      </section>
      <SavedWorkoutLibrary key={user.id} client={client}/>
    </>}
  </main>;
}
