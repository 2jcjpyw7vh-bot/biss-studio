"use client";
import {useMemo,useState} from "react";
import equipmentSeed from "../data/equipment.json";
import exercises from "../data/exercises.json";

const allRegions=["הכל",...Array.from(new Set(exercises.map(x=>x.region)))];
const allEquipment=["הכל","ללא ציוד",...Array.from(new Set(exercises.map(x=>x.equipment).filter(x=>x&&x!=="ללא ציוד")))];
const structures=["תחנות","סטים וחזרות","AMRAP","EMOM","פירמידה"];
const levels=["מתחילים","בינוניים","מתקדמים","מעורב"];
const goals=["חיזוק","אירובי","מוביליטי","שחרור","יציבות"];
const limitationProfiles=[
  {id:"lowerBack",label:"גב תחתון"},
  {id:"knee",label:"ברך"},
  {id:"shoulder",label:"כתף"},
  {id:"wrist",label:"שורש כף יד"},
  {id:"ankle",label:"קרסול"},
  {id:"balance",label:"שיווי משקל"},
  {id:"pregnancy",label:"הריון"}
];
const normalizeUrl=v=>{if(!v)return"";try{return new URL(v).toString()}catch{return""}};
const rand=a=>[...a].sort(()=>Math.random()-.5);

