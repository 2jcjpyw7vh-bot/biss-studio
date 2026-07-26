"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import equipmentSeed from "../data/equipment.json";
import exercisesSeed from "../data/exercises.json";

const structures=["תחנות","סטים וחזרות","סופר סט / Super Fit","AMRAP","EMOM","פירמידה"];
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

const MultiChoice=({label,options,selected,onChange})=><div className="field v28-multi-field">
  <span>{label}</span>
  <div className="v28-multi-choice">
    <button type="button" className={`v28-choice ${selected.length===0?"selected":""}`} onClick={()=>onChange([])}>הכל</button>
    {options.filter(x=>x!=="הכל").map(x=>{
      const active=selected.includes(x);
      return <button type="button" key={x} className={`v28-choice ${active?"selected":""}`} onClick={()=>onChange(active?selected.filter(v=>v!==x):[...selected,x])}>{x}</button>
    })}
  </div>
</div>;

export default function Home(){
 const [tab,setTab]=useState("builder");
 const [regions,setRegions]=useState([]),[equipments,setEquipments]=useState([]),[q,setQ]=useState("");
 const [people,setPeople]=useState(12),[minutes,setMinutes]=useState(50),[level,setLevel]=useState("מעורב"),[structure,setStructure]=useState("תחנות");
 const [musicUrl,setMusicUrl]=useState(""),[musicTitle,setMusicTitle]=useState("");
 const [workout,setWorkout]=useState(null),[program,setProgram]=useState(null),[homework,setHomework]=useState(null);
 const [inventory,setInventory]=useState(equipmentSeed),[pin,setPin]=useState(""),[adminMsg,setAdminMsg]=useState("");
  const [savingEquipment,setSavingEquipment]=useState(false);
 const [homeGoal,setHomeGoal]=useState("חיזוק"),[homeFreq,setHomeFreq]=useState(3),[homeMinutes,setHomeMinutes]=useState(10),[homeNote,setHomeNote]=useState("");
 const [programWeeks,setProgramWeeks]=useState(4),[programFreq,setProgramFreq]=useState(2);
 const [exerciseMusic,setExerciseMusic]=useState({});
 const [limitations,setLimitations]=useState([]);
 const [limitationNote,setLimitationNote]=useState("");
 const [alternatives,setAlternatives]=useState({});
 const [exerciseLibrary,setExerciseLibrary]=useState(exercisesSeed);
 const [libraryLoading,setLibraryLoading]=useState(true);
 useEffect(()=>{
   const requested=new URLSearchParams(window.location.search).get("tab");
   if(requested==="exercises")setTab("exercises");
   if(requested==="equipment")setTab("equipment");
   refreshInventory();
   refreshExercises();
 },[]);

 const allRegions=useMemo(()=>["הכל",...Array.from(new Set(exerciseLibrary.map(x=>x.region).filter(Boolean)))],[exerciseLibrary]);
 const allEquipment=useMemo(()=>{
   const fromExercises=exerciseLibrary.map(x=>x.equipment).filter(Boolean);
   const fromInventory=inventory.filter(x=>x.active!==false).map(x=>x.name_he).filter(Boolean);
   return ["הכל","ללא ציוד",...Array.from(new Set([...fromExercises,...fromInventory].filter(x=>x!=="ללא ציוד")))];
 },[exerciseLibrary,inventory]);

 const matchesRegion=x=>regions.length===0||regions.includes(x.region);
 const matchesEquipment=x=>equipments.length===0||equipments.includes(x.equipment);
 const regionLabel=regions.length?regions.join(" + "):"כל הגוף";
 const equipmentLabel=equipments.length?equipments.join(" + "):"כל הציוד";

 const filtered=useMemo(()=>exerciseLibrary.filter(x=>{
   const text=(x.he+" "+x.en+" "+x.muscles+" "+x.pattern+" "+x.goal+" "+x.equipment).toLowerCase();
   return matchesRegion(x)&&matchesEquipment(x)&&text.includes(q.trim().toLowerCase());
 }),[exerciseLibrary,regions,equipments,q]);

 function equipmentCapacity(label){
   if(label==="ללא ציוד")return 999;
   const aliases={"קטלבל":"קטלבל 4–8 ק״ג","גומיות ירכיים":"גומיות ירכיים","גומיות התנגדות":"גומיות התנגדות","גומיות עם ידיות":"גומיות עם ידיות","כדורי פיזיו":"כדורי פיזיו","גלילי פילאטיס":"גלילי פילאטיס","מזרני פילאטיס":"מזרני פילאטיס","מדרגה":"מדרגה","בוסו":"בוסו","פיתה שיווי משקל":"פיתה שיווי משקל","קוביות פילאטיס":"קוביות פילאטיס","כדורי משקולת 1 ק״ג":"כדורי משקולת 1 ק״ג","אוברבול":"אוברבול","בר":"בר קבוע בסטודיו","נקודת עגינה רצפתית":"נקודת עיגון לגומיות - רצפה","נקודת עגינה גובה מותן":"נקודת עיגון לגומיות - גובה מותן"};
   if(label==="משקולות יד")return inventory.filter(x=>x.category==="dumbbells"&&x.active!==false).reduce((sum,x)=>sum+Number(x.quantity||0),0);
   const target=aliases[label]||label;
   const item=inventory.find(x=>x.name_he===target||x.name_he===label);
   return item?.active===false?0:(item?Number(item.quantity??0):999);
 }
 function antagonistInfo(x){
   if(x.antagonist_group){
     const p=(x.pattern||"").toLowerCase();
     const m=(x.muscles||"").toLowerCase();
     let role="a";
     if(x.antagonist_group==="chest-back")role=p.includes("pull")?"b":"a";
     else if(x.antagonist_group==="biceps-triceps")role=m.includes("אחורית")||m.includes("triceps")?"b":"a";
     else if(x.antagonist_group==="quads-hamstrings")role=p.includes("hinge")||p.includes("flexion")||m.includes("אחורית")?"b":"a";
     else if(x.antagonist_group==="core-back")role=p.includes("back")||m.includes("זוקפי")?"b":"a";
     return {key:x.antagonist_group,role};
   }
   const p=(x.pattern||"").toLowerCase(),m=(x.muscles||"").toLowerCase();
   if(p.includes("pull"))return {key:"chest-back",role:"b"};
   if(p.includes("push"))return {key:"chest-back",role:"a"};
   if(m.includes("יד קדמית")||m.includes("biceps"))return {key:"biceps-triceps",role:"a"};
   if(m.includes("יד אחורית")||m.includes("triceps"))return {key:"biceps-triceps",role:"b"};
   if(p.includes("squat")||p.includes("lunge"))return {key:"quads-hamstrings",role:"a"};
   if(p.includes("hinge")||p.includes("knee flexion"))return {key:"quads-hamstrings",role:"b"};
   return null;
 }
 function buildBalancedSelection(pool,count){
   const chosen=[],used=new Set();
   const add=x=>{if(x&&!used.has(x.id)){chosen.push(x);used.add(x.id)}};
   for(const eq of equipments){
     add(rand(pool.filter(x=>x.equipment===eq&&!used.has(x.id)))[0]);
     if(chosen.length>=count)return chosen.slice(0,count);
   }
   for(const bodyRegion of regions){
     add(rand(pool.filter(x=>x.region===bodyRegion&&!used.has(x.id)))[0]);
     if(chosen.length>=count)return chosen.slice(0,count);
   }
   for(const x of rand(pool)){
     add(x);
     if(chosen.length>=count)break;
   }
   return chosen;
 }
 function buildSupersetSelection(pool){
   const shuffled=rand(pool),used=new Set(),pairs=[];
   for(const a of shuffled){
     if(used.has(a.id))continue;
     const ai=antagonistInfo(a);if(!ai)continue;
     const b=shuffled.find(x=>!used.has(x.id)&&x.id!==a.id&&antagonistInfo(x)?.key===ai.key&&antagonistInfo(x)?.role!==ai.role);
     if(!b)continue;
     used.add(a.id);used.add(b.id);pairs.push([a,b]);
     if(pairs.length===3)break;
   }
   if(!pairs.length)return rand(pool).slice(0,6).map((x,i)=>[x]).flat();
   return pairs.flatMap((pair,pairIndex)=>pair.map((x,itemIndex)=>({...x,supersetGroup:pairIndex+1,supersetSlot:itemIndex===0?"A":"B"})));
 }
 function prescription(i){
   if(structure==="סטים וחזרות")return `${i%2?10:12} חזרות × 3 סטים · 30–45 שנ׳ מנוחה`;
   if(structure==="סופר סט / Super Fit")return `8–12 חזרות · מעבר ישיר לתרגיל הנגדי · 60–90 שנ׳ מנוחה אחרי הזוג`;
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
   const candidates=exerciseLibrary.filter(a=>{
     if(a.id===x.id || exerciseIssues(a).length) return false;
     const sameGoal=a.goal===x.goal;
     const sameRegion=a.region===x.region;
     const available=equipments.length===0 || equipments.includes(a.equipment) || a.equipment==="ללא ציוד";
     return sameGoal && sameRegion && available;
   });
   const fallback=exerciseLibrary.filter(a=>a.id!==x.id && !exerciseIssues(a).length && a.goal===x.goal && a.equipment==="ללא ציוד");
   return rand(candidates.length?candidates:fallback)[0]||null;
 }
 function chooseAlternative(x){
   const alt=findAlternative(x);
   if(alt) setAlternatives(v=>({...v,[x.id]:alt}));
   else alert("לא נמצאה כרגע חלופה מתאימה מתוך המאגר. יש לבחור ידנית או לעצור את התרגיל.");
 }
 function buildWorkout(){
   let pool=filtered.filter(x=>!["שחרור","מוביליטי","מתיחות"].includes(x.goal));
   if(pool.length<5)pool=exerciseLibrary.filter(x=>matchesRegion(x)&&matchesEquipment(x)&&!["שחרור","מוביליטי","מתיחות"].includes(x.goal));
   if(level!=="מעורב"){const leveled=pool.filter(x=>x.level===level);if(leveled.length>=4)pool=leveled}
   if(!pool.length)pool=exerciseLibrary.filter(x=>matchesRegion(x)&&x.goal==="חיזוק");
   const targetCount=Math.min(structure==="תחנות"?8:6,pool.length);
   const chosen=structure==="סופר סט / Super Fit"
     ? buildSupersetSelection(pool)
     : buildBalancedSelection(pool,targetCount);
   const stations=chosen.map((x,i)=>{const cap=equipmentCapacity(x.equipment);return {...x,prescription:x.supersetGroup?`${x.supersetSlot}${x.supersetGroup} · ${prescription(i)}`:prescription(i),allocation:cap<people?`יש ${cap} יח׳ לכ-${people} משתתפות — לעבוד בזוגות/רוטציה או להשתמש בחלופה.`:""}});
   setAlternatives({}); setWorkout({title:regions.length?`BISS · ${regionLabel}`:"BISS Full Body",meta:`${minutes} דק׳ · ${people} משתתפות · ${structure} · ${level} · ${equipmentLabel}`,limitations:[...limitations],limitationLabels:limitationProfiles.filter(p=>limitations.includes(p.id)).map(p=>p.label),limitationNote,musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"מוזיקה לאימון",warm:["2 דק׳ העלאת דופק הדרגתית","2–3 דק׳ מוביליטי למפרקים הרלוונטיים","2 דק׳ חזרה טכנית על דפוסי התנועה המרכזיים"],exercises:stations,cool:["2 דק׳ הורדת דופק ונשימה","3–5 דק׳ מתיחות/מוביליטי עדינים לפי האזורים שעבדו"]});
   setTab("workout");
 }
 function buildHomework(){
   let pool=exerciseLibrary.filter(x=>matchesRegion(x)&&matchesEquipment(x)&&x.goal===homeGoal);
   if(pool.length<3)pool=exerciseLibrary.filter(x=>matchesRegion(x)&&(homeGoal==="שחרור"?["שחרור","מוביליטי","מתיחות"].includes(x.goal):x.goal===homeGoal));
   const items=rand(pool).slice(0,4).map(x=>({...x,prescription:homeGoal==="חיזוק"?"2–3 סטים × 8–12 חזרות":"30–45 שנ׳ או 6–8 חזרות איטיות × 2"}));
   setHomework({title:`שיעורי בית · ${regions.length?regionLabel:homeGoal}`,meta:`כ-${homeMinutes} דקות · ${homeFreq} פעמים בשבוע · ${equipmentLabel}`,goal:homeGoal,note:homeNote,items,musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"מוזיקה"}); setTab("homeworkResult");
 }
 function buildProgram(){
   const sessions=[];
   for(let i=0;i<programWeeks*programFreq;i++){
     const week=Math.floor(i/programFreq)+1;
     const chosen=rand(exerciseLibrary.filter(x=>matchesRegion(x)&&matchesEquipment(x)&&x.goal==="חיזוק")).slice(0,6);
     const progression=week===1?"בסיס טכני ועומס שמרני":week===2?"תוספת 1–2 חזרות או מעט משקל":week===3?"העלאת עומס/מורכבות תוך שמירת טכניקה":"התקדמות מבוקרת לפי איכות ביצוע";
     sessions.push({name:`שבוע ${week} · אימון ${(i%programFreq)+1}`,progression,items:chosen.map((x,j)=>({...x,prescription:week<=2?`${10+j%3} חזרות × 3 סטים`:`${8+j%3} חזרות × 3–4 סטים`}))});
   }
   setProgram({title:`תוכנית BISS · ${programWeeks} שבועות`,meta:`${programFreq} אימונים בשבוע · ${regions.length?regionLabel:"Full Body"} · ${equipmentLabel}`,sessions,musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"פלייליסט לתוכנית"}); setTab("programResult");
 }
 async function createShare(type,payload){const r=await fetch("/api/share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,payload})});const d=await r.json();if(!r.ok)throw new Error(d.error||"לא ניתן ליצור קישור");return d.url}
 async function share(type,payload,channel="copy"){
   try{const url=await createShare(type,payload),title=payload.title||payload.he||"BISS",text=`${title} · BISS\n${url}`;
     if(channel==="whatsapp")window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");
     else if(channel==="email")window.location.href=`mailto:?subject=${encodeURIComponent(title+" | BISS")}&body=${encodeURIComponent(text)}`;
     else{await navigator.clipboard.writeText(url);alert("הקישור הועתק")}
   }catch(e){alert(`${e.message}. כדי שקישורים יעבדו בין מכשירים יש להשלים חיבור Supabase.`)}
 }
 function exerciseLink(x){return `${window.location.origin}/exercise/${encodeURIComponent(x.id)}`}
 async function shareExercise(x,channel="copy"){
   const url=exerciseLink(x),title=`${x.he} (${x.en})`,text=`${title} · BISS\n${url}`;
   if(channel==="whatsapp")window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");
   else if(channel==="email")window.location.href=`mailto:?subject=${encodeURIComponent(title+" | BISS")}&body=${encodeURIComponent(text)}`;
   else{await navigator.clipboard.writeText(url);alert("קישור התרגיל הועתק")}
 }
 async function refreshInventory(){try{const r=await fetch("/api/equipment",{cache:"no-store"});if(r.ok){const d=await r.json();if(Array.isArray(d)&&d.length)setInventory(d)}}catch{}}
 async function refreshExercises(){setLibraryLoading(true);try{const r=await fetch("/api/exercises",{cache:"no-store"});if(r.ok){const d=await r.json();if(Array.isArray(d)&&d.length)setExerciseLibrary(d)}}catch{}finally{setLibraryLoading(false)}}
 async function adminRequest(method,body){const r=await fetch("/api/equipment",{method,headers:{"Content-Type":"application/json","x-admin-pin":pin},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"שגיאה");return d}
async function addEquipment(e){
  e.preventDefault();

  if(savingEquipment) return;

  const form=e.currentTarget;
  const f=new FormData(form);

  setSavingEquipment(true);
  setAdminMsg("שומר את הציוד...");

  try{
    const result=await adminRequest("POST",{
      name_he:f.get("name"),
      name_en:f.get("nameEn")||"",
      category:f.get("category")||"other",
      quantity:Number(f.get("quantity")||1),
      details:f.get("details")||"",
      active:true
    });

    const extra=result.generatedCount?` · נוצרו ${result.generatedCount} תרגילים אוטומטית`:(result.generationWarning?` · ${result.generationWarning}`:"");
    setAdminMsg(`✓ הציוד נוסף בהצלחה${extra}`);
    form.reset();
    await Promise.all([refreshInventory(),refreshExercises()]);
  }catch(err){
    setAdminMsg(`⚠️ ${err.message}`);
  }finally{
    setSavingEquipment(false);
  }
} 
  async function changeQty(item,delta){try{await adminRequest("PATCH",{id:item.id,quantity:Math.max(0,item.quantity+delta)});refreshInventory()}catch(e){setAdminMsg(e.message)}}
 async function toggleItem(item){try{await adminRequest("PATCH",{id:item.id,active:item.active===false});refreshInventory()}catch(e){setAdminMsg(e.message)}}
 async function deleteItem(item){if(!confirm(`למחוק את ${item.name_he}?`))return;try{await adminRequest("DELETE",{id:item.id});refreshInventory()}catch(e){setAdminMsg(e.message)}}
 const ShareButtons=({type,payload})=><div className="sharebox v24-sharebox"><strong>שיתוף</strong><div className="small">קישור נקי לצפייה, ללא מסכי ניהול.</div><div className="row" style={{marginTop:10}}><button className="btn green" onClick={()=>share(type,payload,"whatsapp")}>WhatsApp</button><button className="btn blue" onClick={()=>share(type,payload,"email")}>מייל</button><button className="btn" onClick={()=>share(type,payload,"copy")}>העתקת קישור</button></div></div>;

 return <main className="shell v26-shell">
  <header className="hero v26-main-hero"><div className="brand"><img className="logo" src="/biss-logo.png" alt="BISS"/><div><div className="eyebrow">BISS STUDIO SYSTEM</div><h1>אימון מדויק. פשוט להפעלה.</h1><div className="sub">בנייה, חיפוש, שיתוף ושיעורי בית — במקום אחד.</div></div></div><div className="top-note small">בנוי לצוות הסטודיו: מהיר בטלפון, ברור בזמן שיעור, ומותאם למלאי הציוד.</div></header>
  <nav className="tabs v26-tabs">{[["builder","בניית אימון"],["exercises","תרגילים"],["homework","שיעורי בית"],["program","תוכנית"],["equipment","ציוד"]].map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);if(id==="equipment")refreshInventory()}}>{label}</button>)}{workout&&<button className={tab==="workout"?"active":""} onClick={()=>setTab("workout")}>האימון שלי</button>}</nav>

  {tab==="builder"&&<section className="panel hero-panel v26-builder-panel"><h2>בניית אימון</h2><div className="sub">בחרו מטרה בסיסית. המערכת מתחשבת במלאי ומסמנת מתי נדרשת עבודה בזוגות או רוטציה.</div><div className="filters"><MultiChoice label="אזורי גוף — ניתן לבחור כמה" options={allRegions} selected={regions} onChange={setRegions}/><MultiChoice label="ציוד — ניתן לבחור כמה" options={allEquipment} selected={equipments} onChange={setEquipments}/><label className="field">מבנה<select value={structure} onChange={e=>setStructure(e.target.value)}>{structures.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">רמה<select value={level} onChange={e=>setLevel(e.target.value)}>{levels.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">משתתפות<input type="number" min="1" max="40" value={people} onChange={e=>setPeople(+e.target.value)}/></label><label className="field">משך בדקות<input type="number" min="20" max="90" value={minutes} onChange={e=>setMinutes(+e.target.value)}/></label></div><div className="safe" style={{marginTop:14}}>
<strong>התאמות למגבלה / כאב שדווח מראש</strong>
<div className="small">אפשר לבחור יותר מאפשרות אחת. המערכת לא מאבחנת; היא רק מסמנת תרגילים לבדיקה ומציעה חלופה.</div>
<div className="row" style={{marginTop:10}}>{limitationProfiles.map(p=><button type="button" key={p.id} className={`btn ${limitations.includes(p.id)?"active-limit":""}`} onClick={()=>toggleLimitation(p.id)}>{p.label}</button>)}</div>
<label className="field" style={{marginTop:10}}>הערת מדריכה
<input value={limitationNote} onChange={e=>setLimitationNote(e.target.value)} placeholder="למשל: להימנע מכפיפה עמוקה בברך שמאל"/>
</label>
</div><div className="music"><strong>🎧 מוזיקה — אופציונלי</strong><div className="filters"><label className="field">שם הפלייליסט / השיר<input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="למשל BISS Strength"/></label><label className="field">קישור Spotify<input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="https://open.spotify.com/..."/></label></div></div><div className="row" style={{marginTop:14}}><button className="btn primary" onClick={buildWorkout}>צרי אימון</button><button className="btn" onClick={()=>setEquipments(["ללא ציוד"])}>משקל גוף בלבד</button></div></section>}

  {tab==="exercises"&&<section className="panel"><div className="row between"><div><h2>ספריית תרגילים</h2><div className="sub">חיפוש לפי שריר, אזור גוף, דפוס תנועה או ציוד.</div></div><div className="kpi">{libraryLoading?"…":filtered.length}</div></div><div className="filters"><label className="field">חיפוש<input value={q} onChange={e=>setQ(e.target.value)} placeholder="למשל glute medius, כתפיים, hinge..."/></label><MultiChoice label="אזור — בחירה מרובה" options={allRegions} selected={regions} onChange={setRegions}/><MultiChoice label="ציוד — בחירה מרובה" options={allEquipment} selected={equipments} onChange={setEquipments}/></div><div className="grid">{filtered.map(x=><article className="card exercise" key={x.id}><h3>{x.he}</h3><div className="small">{x.en}</div><p>{x.muscles}</p><div className="tags"><span className="tag green">{x.region}</span><span className="tag blue">{x.equipment}</span><span className="tag">{x.level}</span></div><p className="small"><strong>דגש:</strong> {x.cue}</p>{x.regression&&<div className="small">קל יותר: {x.regression}</div>}{x.safety&&<div className="small">⚠️ {x.safety}</div>}<div className="push-bottom"><input value={exerciseMusic[x.id]||""} onChange={e=>setExerciseMusic({...exerciseMusic,[x.id]:e.target.value})} placeholder="קישור Spotify אופציונלי"/><div className="row" style={{marginTop:8}}><Link className="btn primary" href={`/exercise/${x.id}`}>פתח תרגיל</Link><button className="btn green" onClick={()=>shareExercise(x,"whatsapp")}>WhatsApp</button><button className="btn blue" onClick={()=>shareExercise(x,"email")}>מייל</button><button className="btn" onClick={()=>shareExercise(x,"copy")}>העתקת קישור</button></div></div></article>)}</div></section>}

  {tab==="homework"&&<section className="panel"><h2>שיעורי בית למתאמנת</h2><div className="sub">לחיזוק משלים, יציבות, מוביליטי או התאוששות. לא מיועד לאבחון או טיפול בפציעה.</div><div className="filters"><MultiChoice label="אזור — בחירה מרובה" options={allRegions} selected={regions} onChange={setRegions}/><label className="field">מטרה<select value={homeGoal} onChange={e=>setHomeGoal(e.target.value)}>{goals.map(x=><option key={x}>{x}</option>)}</select></label><MultiChoice label="ציוד בבית — בחירה מרובה" options={allEquipment} selected={equipments} onChange={setEquipments}/><label className="field">פעמים בשבוע<input type="number" min="1" max="7" value={homeFreq} onChange={e=>setHomeFreq(+e.target.value)}/></label><label className="field">משך קצר בדקות<input type="number" min="5" max="30" value={homeMinutes} onChange={e=>setHomeMinutes(+e.target.value)}/></label></div><label className="field">הערה אישית<textarea value={homeNote} onChange={e=>setHomeNote(e.target.value)} placeholder="למשל: לעבוד לאט, להתמקד בשליטה בצד שמאל..."/></label><div className="music" style={{marginTop:12}}><strong>🎧 מוזיקה אופציונלית</strong><div className="filters"><input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="שם השיר / הפלייליסט"/><input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="קישור Spotify"/></div></div><div className="notice">כאשר יש כאב משמעותי, נפיחות, חבלה, נימול/הקרנה, חולשה חדשה או מגבלה לא מוסברת — לא משתמשים בשיעורי בית כתחליף לבדיקה מקצועית.</div><button className="btn primary" style={{marginTop:12}} onClick={buildHomework}>צרי משימה</button></section>}

  {tab==="program"&&<section className="panel"><h2>תוכנית רב־שבועית</h2><div className="sub">בסיס לתוכנית עם התקדמות שבועית. המדריכה עוברת על התוכנית לפני שימוש.</div><div className="filters"><MultiChoice label="אזור — בחירה מרובה" options={allRegions} selected={regions} onChange={setRegions}/><MultiChoice label="ציוד — בחירה מרובה" options={allEquipment} selected={equipments} onChange={setEquipments}/><label className="field">שבועות<input type="number" min="2" max="12" value={programWeeks} onChange={e=>setProgramWeeks(+e.target.value)}/></label><label className="field">אימונים בשבוע<input type="number" min="1" max="5" value={programFreq} onChange={e=>setProgramFreq(+e.target.value)}/></label></div><div className="music"><strong>🎧 פלייליסט לתוכנית — אופציונלי</strong><div className="filters"><input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="שם הפלייליסט"/><input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="קישור Spotify"/></div></div><button className="btn primary" onClick={buildProgram}>צרי תוכנית</button></section>}

  {tab==="workout"&&workout&&<section className="panel"><div className="row between v25-workout-head"><div><div className="v25-eyebrow">BISS WORKOUT</div><h2>{workout.title}</h2><div className="sub">{workout.meta}</div></div><div className="v25-alt-wrap"><button className="btn v25-alt-btn" onClick={buildWorkout}>צור אימון חלופי</button><span className="small">אותם פרמטרים, שילוב תרגילים חדש</span></div></div>{workout.limitationLabels?.length>0&&<div className="safe" style={{margin:"12px 0"}}><strong>התאמות פעילות:</strong> {workout.limitationLabels.join(" · ")}{workout.limitationNote&&<div className="small">הערת מדריכה: {workout.limitationNote}</div>}</div>}{workout.musicUrl&&<div className="music">🎧 <a href={workout.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {workout.musicTitle}</a></div>}<div className="section-title v25-section-title"><span className="dot blue"/><strong>חימום</strong><span className="v25-count">{workout.warm.length} שלבים</span></div>{workout.warm.map((x,i)=><div className="workout-item v24-workout-item v25-warm-item" key={x}><span className="v25-mini-index">{i+1}</span><span>{x}</span></div>)}<div className="section-title v25-section-title"><span className="dot"/><strong>חלק מרכזי</strong><span className="v25-count">{workout.exercises.length} תרגילים</span></div>{workout.exercises.map((x,i)=>{const issues=exerciseIssues(x),alt=alternatives[x.id];return <Link className="workout-item v24-workout-item v25-exercise-card" key={x.id} href={`/exercise/${x.id}?from=workout`}><div className="v25-exercise-index">{String(i+1).padStart(2,"0")}</div><div className="v25-exercise-body"><div className="v25-exercise-title"><strong>{x.he}</strong><span>{x.en}</span></div><div className="v25-prescription">{x.prescription}</div><div className="v25-meta"><span>{x.equipment}</span><span>{x.level}</span>{x.supersetGroup&&<span className="tag v28-superset-tag">סופר סט {x.supersetGroup}{x.supersetSlot}</span>}</div><div className="v25-cue"><strong>דגש:</strong> {x.cue}</div><span className="btn v25-open-btn">פתח תרגיל ←</span>{x.allocation&&<div className="notice" style={{marginTop:7}}>{x.allocation}</div>}{x.regression&&<div className="small">רגרסיה: {x.regression}</div>}{issues.length>0&&<div className="notice" style={{marginTop:8}}><strong>⚠️ התאמה נדרשת: {issues.join(", ")}</strong><div className="small">התרגיל נשאר לקבוצה, ולמתאמנת עם המגבלה ניתן לבחור חלופה אישית.</div><button className="btn" style={{marginTop:8}} onClick={(e)=>{e.preventDefault();chooseAlternative(x)}}>הצג תרגיל חלופי</button></div>}{alt&&<div className="safe" style={{marginTop:8}}><strong>חלופה מוצעת: {alt.he} <span className="small">({alt.en})</span></strong><div className="small">{alt.equipment} · {alt.cue}</div><div style={{marginTop:7}}><Link className="btn" href={`/exercise/${alt.id}`}>פתח חלופה</Link></div>{alt.regression&&<div className="small">קל יותר: {alt.regression}</div>}<button className="btn" style={{marginTop:8}} onClick={(e)=>{e.preventDefault();chooseAlternative(x)}}>חלופה אחרת</button></div>}</div></Link>})}<div className="section-title v25-section-title"><span className="dot red"/><strong>שחרור</strong><span className="v25-count">{workout.cool.length} שלבים</span></div>{workout.cool.map((x,i)=><div className="workout-item v24-workout-item v25-warm-item" key={x}><span className="v25-mini-index">{i+1}</span><span>{x}</span></div>)}<ShareButtons type="workout" payload={workout}/><div className="safe" style={{marginTop:12}}>האימון נועד לשמש כלי עבודה למדריכה. יש להתאים עומס, טווח, קצב ותרגיל לפי המתאמנות בפועל.</div></section>}

  {tab==="homeworkResult"&&homework&&<section className="panel"><h2>{homework.title}</h2><div className="sub">{homework.meta}</div>{homework.musicUrl&&<div className="music">🎧 <a href={homework.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {homework.musicTitle}</a></div>}{homework.note&&<div className="safe" style={{margin:"12px 0"}}>הערת המדריכה: {homework.note}</div>}{homework.items.map((x,i)=><div className="workout-item v24-workout-item" key={x.id}><strong>{i+1}. {x.he}</strong><div>{x.prescription}</div><div className="small">{x.cue}</div><div style={{marginTop:7}}><Link className="btn" href={`/exercise/${x.id}`}>פתח תרגיל</Link></div></div>)}<ShareButtons type="homework" payload={homework}/></section>}
  {tab==="programResult"&&program&&<section className="panel"><h2>{program.title}</h2><div className="sub">{program.meta}</div>{program.musicUrl&&<div className="music">🎧 <a href={program.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {program.musicTitle}</a></div>}{program.sessions.map((s,i)=><div className="card" style={{marginTop:10}} key={i}><h3>{s.name}</h3><div className="small">התקדמות: {s.progression}</div>{s.items.map((x,j)=><div className="workout-item v24-workout-item" key={x.id+j}><strong>{x.he}</strong> · {x.prescription}</div>)}</div>)}<ShareButtons type="program" payload={program}/></section>}

  {tab==="equipment"&&<section className="panel"><div className="row between"><div><h2>מלאי הסטודיו</h2><div className="sub">הכמויות משמשות את מנגנון חלוקת התחנות.</div></div><div className="kpi">{inventory.reduce((s,x)=>s+(x.active===false?0:x.quantity),0)}</div></div><div className="grid">{inventory.map((x,i)=><article className={`card inventory-card ${x.active===false?"unavailable":""}`} key={x.id||i}><h3>{x.name_he}</h3><div className="small">{x.name_en}</div><p><strong>{x.quantity}</strong> יחידות {x.active===false&&"· לא זמין כרגע"}</p>{x.details&&<div className="small">{x.details}</div>}{x.id&&<div className="row" style={{marginTop:10}}><button className="btn" onClick={()=>changeQty(x,-1)}>−</button><button className="btn" onClick={()=>changeQty(x,1)}>+</button><button className="btn" onClick={()=>toggleItem(x)}>{x.active===false?"החזרה לזמין":"לא זמין"}</button><button className="btn red" onClick={()=>deleteItem(x)}>מחיקה</button></div>}</article>)}</div><div className="admin"><h3>ניהול ציוד</h3><div className="small">פעולות שינוי דורשות PIN מנהל. בהוספת ציוד חדש המערכת יוצרת אוטומטית תרגילים, מחברת סרטוני הדגמה ומשלבת אותם בספרייה ובמחולל האימונים.</div><div className="filters"><label className="field">PIN<input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN מנהל"/></label></div><form className="filters" onSubmit={addEquipment}><input name="name" required placeholder="שם הציוד בעברית"/><input name="nameEn" placeholder="שם באנגלית"/><input name="quantity" type="number" min="0" required placeholder="כמות"/><input name="category" placeholder="קטגוריה"/><input name="details" placeholder="פרטים / משקל"/><button
  className="btn primary"
  type="submit"
  disabled={savingEquipment}
>
  {savingEquipment ? "שומר..." : "הוספת ציוד"}
</button></form>{adminMsg&&<div className="notice">{adminMsg}</div>}</div></section>}
  <style>{`
    .v28-multi-field{grid-column:span 2}
    .v28-multi-choice{display:flex;flex-wrap:wrap;gap:7px;padding:9px;border:1px solid #dce4de;border-radius:15px;background:#fcfdfc;min-height:46px}
    .v28-choice{border:1px solid #dce4de;background:#fff;border-radius:999px;padding:8px 12px;cursor:pointer;font:inherit;font-size:12px;font-weight:800;color:#536058}
    .v28-choice:hover{border-color:#a9cdb7}
    .v28-choice.selected{background:#17201b;color:#fff;border-color:#17201b;box-shadow:0 5px 14px rgba(23,32,27,.12)}
    .v28-multi-choice .v28-choice:first-child.selected{background:#238456;border-color:#238456}
    @media(max-width:760px){.v28-multi-field{grid-column:1/-1}.v28-multi-choice{max-height:190px;overflow:auto}.v28-choice{padding:9px 11px}}
  `}</style>
  <footer className="footer">BISS · מערכת עבודה פנימית לסטודיו · V2.8.1</footer>
 </main>
}