export default function Home(){
 const [tab,setTab]=useState("builder");
 const [region,setRegion]=useState("הכל"),[equipment,setEquipment]=useState("הכל"),[q,setQ]=useState("");
 const [people,setPeople]=useState(12),[minutes,setMinutes]=useState(50),[level,setLevel]=useState("מעורב"),[structure,setStructure]=useState("תחנות");
 const [musicUrl,setMusicUrl]=useState(""),[musicTitle,setMusicTitle]=useState("");
 const [workout,setWorkout]=useState(null),[program,setProgram]=useState(null),[homework,setHomework]=useState(null);
 const [inventory,setInventory]=useState(equipmentSeed),[pin,setPin]=useState(""),[adminMsg,setAdminMsg]=useState("");
 const [homeGoal,setHomeGoal]=useState("חיזוק"),[homeFreq,setHomeFreq]=useState(3),[homeMinutes,setHomeMinutes]=useState(10),[homeNote,setHomeNote]=useState("");
 const [programWeeks,setProgramWeeks]=useState(4),[programFreq,setProgramFreq]=useState(2);
 const [exerciseMusic,setExerciseMusic]=useState({});
 const [limitations,setLimitations]=useState([]);
 const [limitationNote,setLimitationNote]=useState("");
 const [alternatives,setAlternatives]=useState({});

 const filtered=useMemo(()=>exercises.filter(x=>{
   const text=(x.he+" "+x.en+" "+x.muscles+" "+x.pattern+" "+x.goal).toLowerCase();
   return (region==="הכל"||x.region===region)&&(equipment==="הכל"||x.equipment===equipment)&&text.includes(q.trim().toLowerCase());
 }),[region,equipment,q]);

 function equipmentCapacity(label){
   if(label==="ללא ציוד")return 999;
   const aliases={"קטלבל":"קטלבל 4–8 ק״ג","גומיות ירכיים":"גומיות ירכיים","גומיות התנגדות":"גומיות התנגדות","גומיות עם ידיות":"גומיות עם ידיות","כדורי פיזיו":"כדורי פיזיו","גלילי פילאטיס":"גלילי פילאטיס","מזרני פילאטיס":"מזרני פילאטיס","מדרגה":"מדרגה","בוסו":"בוסו","פיתה שיווי משקל":"פיתה שיווי משקל","קוביות פילאטיס":"קוביות פילאטיס","כדורי משקולת 1 ק״ג":"כדורי משקולת 1 ק״ג","אוברבול":"אוברבול"};
   if(label==="משקולות יד")return inventory.filter(x=>x.category==="dumbbells"&&x.active!==false).reduce((s,x)=>s+x.quantity,0);
   const item=inventory.find(x=>x.name_he===aliases[label]||x.name_he===label);
   return item?.active===false?0:(item?.quantity??999);
 }
 function prescription(i){
   if(structure==="סטים וחזרות")return `${i%2?10:12} חזרות × 3 סטים · 30–45 שנ׳ מנוחה`;
   if(structure==="AMRAP")return `8–12 חזרות · כחלק מ-AMRAP של 10–14 דקות`;
   if(structure==="EMOM")return `35–40 שנ׳ עבודה בתחילת כל דקה · יתרת הדקה מנוחה`;
   if(structure==="פירמידה")return `8 → 10 → 12 → 10 → 8 חזרות`;
   return `40 שנ׳ עבודה · 20 שנ׳ מעבר · 3 סבבים`;
 }
 function toggleLimitation(id){
   setLimitations(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 }
 function exerciseIssues(x){
   const p=(x.pattern||"").toLowerCase(), he=(x.he||"").toLowerCase(), en=(x.en||"").toLowerCase();
   const issues=[];
   if(limitations.includes("lowerBack") && (["hinge","back extension","core flexion"].some(k=>p.includes(k)) || (x.safety||"").includes("גב"))) issues.push("גב תחתון");
   if(limitations.includes("knee") && ["squat","lunge","single leg","step","jump"].some(k=>p.includes(k))) issues.push("ברך");
   if(limitations.includes("shoulder") && ["push","shoulder","overhead","plank"].some(k=>p.includes(k))) issues.push("כתף");
   if(limitations.includes("wrist") && ["push","plank","bear"].some(k=>p.includes(k))) issues.push("שורש כף יד");
   if(limitations.includes("ankle") && ["squat","lunge","single leg","calf","jump","step"].some(k=>p.includes(k))) issues.push("קרסול");
   if(limitations.includes("balance") && (["single leg","balance"].some(k=>p.includes(k)) || x.equipment==="בוסו" || x.equipment==="פיתה שיווי משקל")) issues.push("שיווי משקל");
   if(limitations.includes("pregnancy")){
     const pregnancyCheck = ["jump","burpee","core flexion"].some(k=>p.includes(k)) ||
       he.includes("שכיבה") || en.includes("floor") || en.includes("supine");
     if(pregnancyCheck) issues.push("הריון – נדרשת בדיקת התאמה");
   }
   return issues;
 }
 function findAlternative(x){
   const candidates=exercises.filter(a=>{
     if(a.id===x.id || exerciseIssues(a).length) return false;
     const sameGoal=a.goal===x.goal;
     const sameRegion=a.region===x.region;
     const available=equipment==="הכל" || a.equipment===equipment || a.equipment==="ללא ציוד";
     return sameGoal && sameRegion && available;
   });
   const fallback=exercises.filter(a=>a.id!==x.id && !exerciseIssues(a).length && a.goal===x.goal && a.equipment==="ללא ציוד");
   return rand(candidates.length?candidates:fallback)[0]||null;
 }
 function chooseAlternative(x){
   const alt=findAlternative(x);
   if(alt) setAlternatives(v=>({...v,[x.id]:alt}));
   else alert("לא נמצאה כרגע חלופה מתאימה מתוך המאגר. יש לבחור ידנית או לעצור את התרגיל.");
 }
 function buildWorkout(){
   let pool=filtered.filter(x=>!["שחרור","מוביליטי","מתיחות"].includes(x.goal));
   if(pool.length<5)pool=exercises.filter(x=>(region==="הכל"||x.region===region)&&!["שחרור","מוביליטי","מתיחות"].includes(x.goal));
   if(level!=="מעורב"){const leveled=pool.filter(x=>x.level===level);if(leveled.length>=4)pool=leveled}
   if(!pool.length)pool=exercises.filter(x=>x.goal==="חיזוק");
   const chosen=rand(pool).slice(0,Math.min(structure==="תחנות"?8:6,pool.length));
   const stations=chosen.map((x,i)=>{const cap=equipmentCapacity(x.equipment);return {...x,prescription:prescription(i),allocation:cap<people?`יש ${cap} יח׳ לכ-${people} משתתפות — לעבוד בזוגות/רוטציה או להשתמש בחלופה.`:""}});
   setAlternatives({}); setWorkout({title:region==="הכל"?"BISS Full Body":`BISS · ${region}`,meta:`${minutes} דק׳ · ${people} משתתפות · ${structure} · ${level}`,limitations:[...limitations],limitationLabels:limitationProfiles.filter(p=>limitations.includes(p.id)).map(p=>p.label),limitationNote,musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"מוזיקה לאימון",warm:["2 דק׳ העלאת דופק הדרגתית","2–3 דק׳ מוביליטי למפרקים הרלוונטיים","2 דק׳ חזרה טכנית על דפוסי התנועה המרכזיים"],exercises:stations,cool:["2 דק׳ הורדת דופק ונשימה","3–5 דק׳ מתיחות/מוביליטי עדינים לפי האזורים שעבדו"]});
   setTab("workout");
 }
 function buildHomework(){
   let pool=exercises.filter(x=>(region==="הכל"||x.region===region)&&(equipment==="הכל"||x.equipment===equipment)&&x.goal===homeGoal);
   if(pool.length<3)pool=exercises.filter(x=>(region==="הכל"||x.region===region)&&(homeGoal==="שחרור"?["שחרור","מוביליטי","מתיחות"].includes(x.goal):x.goal===homeGoal));
   const items=rand(pool).slice(0,4).map(x=>({...x,prescription:homeGoal==="חיזוק"?"2–3 סטים × 8–12 חזרות":"30–45 שנ׳ או 6–8 חזרות איטיות × 2"}));
   setHomework({title:`שיעורי בית · ${region==="הכל"?homeGoal:region}`,meta:`כ-${homeMinutes} דקות · ${homeFreq} פעמים בשבוע`,goal:homeGoal,note:homeNote,items,musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"מוזיקה"}); setTab("homeworkResult");
 }
 function buildProgram(){
   const sessions=[];
   for(let i=0;i<programWeeks*programFreq;i++){
     const week=Math.floor(i/programFreq)+1;
     const chosen=rand(exercises.filter(x=>(region==="הכל"||x.region===region)&&x.goal==="חיזוק")).slice(0,6);
     const progression=week===1?"בסיס טכני ועומס שמרני":week===2?"תוספת 1–2 חזרות או מעט משקל":week===3?"העלאת עומס/מורכבות תוך שמירת טכניקה":"התקדמות מבוקרת לפי איכות ביצוע";
     sessions.push({name:`שבוע ${week} · אימון ${(i%programFreq)+1}`,progression,items:chosen.map((x,j)=>({...x,prescription:week<=2?`${10+j%3} חזרות × 3 סטים`:`${8+j%3} חזרות × 3–4 סטים`}))});
   }
   setProgram({title:`תוכנית BISS · ${programWeeks} שבועות`,meta:`${programFreq} אימונים בשבוע · ${region==="הכל"?"Full Body":region}`,sessions,musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"פלייליסט לתוכנית"}); setTab("programResult");
 }
 async function createShare(type,payload){const r=await fetch("/api/share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,payload})});const d=await r.json();if(!r.ok)throw new Error(d.error||"לא ניתן ליצור קישור");return d.url}
 async function share(type,payload,channel="copy"){
   try{const url=await createShare(type,payload),title=payload.title||payload.he||"BISS",text=`${title} · BISS\n${url}`;
     if(channel==="whatsapp")window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");
     else if(channel==="email")window.location.href=`mailto:?subject=${encodeURIComponent(title+" | BISS")}&body=${encodeURIComponent(text)}`;
     else{await navigator.clipboard.writeText(url);alert("הקישור הועתק")}
   }catch(e){alert(`${e.message}. כדי שקישורים יעבדו בין מכשירים יש להשלים חיבור Supabase.`)}
 }
 async function refreshInventory(){try{const r=await fetch("/api/equipment");if(r.ok){const d=await r.json();if(Array.isArray(d)&&d.length)setInventory(d)}}catch{}}
 async function adminRequest(method,body){const r=await fetch("/api/equipment",{method,headers:{"Content-Type":"application/json","x-admin-pin":pin},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"שגיאה");return d}
 async function addEquipment(e){e.preventDefault();const f=new FormData(e.currentTarget);try{await adminRequest("POST",{name_he:f.get("name"),name_en:f.get("nameEn")||"",category:f.get("category")||"other",quantity:Number(f.get("quantity")||1),details:f.get("details")||"",active:true});setAdminMsg("הציוד נוסף");e.currentTarget.reset();refreshInventory()}catch(err){setAdminMsg(err.message)}}
 async function changeQty(item,delta){try{await adminRequest("PATCH",{id:item.id,quantity:Math.max(0,item.quantity+delta)});refreshInventory()}catch(e){setAdminMsg(e.message)}}
 async function toggleItem(item){try{await adminRequest("PATCH",{id:item.id,active:item.active===false});refreshInventory()}catch(e){setAdminMsg(e.message)}}
 async function deleteItem(item){if(!confirm(`למחוק את ${item.name_he}?`))return;try{await adminRequest("DELETE",{id:item.id});refreshInventory()}catch(e){setAdminMsg(e.message)}}
 const ShareButtons=({type,payload})=><div className="sharebox"><strong>שיתוף</strong><div className="small">קישור נקי לצפייה, ללא מסכי ניהול.</div><div className="row" style={{marginTop:10}}><button className="btn green" onClick={()=>share(type,payload,"whatsapp")}>WhatsApp</button><button className="btn blue" onClick={()=>share(type,payload,"email")}>מייל</button><button className="btn" onClick={()=>share(type,payload,"copy")}>העתקת קישור</button></div></div>;

 return <main className="shell">
  <header className="hero"><div className="brand"><img className="logo" src="/biss-logo.png" alt="BISS"/><div><div className="eyebrow">BISS STUDIO SYSTEM</div><h1>אימון מדויק. פשוט להפעלה.</h1><div className="sub">בנייה, חיפוש, שיתוף ושיעורי בית — במקום אחד.</div></div></div><div className="top-note small">בנוי לצוות הסטודיו: מהיר בטלפון, ברור בזמן שיעור, ומותאם למלאי הציוד.</div></header>
  <nav className="tabs">{[["builder","בניית אימון"],["exercises","תרגילים"],["homework","שיעורי בית"],["program","תוכנית"],["equipment","ציוד"]].map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);if(id==="equipment")refreshInventory()}}>{label}</button>)}{workout&&<button className={tab==="workout"?"active":""} onClick={()=>setTab("workout")}>האימון שלי</button>}</nav>

  {tab==="builder"&&<section className="panel hero-panel"><h2>בניית אימון</h2><div className="sub">בחרו מטרה בסיסית. המערכת מתחשבת במלאי ומסמנת מתי נדרשת עבודה בזוגות או רוטציה.</div><div className="filters"><label className="field">אזור גוף<select value={region} onChange={e=>setRegion(e.target.value)}>{allRegions.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">ציוד<select value={equipment} onChange={e=>setEquipment(e.target.value)}>{allEquipment.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">מבנה<select value={structure} onChange={e=>setStructure(e.target.value)}>{structures.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">רמה<select value={level} onChange={e=>setLevel(e.target.value)}>{levels.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">משתתפות<input type="number" min="1" max="40" value={people} onChange={e=>setPeople(+e.target.value)}/></label><label className="field">משך בדקות<input type="number" min="20" max="90" value={minutes} onChange={e=>setMinutes(+e.target.value)}/></label></div><div className="safe" style={{marginTop:14}}>
<strong>התאמות למגבלה / כאב שדווח מראש</strong>
<div className="small">אפשר לבחור יותר מאפשרות אחת. המערכת לא מאבחנת; היא רק מסמנת תרגילים לבדיקה ומציעה חלופה.</div>
<div className="row" style={{marginTop:10}}>{limitationProfiles.map(p=><button type="button" key={p.id} className={`btn ${limitations.includes(p.id)?"active-limit":""}`} onClick={()=>toggleLimitation(p.id)}>{p.label}</button>)}</div>
<label className="field" style={{marginTop:10}}>הערת מדריכה
<input value={limitationNote} onChange={e=>setLimitationNote(e.target.value)} placeholder="למשל: להימנע מכפיפה עמוקה בברך שמאל"/>
</label>
</div><div className="music"><strong>🎧 מוזיקה — אופציונלי</strong><div className="filters"><label className="field">שם הפלייליסט / השיר<input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="למשל BISS Strength"/></label><label className="field">קישור Spotify<input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="https://open.spotify.com/..."/></label></div></div><div className="row" style={{marginTop:14}}><button className="btn primary" onClick={buildWorkout}>צרי אימון</button><button className="btn" onClick={()=>setEquipment("ללא ציוד")}>משקל גוף בלבד</button></div></section>}

  {tab==="exercises"&&<section className="panel"><div className="row between"><div><h2>ספריית תרגילים</h2><div className="sub">חיפוש לפי שריר, אזור גוף, דפוס תנועה או ציוד.</div></div><div className="kpi">{filtered.length}</div></div><div className="filters"><label className="field">חיפוש<input value={q} onChange={e=>setQ(e.target.value)} placeholder="למשל glute medius, כתפיים, hinge..."/></label><label className="field">אזור<select value={region} onChange={e=>setRegion(e.target.value)}>{allRegions.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">ציוד<select value={equipment} onChange={e=>setEquipment(e.target.value)}>{allEquipment.map(x=><option key={x}>{x}</option>)}</select></label></div><div className="grid">{filtered.map(x=><article className="card exercise" key={x.id}><h3>{x.he}</h3><div className="small">{x.en}</div><p>{x.muscles}</p><div className="tags"><span className="tag green">{x.region}</span><span className="tag blue">{x.equipment}</span><span className="tag">{x.level}</span></div><p className="small"><strong>דגש:</strong> {x.cue}</p>{x.regression&&<div className="small">קל יותר: {x.regression}</div>}{x.safety&&<div className="small">⚠️ {x.safety}</div>}<div className="push-bottom"><input value={exerciseMusic[x.id]||""} onChange={e=>setExerciseMusic({...exerciseMusic,[x.id]:e.target.value})} placeholder="קישור Spotify אופציונלי"/><div className="row" style={{marginTop:8}}><button className="btn green" onClick={()=>share("exercise",{...x,musicUrl:normalizeUrl(exerciseMusic[x.id])},"whatsapp")}>WhatsApp</button><button className="btn blue" onClick={()=>share("exercise",{...x,musicUrl:normalizeUrl(exerciseMusic[x.id])},"email")}>מייל</button><button className="btn" onClick={()=>share("exercise",{...x,musicUrl:normalizeUrl(exerciseMusic[x.id])},"copy")}>קישור</button></div></div></article>)}</div></section>}

  {tab==="homework"&&<section className="panel"><h2>שיעורי בית למתאמנת</h2><div className="sub">לחיזוק משלים, יציבות, מוביליטי או התאוששות. לא מיועד לאבחון או טיפול בפציעה.</div><div className="filters"><label className="field">אזור<select value={region} onChange={e=>setRegion(e.target.value)}>{allRegions.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">מטרה<select value={homeGoal} onChange={e=>setHomeGoal(e.target.value)}>{goals.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">ציוד בבית<select value={equipment} onChange={e=>setEquipment(e.target.value)}>{allEquipment.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">פעמים בשבוע<input type="number" min="1" max="7" value={homeFreq} onChange={e=>setHomeFreq(+e.target.value)}/></label><label className="field">משך קצר בדקות<input type="number" min="5" max="30" value={homeMinutes} onChange={e=>setHomeMinutes(+e.target.value)}/></label></div><label className="field">הערה אישית<textarea value={homeNote} onChange={e=>setHomeNote(e.target.value)} placeholder="למשל: לעבוד לאט, להתמקד בשליטה בצד שמאל..."/></label><div className="music" style={{marginTop:12}}><strong>🎧 מוזיקה אופציונלית</strong><div className="filters"><input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="שם השיר / הפלייליסט"/><input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="קישור Spotify"/></div></div><div className="notice">כאשר יש כאב משמעותי, נפיחות, חבלה, נימול/הקרנה, חולשה חדשה או מגבלה לא מוסברת — לא משתמשים בשיעורי בית כתחליף לבדיקה מקצועית.</div><button className="btn primary" style={{marginTop:12}} onClick={buildHomework}>צרי משימה</button></section>}

  {tab==="program"&&<section className="panel"><h2>תוכנית רב־שבועית</h2><div className="sub">בסיס לתוכנית עם התקדמות שבועית. המדריכה עוברת על התוכנית לפני שימוש.</div><div className="filters"><label className="field">אזור<select value={region} onChange={e=>setRegion(e.target.value)}>{allRegions.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">שבועות<input type="number" min="2" max="12" value={programWeeks} onChange={e=>setProgramWeeks(+e.target.value)}/></label><label className="field">אימונים בשבוע<input type="number" min="1" max="5" value={programFreq} onChange={e=>setProgramFreq(+e.target.value)}/></label></div><div className="music"><strong>🎧 פלייליסט לתוכנית — אופציונלי</strong><div className="filters"><input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="שם הפלייליסט"/><input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="קישור Spotify"/></div></div><button className="btn primary" onClick={buildProgram}>צרי תוכנית</button></section>}

  {tab==="workout"&&workout&&<section className="panel"><div className="row between"><div><h2>{workout.title}</h2><div className="sub">{workout.meta}</div></div><button className="btn" onClick={buildWorkout}>גרסה נוספת</button></div>{workout.limitationLabels?.length>0&&<div className="safe" style={{margin:"12px 0"}}><strong>התאמות פעילות:</strong> {workout.limitationLabels.join(" · ")}{workout.limitationNote&&<div className="small">הערת מדריכה: {workout.limitationNote}</div>}</div>}{workout.musicUrl&&<div className="music">🎧 <a href={workout.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {workout.musicTitle}</a></div>}<div className="section-title"><span className="dot blue"/><strong>חימום</strong></div>{workout.warm.map(x=><div className="workout-item" key={x}>{x}</div>)}<div className="section-title"><span className="dot"/><strong>חלק מרכזי</strong></div>{workout.exercises.map((x,i)=>{const issues=exerciseIssues(x),alt=alternatives[x.id];return <div className="workout-item" key={x.id}><strong>{i+1}. {x.he} <span className="small">({x.en})</span></strong><div>{x.prescription}</div><div className="small">{x.equipment} · {x.cue}</div>{x.allocation&&<div className="notice" style={{marginTop:7}}>{x.allocation}</div>}{x.regression&&<div className="small">רגרסיה: {x.regression}</div>}{issues.length>0&&<div className="notice" style={{marginTop:8}}><strong>⚠️ התאמה נדרשת: {issues.join(", ")}</strong><div className="small">התרגיל נשאר לקבוצה, ולמתאמנת עם המגבלה ניתן לבחור חלופה אישית.</div><button className="btn" style={{marginTop:8}} onClick={()=>chooseAlternative(x)}>הצג תרגיל חלופי</button></div>}{alt&&<div className="safe" style={{marginTop:8}}><strong>חלופה מוצעת: {alt.he} <span className="small">({alt.en})</span></strong><div className="small">{alt.equipment} · {alt.cue}</div>{alt.regression&&<div className="small">קל יותר: {alt.regression}</div>}<button className="btn" style={{marginTop:8}} onClick={()=>chooseAlternative(x)}>חלופה אחרת</button></div>}</div>})}<div className="section-title"><span className="dot red"/><strong>שחרור</strong></div>{workout.cool.map(x=><div className="workout-item" key={x}>{x}</div>)}<ShareButtons type="workout" payload={workout}/><div className="safe" style={{marginTop:12}}>האימון נועד לשמש כלי עבודה למדריכה. יש להתאים עומס, טווח, קצב ותרגיל לפי המתאמנות בפועל.</div></section>}

  {tab==="homeworkResult"&&homework&&<section className="panel"><h2>{homework.title}</h2><div className="sub">{homework.meta}</div>{homework.musicUrl&&<div className="music">🎧 <a href={homework.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {homework.musicTitle}</a></div>}{homework.note&&<div className="safe" style={{margin:"12px 0"}}>הערת המדריכה: {homework.note}</div>}{homework.items.map((x,i)=><div className="workout-item" key={x.id}><strong>{i+1}. {x.he}</strong><div>{x.prescription}</div><div className="small">{x.cue}</div></div>)}<ShareButtons type="homework" payload={homework}/></section>}
  {tab==="programResult"&&program&&<section className="panel"><h2>{program.title}</h2><div className="sub">{program.meta}</div>{program.musicUrl&&<div className="music">🎧 <a href={program.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {program.musicTitle}</a></div>}{program.sessions.map((s,i)=><div className="card" style={{marginTop:10}} key={i}><h3>{s.name}</h3><div className="small">התקדמות: {s.progression}</div>{s.items.map((x,j)=><div className="workout-item" key={x.id+j}><strong>{x.he}</strong> · {x.prescription}</div>)}</div>)}<ShareButtons type="program" payload={program}/></section>}

  {tab==="equipment"&&<section className="panel"><div className="row between"><div><h2>מלאי הסטודיו</h2><div className="sub">הכמויות משמשות את מנגנון חלוקת התחנות.</div></div><div className="kpi">{inventory.reduce((s,x)=>s+(x.active===false?0:x.quantity),0)}</div></div><div className="grid">{inventory.map((x,i)=><article className={`card inventory-card ${x.active===false?"unavailable":""}`} key={x.id||i}><h3>{x.name_he}</h3><div className="small">{x.name_en}</div><p><strong>{x.quantity}</strong> יחידות {x.active===false&&"· לא זמין כרגע"}</p>{x.details&&<div className="small">{x.details}</div>}{x.id&&<div className="row" style={{marginTop:10}}><button className="btn" onClick={()=>changeQty(x,-1)}>−</button><button className="btn" onClick={()=>changeQty(x,1)}>+</button><button className="btn" onClick={()=>toggleItem(x)}>{x.active===false?"החזרה לזמין":"לא זמין"}</button><button className="btn red" onClick={()=>deleteItem(x)}>מחיקה</button></div>}</article>)}</div><div className="admin"><h3>ניהול ציוד</h3><div className="small">פעולות שינוי דורשות PIN מנהל. ה-PIN נבדק בצד השרת ואינו נשמר בקוד הדפדפן.</div><div className="filters"><label className="field">PIN<input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN מנהל"/></label></div><form className="filters" onSubmit={addEquipment}><input name="name" required placeholder="שם הציוד בעברית"/><input name="nameEn" placeholder="שם באנגלית"/><input name="quantity" type="number" min="0" required placeholder="כמות"/><input name="category" placeholder="קטגוריה"/><input name="details" placeholder="פרטים / משקל"/><button className="btn primary" type="submit">הוספת ציוד</button></form>{adminMsg&&<div className="notice">{adminMsg}</div>}</div></section>}
  <footer className="footer">BISS · מערכת עבודה פנימית לסטודיו</footer>
 </main>
}
