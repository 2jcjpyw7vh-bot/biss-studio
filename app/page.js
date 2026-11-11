"use client";
import {Fragment,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import equipmentSeed from "../data/equipment.json";
import exercisesSeed from "../data/exercises.json";
import {availableExerciseEquipment,exerciseEquipmentLabel,EQUIPMENT_CATEGORY_OPTIONS} from "../lib/equipment-families";
import {BLOCKS,FINISHER_TITLE,SUPERSET,UPPER_BODY,LOWER_BODY,STRUCTURES,matchesBodyRegion,planWorkoutBlocks,planFinisher,planBoneSets,planSupersets,planTimedStructure,workoutEquipment} from "../lib/workout-structure";
import {BONE_TYPE,BONE_NOTICE,boneExercisesForLevel} from "../lib/bone-strength";
import {BARRE_TYPE,BARRE_EQUIPMENT,BARRE_MAX_PARTICIPANTS,BARRE_STRUCTURES,BARRE_NOTICE,barreCapacity,planBarreWorkout} from "../lib/barre";
import ContinuityPanel from "./continuity/ContinuityPanel";
import TeamPanel from "./team/TeamPanel";
import SaveWorkoutPanel from "./continuity/SaveWorkoutPanel";
import SavePersonalWorkout from "./continuity/SavePersonalWorkout";
import ArboxPanel from "./integrations/ArboxPanel";
import SaveProgramPanel from "./programs/SaveProgramPanel";
import ProgramResult from "./programs/ProgramResult";
import {programPlaylistUrl,programSessionWorkout} from "../lib/program-session";
import {rememberWorkout,workoutDraft} from "./workout-navigation";
import WorkoutTiming from "./WorkoutTiming";
import StationRotation from "./StationRotation";
import {planStationRotation} from "../lib/station-rotation";
import {publicWorkoutShare} from "../lib/public-workout-share";
import {studioShareMessage} from "../lib/studio-share-message";
import {requestWorkoutTask} from "../lib/workout-task-client";
import {taskLimitations,taskWorkoutTypes} from "../lib/workout-task";
import IntervalTimer from "./IntervalTimer";

const levels=["מתחילים","בינוניים","מתקדמים","מעורב"];
const workoutTypes=[
  {id:"classic",label:"אימון סטודיו",description:"אימון כללי לפי האזורים, המבנה והציוד שנבחרו."},
  {id:"functional",label:"Functional Training",description:"כוח, יציבות ותנועה רב־מפרקית בקצב נשלט."},
  {id:"functional-hiit",label:"Functional HIIT",description:"אינטרוולים פונקציונליים עם התאמת עבודה ומנוחה לרמה."},
  {id:BARRE_TYPE,label:"אימון בר · Barre",description:"אימון קבוצתי מונחה ליד הבר הקבוע, עד 7 משתתפות."},
  {id:BONE_TYPE,label:"חיזוק עצם · Bone Strengthening",description:"שיעור מודרך של התנגדות מבוקרת ושיווי משקל לפי התאמה."}
];
const boneStructures=[BLOCKS,"סטים וחזרות"];
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
 const [taskState,setTaskState]=useState(null);
 const [taskSaving,setTaskSaving]=useState(false);
 const [taskMessage,setTaskMessage]=useState("");
 const task=taskState?.task;
 const [offerWorkout,setOfferWorkout]=useState(null);
 const [regions,setRegions]=useState([]),[equipments,setEquipments]=useState([]),[q,setQ]=useState("");
 const [people,setPeople]=useState(12),[minutes,setMinutes]=useState(50),[level,setLevel]=useState("מעורב"),[structure,setStructure]=useState("תחנות");
 const [workoutType,setWorkoutType]=useState("classic");
 const [includeFinisher,setIncludeFinisher]=useState(false);
 const [blockTrios,setBlockTrios]=useState(false);
 const [trioError,setTrioError]=useState("");
 const [musicUrl,setMusicUrl]=useState(""),[musicTitle,setMusicTitle]=useState("");
 const [workout,setWorkout]=useState(null),[program,setProgram]=useState(null),[homework,setHomework]=useState(null);
 const [inventory,setInventory]=useState(equipmentSeed),[pin,setPin]=useState(""),[adminMsg,setAdminMsg]=useState("");
 const [inventoryStatus,setInventoryStatus]=useState("loading");
  const [savingEquipment,setSavingEquipment]=useState(false);
 const [homeGoal,setHomeGoal]=useState("חיזוק"),[homeFreq,setHomeFreq]=useState(3),[homeMinutes,setHomeMinutes]=useState(10),[homeNote,setHomeNote]=useState("");
 const [programWeeks,setProgramWeeks]=useState(4),[programFreq,setProgramFreq]=useState(2);
 const [programMusic,setProgramMusic]=useState({musicUrl:"",musicTitle:""});
 const [exerciseMusic,setExerciseMusic]=useState({});
 const [limitations,setLimitations]=useState([]);
 const [limitationNote,setLimitationNote]=useState("");
 const [alternatives,setAlternatives]=useState({});
 const [exerciseLibrary,setExerciseLibrary]=useState(exercisesSeed);
 const [libraryLoading,setLibraryLoading]=useState(true);
 useEffect(()=>{
   setTrioError("");
 },[blockTrios,equipments,regions,people,minutes,level,structure,workoutType,includeFinisher,limitations]);
 useEffect(()=>{
   const query=new URLSearchParams(window.location.search);
   const requested=query.get("tab");
   const taskId=query.get("buildTask");
   if(taskId!==null){
     setTaskState({loading:true});
     requestWorkoutTask(`?id=${encodeURIComponent(taskId)}`).then(result=>{
       const {frame,workout:submitted}=result.task;
       const draft=requested==="workout"?workoutDraft():null;
       setWorkoutType(frame.type);
       setMinutes(frame.duration);
       setPeople(frame.participants);
       setLimitations(frame.limitations);
       if(submitted){
         setWorkout(submitted);
         setAlternatives(submitted.alternatives||{});
         setTab("workout");
       }else if(draft?.taskId===taskId){
         setWorkout(draft.workout);
         setAlternatives(draft.alternatives);
         setRegions(draft.regions);
         setEquipments(draft.equipments);
         setLevel(draft.level);
         setStructure(draft.structure);
         setIncludeFinisher(draft.includeFinisher);
         setBlockTrios(Boolean(draft.blockTrios));
         setMusicUrl(draft.musicUrl);
         setMusicTitle(draft.musicTitle);
         setTab("workout");
       }else{
         if(frame.type===BARRE_TYPE)setStructure(BARRE_STRUCTURES[0]);
         if(frame.type===BONE_TYPE){setStructure(BLOCKS);setIncludeFinisher(true);}
         setTab("builder");
       }
       setTaskState(result);
     }).catch(error=>setTaskState({error:error.message,login:error.status===401}));
   }
   if(requested==="exercises")setTab("exercises");
   if(requested==="equipment")setTab("equipment");
   if(requested==="integrations")setTab("integrations");
   if(requested==="workout"&&taskId===null){
     const draft=workoutDraft();
     if(draft){
       setWorkout(draft.workout);
       setAlternatives(draft.alternatives);
       setRegions(draft.regions);
       setEquipments(draft.equipments);
       setPeople(draft.people);
       setMinutes(draft.minutes);
       setLevel(draft.level);
       setStructure(draft.structure);
       setWorkoutType(draft.workoutType);
       setIncludeFinisher(draft.includeFinisher);
       setBlockTrios(Boolean(draft.blockTrios));
       setMusicUrl(draft.musicUrl);
       setMusicTitle(draft.musicTitle);
       setLimitations(draft.limitations);
       setLimitationNote(draft.limitationNote);
       setTab("workout");
     }
   }
   refreshInventory();
   refreshExercises();
 },[]);

 const isBarre=workoutType===BARRE_TYPE;
 const barreAvailable=barreCapacity(inventory)>0;
 const validBarreSize=Number.isInteger(people)&&people>=1&&people<=BARRE_MAX_PARTICIPANTS;
 const barreExercises=exerciseLibrary.filter(x=>x.barreGroup==="standing"||x.barreGroup==="control");
 const barreRegions=["הכל",UPPER_BODY,LOWER_BODY,...new Set(barreExercises.map(x=>x.region))];

 const allRegions=useMemo(()=>["הכל",UPPER_BODY,LOWER_BODY,...Array.from(new Set(exerciseLibrary.map(x=>x.region).filter(x=>x&&x!==UPPER_BODY&&x!==LOWER_BODY)))],[exerciseLibrary]);
 const allEquipment=useMemo(()=>{
   return ["הכל",...availableExerciseEquipment(exerciseLibrary,inventory)];
 },[exerciseLibrary,inventory]);

 const matchesRegion=x=>matchesBodyRegion(x.region,regions);
 const matchesEquipment=x=>equipments.length===0||equipments.includes(x.equipment)||equipments.includes(exerciseEquipmentLabel(x.equipment,inventory));
 const regionLabel=regions.length?regions.join(" + "):"כל הגוף";
 const equipmentLabel=equipments.length?equipments.join(" + "):"כל הציוד";

 const filtered=useMemo(()=>exerciseLibrary.filter(x=>{
   const text=(x.he+" "+x.en+" "+x.muscles+" "+x.pattern+" "+x.goal+" "+x.equipment).toLowerCase();
   return matchesRegion(x)&&matchesEquipment(x)&&text.includes(q.trim().toLowerCase());
 }),[exerciseLibrary,regions,equipments,q]);

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
     add(rand(pool.filter(x=>(x.equipment===eq||exerciseEquipmentLabel(x.equipment,inventory)===eq)&&!used.has(x.id)))[0]);
     if(chosen.length>=count)return chosen.slice(0,count);
   }
   for(const bodyRegion of regions){
     add(rand(pool.filter(x=>matchesBodyRegion(x.region,[bodyRegion])&&!used.has(x.id)))[0]);
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
   const index=workout?.exercises.findIndex(item=>item.id===x.id)??-1;
   const section=workout?.sections?.findLast(item=>item.start<=index);
   const constrained=workout?.structure===BLOCKS||section?.title===FINISHER_TITLE;
   const originalEquipment=workoutEquipment(x,inventory).key;
   if(workout?.type===BARRE_TYPE){
     return barreExercises.find(a=>a.id!==x.id&&a.region===x.region&&a.barreGroup===x.barreGroup&&!exerciseIssues(a).length)||null;
   }
   if(workout?.type===BONE_TYPE){
     return boneExercisesForLevel(workout.level).find(a=>
       a.id!==x.id && a.pattern===x.pattern && a.closing===x.closing &&
       !exerciseIssues(a).length && (a.equipment==="ללא ציוד" ||
         (workoutEquipment(a,inventory).key===originalEquipment&&workoutEquipment(a,inventory).capacity>0))
     )||null;
   }
   const candidates=exerciseLibrary.filter(a=>{
     if(a.id===x.id || exerciseIssues(a).length || workoutEquipment(a,inventory).capacity<=0) return false;
     if(constrained&&a.equipment!=="ללא ציוד"&&workoutEquipment(a,inventory).key!==originalEquipment) return false;
     const sameGoal=a.goal===x.goal;
     const sameRegion=a.region===x.region;
     const available=equipments.length===0 || equipments.includes(a.equipment) || equipments.includes(exerciseEquipmentLabel(a.equipment,inventory)) || a.equipment==="ללא ציוד";
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
 function openWorkoutExercise(id){
   rememberWorkout({
     workout,alternatives,regions,equipments,people,minutes,level,structure,
     workoutType,includeFinisher,blockTrios,musicUrl,musicTitle,limitations,limitationNote,taskId:task?.id
   },id);
 }
 function selectWorkoutType(type){
   if(task||type===workoutType)return;
   setWorkoutType(type);
   if(type===BARRE_TYPE){
     setPeople(value=>Math.min(value||BARRE_MAX_PARTICIPANTS,BARRE_MAX_PARTICIPANTS));
     setStructure(BARRE_STRUCTURES[0]);
     setRegions([]);
     setEquipments([]);
   }else if(type===BONE_TYPE){
     setStructure(BLOCKS);
     setIncludeFinisher(true);
     if(level==="מתקדמים")setLevel("בינוניים");
   }
 }
 function showWorkout({duration,participants,equipment,exercises,sections,warm,cool,warnings,transitionMinutes,stationRotation}){
   const type=workoutTypes.find(x=>x.id===workoutType);
   setAlternatives({});
   setWorkout({
     saveId:crypto.randomUUID(),
     title:`BISS · ${type.label}${regions.length?` · ${regionLabel}`:""}`,
     meta:`${duration} דק׳ · ${participants} משתתפות · ${structure} · ${level} · ${equipment}`,
     limitations:[...limitations],limitationLabels:limitationProfiles.filter(p=>limitations.includes(p.id)).map(p=>p.label),limitationNote,
     musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"מוזיקה לאימון",
     type:workoutType,level,structure,durationMinutes:duration,participants,warm,exercises,sections,cool,warnings,transitionMinutes,stationRotation
   });
   setTab("workout");
 }
 function buildWorkout(){
   if(task&&(!taskState.canSubmit||task.submitted_at))return;
   const duration=Math.max(20,Math.min(90,Math.round(minutes)||50));
   const participants=Math.max(1,Math.min(40,Math.round(people)||1));
   if(isBarre){
     const finisher=includeFinisher&&exerciseLibrary.find(x=>x.barreGroup==="finisher"&&!exerciseIssues(x).length);
     const plan=planBarreWorkout({pool:rand(barreExercises.filter(matchesRegion)),finisher,inventory,participants:people,minutes:duration,structure,level});
     if(plan.error){alert(plan.error);return;}
     if(includeFinisher&&!finisher)plan.warnings.push("לא נמצא פינישר מתאים להתאמות שנבחרו. הזמן הוקצה לחלק המרכזי.");
     showWorkout({...plan,duration,participants:people,equipment:BARRE_EQUIPMENT});
     return;
   }
   const bone=workoutType===BONE_TYPE;
   const preferLevel=items=>rand(items).sort((a,b)=>level==="מעורב"?0:Number(b.level===level)-Number(a.level===level));
   const catalog=bone?boneExercisesForLevel(level):exerciseLibrary;
   const finisherPool=includeFinisher?preferLevel(catalog.filter(x=>exerciseIssues(x).length===0)):[];
   const matchesBoneRegion=x=>matchesRegion(x)||(structure===BLOCKS&&regions.includes(UPPER_BODY)&&x.region==="ליבה");
   const candidates=bone?catalog.filter(x=>!x.closing&&matchesBoneRegion(x)&&matchesEquipment(x)):filtered;
   let pool=candidates.filter(x=>!["שחרור","מוביליטי","מתיחות"].includes(x.goal)&&workoutEquipment(x,inventory).capacity>0);
   const boneFinish=bone&&structure!==BLOCKS?planFinisher(finisherPool,duration,0,BONE_TYPE):null;
   const warmMinutes=duration<30?4:6,coolMinutes=duration<30?3:5;
   const strengthMinutes=duration-warmMinutes-coolMinutes-(boneFinish?.minutes||0);
   if(bone&&structure!==BLOCKS)pool=pool.filter(x=>workoutEquipment(x,inventory).capacity>=participants);
   const trios=structure===BLOCKS&&participants===9&&blockTrios;
   const planBlocks=items=>planWorkoutBlocks({pool:preferLevel(items),inventory,people:participants,minutes:duration,level,type:workoutType,finisherPool,regions,trios});
   let blockPlan=structure===BLOCKS?planBlocks(pool):null;
   const boneSupplement=bone&&equipments.length?catalog.filter(x=>!x.closing&&matchesBoneRegion(x)&&
     x.equipment==="ללא ציוד"&&!exerciseIssues(x).length&&!pool.some(item=>item.id===x.id)):[];
   const blockSupplement=trios&&!bone&&equipments.length?catalog.filter(x=>matchesRegion(x.region)&&
     x.equipment==="ללא ציוד"&&x.level!=="מתקדמים"&&
     !["שחרור","מוביליטי","מתיחות"].includes(x.goal)&&!exerciseIssues(x).length&&!pool.some(item=>item.id===x.id)):boneSupplement;
   if(blockPlan?.error&&blockSupplement.length){
     const extraPlan=planBlocks([...pool,...blockSupplement]);
     if(!extraPlan.error)extraPlan.warnings.push(bone?"נוספו תרגילי חיזוק עצם ללא ציוד כדי להשלים את הבלוקים.":"נוספו תרגילים ללא ציוד כדי להשלים את הבלוקים.");
     blockPlan=extraPlan;
   }
   if(blockPlan?.error){
     if(trios){
       setTrioError(blockPlan.error);
       setTab("builder");
     } else {
       alert(blockPlan.error);
     }
     return;
   }
   setTrioError("");
   if(!blockPlan&&level!=="מעורב"){
     const leveled=pool.filter(x=>x.level===level);
     if(leveled.length>=4)pool=leveled;
   }
   if(!blockPlan&&!bone&&workoutType!=="classic"){
     const functionalPatterns=["squat","lunge","hinge","push","pull","carry","rotation","plank","step","single leg","balance"];
     const functional=pool.filter(x=>functionalPatterns.some(pattern=>(x.pattern||"").toLowerCase().includes(pattern))||["חיזוק","יציבות","אירובי"].includes(x.goal));
     if(functional.length>=5)pool=functional;
   }
   const pyramidBudget=duration-warmMinutes-coolMinutes-(includeFinisher?(duration<30?2:4):0);
   if(bone&&!blockPlan&&pool.length<(duration>=30?3:2)){
     pool=[...pool,...boneSupplement];
     if(pool.length<(duration>=30?3:2)){
       alert(`נמצאו ${pool.length} תרגילי חיזוק עצם מתאימים לסטים וחזרות. הרחיבי את בחירת האזור או הציוד, או בדקי את גודל הקבוצה.`);
       return;
     }
   }
   const targetCount=Math.min(bone?Math.min(6,Math.floor(strengthMinutes/3)):structure==="תחנות"?8:structure==="פירמידה"?Math.min(6,Math.floor(pyramidBudget/3)):6,pool.length);
   const useRotation=!bone&&structure==="תחנות";
   const chosen=blockPlan?[]:structure===SUPERSET
     ? buildSupersetSelection(pool)
     : buildBalancedSelection(pool,useRotation?pool.length:targetCount);
   const supplement=useRotation&&equipments.length
     ? preferLevel(catalog.filter(x=>x.equipment==="ללא ציוד"&&matchesRegion(x.region)&&
       !["שחרור","מוביליטי","מתיחות"].includes(x.goal)&&!exerciseIssues(x).length&&!chosen.some(y=>y.id===x.id)))
     : [];
   const rotationPool=useRotation?[...chosen,...supplement]:[];
   const boneSets=bone&&!blockPlan?planBoneSets(chosen,strengthMinutes,level):null;
   const stations=(useRotation?[]:(boneSets?.exercises||chosen)).map(x=>{
     const {capacity}=workoutEquipment(x,inventory);
     return {...x,
       allocation:capacity<participants?`זמינות ${capacity} יח׳ של ${exerciseEquipmentLabel(x.equipment,inventory)} ל־${participants} משתתפות — נדרשת רוטציה או חלופה.`:""};
   });
   const rotationPreview=useRotation?planStationRotation(rotationPool,inventory,participants,duration-warmMinutes-coolMinutes,workoutType,level):null;
   if(useRotation&&!rotationPreview){
     alert("לא ניתן לשבץ את כל המשתתפות לפי הציוד, הבחירה והזמן. הגדילי את משך האימון, הרחיבי את הבחירה או הקטיני את הקבוצה.");
     return;
   }
   const selectedStations=rotationPreview?.exercises||stations;
   const finisher=blockPlan?null:bone?boneFinish:planFinisher(finisherPool.filter(x=>!selectedStations.some(y=>y.id===x.id)),duration,selectedStations.length);
   const mainMinutes=duration-warmMinutes-coolMinutes-(finisher?.minutes||0);
   const rotationPlan=useRotation&&finisher
     ? planStationRotation(rotationPool,inventory,participants,mainMinutes,workoutType,level)
     : rotationPreview;
   if(useRotation&&!rotationPlan){
     alert("הרוטציה אינה נכנסת בזמן שנותר עם הפינישר. הגדילי את משך האימון או הסירי את הפינישר.");
     return;
   }
   const mainDetail=boneSets?.preparationMinutes? `${mainMinutes} דק׳ · ${boneSets.preparationMinutes} דק׳ הכנה ותרגול טכניקה, ואז התרגילים לפי הזמנים הרשומים` : `${mainMinutes} דק׳ · כולל הדגמה, עבודה, מנוחה ומעברים`;
   const timedPlan=rotationPlan||(bone||blockPlan?null:structure===SUPERSET
     ? planSupersets(stations,mainMinutes,workoutType,level)
     : planTimedStructure(stations,mainMinutes,structure,workoutType,level));
   const mainSections=timedPlan?.sections||(stations.length?[{start:0,title:bone?"עבודת התנגדות":"חלק מרכזי",detail:mainDetail}]:[]);
   const sections=blockPlan?.sections||[...mainSections,...(finisher?[{...finisher.section,start:selectedStations.length}]:[])];
   const exercises=blockPlan?.exercises||[...(timedPlan?.exercises||stations),...(finisher?.exercises||[])];
   const warnings=blockPlan?.warnings||(!selectedStations.length?["לא נמצאו תרגילים מרכזיים מתאימים לפי הבחירה והמלאי. נסו להרחיב את הסינון."]:[]);
   if(bone&&!blockPlan&&chosen.some(exercise=>boneSupplement.some(item=>item.id===exercise.id)))warnings.push("נוספו תרגילי חיזוק עצם ללא ציוד כדי להשלים את האימון.");
   if(rotationPlan?.exercises.some(exercise=>supplement.some(item=>item.id===exercise.id)))warnings.push("נוספו תחנות ללא ציוד כדי להשלים את שיבוץ המשתתפות.");
   if(includeFinisher&&!(blockPlan?blockPlan.finisherMinutes:finisher))warnings.push(bone?"לא נמצאה אפשרות מתאימה לסיום הקבוצתי.":"לא נמצאו תרגילי ליבה מתאימים לפינישר קבוצתי ללא ציוד.");
   if(!(blockPlan?sections.some(x=>x.title.startsWith("בלוק")):selectedStations.length)){
     alert(warnings.join("\n"));
     return;
   }
   const warm=blockPlan||bone?[`${warmMinutes} דק׳ · חימום הדרגתי והדגמת התרגילים`]:workoutType==="functional-hiit"?["העלאת דופק הדרגתית","מוביליטי דינמי","סבב הכנה טכני בקצב קל"]:["העלאת דופק הדרגתית","מוביליטי למפרקים הרלוונטיים","חזרה טכנית על דפוסי התנועה המרכזיים"];
   if(!blockPlan&&!bone)warm.unshift(`${warmMinutes} דק׳ לחימום`);
   const cool=blockPlan||bone?[`${coolMinutes} דק׳ · הורדת דופק, נשימה ומוביליטי עדין`]:["הורדת דופק ונשימה","מתיחות ומוביליטי עדינים לפי האזורים שעבדו"];
   if(!blockPlan&&!bone)cool.unshift(`${coolMinutes} דק׳ לשחרור`);
   showWorkout({duration,participants,equipment:equipmentLabel,exercises,sections,warm,cool,warnings,transitionMinutes:blockPlan?.transition||0,stationRotation:rotationPlan?.stationRotation});
 }
 function buildHomework(){
   let pool=exerciseLibrary.filter(x=>matchesRegion(x)&&matchesEquipment(x)&&x.goal===homeGoal);
   if(pool.length<3)pool=exerciseLibrary.filter(x=>matchesRegion(x)&&(homeGoal==="שחרור"?["שחרור","מוביליטי","מתיחות"].includes(x.goal):x.goal===homeGoal));
   const items=rand(pool).slice(0,4).map(x=>({...x,prescription:homeGoal==="חיזוק"?"2–3 סטים × 8–12 חזרות":"30–45 שנ׳ או 6–8 חזרות איטיות × 2"}));
   setHomework({title:`שיעורי בית · ${regions.length?regionLabel:homeGoal}`,meta:`כ-${homeMinutes} דקות · ${homeFreq} פעמים בשבוע · ${equipmentLabel}`,goal:homeGoal,note:homeNote,items,musicUrl:normalizeUrl(musicUrl),musicTitle:musicTitle||"מוזיקה"}); setTab("homeworkResult");
 }
 function buildProgram(){
   const sessions=[];
   if(!Number.isInteger(programWeeks)||programWeeks<2||programWeeks>12||!Number.isInteger(programFreq)||programFreq<1||programFreq>5){
     alert("בחרי 2–12 שבועות ו־1–5 אימונים בשבוע.");
     return;
   }
   const playlistUrl=programPlaylistUrl(programMusic.musicUrl);
   if(programMusic.musicUrl.trim()&&!playlistUrl){alert("הזיני קישור לפלייליסט שמתחיל ב־https:// או http://.");return;}
   const eligibleExercises=exerciseLibrary.filter(x=>matchesRegion(x)&&matchesEquipment(x)&&x.goal==="חיזוק");
   if(!eligibleExercises.length){alert("לא נמצאו תרגילי חיזוק שמתאימים לבחירה. נסי לשנות את אזור הגוף או הציוד.");return;}
   for(let i=0;i<programWeeks*programFreq;i++){
     const week=Math.floor(i/programFreq)+1;
     const chosen=rand(eligibleExercises).slice(0,6);
     const progression=week===1?"בסיס טכני ועומס שמרני":week===2?"תוספת 1–2 חזרות או מעט משקל":week===3?"העלאת עומס/מורכבות תוך שמירת טכניקה":"התקדמות מבוקרת לפי איכות ביצוע";
     sessions.push({name:`שבוע ${week} · אימון ${(i%programFreq)+1}`,progression,items:chosen.map((x,j)=>({...x,prescription:week<=2?`${10+j%3} חזרות × 3 סטים`:`${8+j%3} חזרות × 3–4 סטים`}))});
   }
   setProgram({title:`תוכנית BISS · ${programWeeks} שבועות`,meta:`${programFreq} אימונים בשבוע · ${regions.length?regionLabel:"Full Body"} · ${equipmentLabel}`,sessions,musicUrl:playlistUrl,musicTitle:programMusic.musicTitle.trim()||"פלייליסט לתוכנית"}); setTab("programResult");
 }
 async function createShare(type,payload){const r=await fetch("/api/share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,payload})});const d=await r.json();if(!r.ok)throw new Error(d.error||"לא ניתן ליצור קישור");return d.url}
 async function share(type,payload,channel="copy"){
   try{const url=await createShare(type,type==="workout"?publicWorkoutShare(payload):payload),title=payload.title||payload.he||"BISS",text=studioShareMessage(type,title,url);
     if(channel==="whatsapp")window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");
     else if(channel==="email")window.location.href=`mailto:?subject=${encodeURIComponent(title+" | BISS")}&body=${encodeURIComponent(text)}`;
     else{await navigator.clipboard.writeText(url);alert("הקישור הועתק")}
   }catch(e){alert(`${e.message}. כדי שקישורים יעבדו בין מכשירים יש להשלים חיבור Supabase.`)}
 }
 function exerciseLink(x){return `${window.location.origin}/exercise/${encodeURIComponent(x.id)}`}
 async function shareExercise(x,channel="copy"){
   const url=exerciseLink(x),title=`${x.he} (${x.en})`,text=studioShareMessage("exercise",title,url);
   if(channel==="whatsapp")window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");
   else if(channel==="email")window.location.href=`mailto:?subject=${encodeURIComponent(title+" | BISS")}&body=${encodeURIComponent(text)}`;
   else{await navigator.clipboard.writeText(url);alert("קישור התרגיל הועתק")}
 }
 async function refreshInventory(strict=false){setInventoryStatus("loading");try{const r=await fetch("/api/equipment",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"לא ניתן לטעון את המלאי");if(!Array.isArray(d))throw new Error("התקבלה תשובה לא תקינה מהמסד");setInventory(d);setInventoryStatus("connected");return d}catch(error){setInventoryStatus("error");setAdminMsg(`⚠️ ${error.message}. השינויים אינם זמינים עד לחידוש החיבור.`);if(strict)throw error;return null}}
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
    await Promise.all([refreshInventory(true),refreshExercises()]);
  }catch(err){
    setAdminMsg(`⚠️ ${err.message}`);
  }finally{
    setSavingEquipment(false);
  }
}
  async function changeQty(item,delta){try{const quantity=Math.max(0,item.quantity+delta);await adminRequest("PATCH",{id:item.id,quantity});await refreshInventory(true);setAdminMsg(`✓ ${item.name_he}: הכמות ${quantity} נשמרה במסד`) }catch(e){setAdminMsg(`⚠️ ${e.message}`)}}
 async function toggleItem(item){try{await adminRequest("PATCH",{id:item.id,active:item.active===false});await refreshInventory(true);setAdminMsg(`✓ מצב ${item.name_he} נשמר במסד`)}catch(e){setAdminMsg(`⚠️ ${e.message}`)}}
 async function deleteItem(item){if(!confirm(`למחוק את ${item.name_he}?`))return;try{await adminRequest("DELETE",{id:item.id});await refreshInventory(true);setAdminMsg(`✓ ${item.name_he} נמחק מהמסד`)}catch(e){setAdminMsg(`⚠️ ${e.message}`)}}
 const ShareButtons=({type,payload})=><div className="sharebox v24-sharebox"><strong>שיתוף</strong><div className="small">קישור נקי לצפייה, ללא מסכי ניהול.</div><div className="row" style={{marginTop:10}}><button className="btn green" onClick={()=>share(type,payload,"whatsapp")}>WhatsApp</button><button className="btn blue" onClick={()=>share(type,payload,"email")}>מייל</button><button className="btn" onClick={()=>share(type,payload,"copy")}>העתקת קישור</button></div></div>;

 async function submitAssignedWorkout(){
   setTaskSaving(true);
   setTaskMessage("");
   try {
     const result=await requestWorkoutTask("",{action:"submit",id:task.id,workout,alternatives});
     setTaskState(current=>({...current,task:result.task}));
     setWorkout(result.task.workout);
     setAlternatives(result.task.workout.alternatives||{});
     setTaskMessage("האימון נשלח למנהלת ונשמר במשימה.");
   } catch(error) {
     setTaskMessage(error.message||"לא ניתן לשלוח את האימון.");
   } finally {setTaskSaving(false);}
 }

 if(taskState&&!task)return <main className="shell"><section className="panel">
   <h1>משימת בניית אימון</h1>
   <p role="status">{taskState.error||"טוען את המשימה…"}</p>
   {taskState.login&&<Link className="btn primary" href="/login?next=my-sessions">כניסה לחשבון Studio</Link>}
 </section></main>;

 return <main className="shell v26-shell">
  {task&&<section className="panel">
    <div className="row between"><h1>{task.title}</h1><Link className="btn" href="/my-sessions">האימונים שלי</Link></div>
    <p>{taskWorkoutTypes[task.frame.type]} · {new Date(task.starts_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})} · {task.frame.duration} דקות · {task.frame.participants} משתתפות</p>
    <p className="small">התאמות שנקבעו לאימון · {task.frame.limitations.map(limit=>taskLimitations[limit]).join(" · ")||"ללא התאמות"}</p>
    {task.submitted_at?<p className="safe">האימון נשלח למנהלת.</p>:taskState.canSubmit?
      <button className="btn" onClick={()=>setTab("builder")}>בחירת מבנה וציוד</button>:<p className="notice">ממתין להכנת האימון בידי המדריכה.</p>}
    {taskMessage&&<p role="status">{taskMessage}</p>}
  </section>}
  {!task&&<>
  <header className="hero v26-main-hero"><div className="brand"><img className="logo" src="/biss-logo.png" alt="BISS"/><div><div className="eyebrow">BISS STUDIO SYSTEM</div><h1>אימון מדויק. פשוט להפעלה.</h1><div className="sub">בנייה, חיפוש, שיתוף ושיעורי בית — במקום אחד.</div></div></div><div className="top-note small">בנוי לצוות הסטודיו: מהיר בטלפון, ברור בזמן שיעור, ומותאם למלאי הציוד.<div><Link className="btn" href="/login">כניסה אישית לצוות</Link></div></div><Link className="btn mobile-login-link" href="/login">כניסת מנהל / איפוס PIN</Link></header>
  <nav className="tabs v26-tabs" aria-label="ניווט ראשי">{[["builder","בניית אימון"],["continuity","רצף קבוצות"],["team","צוות והרשאות"],["exercises","תרגילים"],["homework","שיעורי בית"],["program","תוכנית"],["equipment","ציוד"],["integrations","חיבורים"]].map(([id,label])=><button key={id} className={tab===id?"active":""} aria-current={tab===id?"page":undefined} onClick={()=>{setTab(id);if(id==="team")setOfferWorkout(null);if(id==="equipment")refreshInventory()}}>{label}</button>)}{workout&&<button className={tab==="workout"?"active":""} onClick={()=>setTab("workout")}>האימון שלי</button>}</nav>

  {tab==="continuity"&&<ContinuityPanel/>}
  {tab==="team"&&<TeamPanel draftWorkout={offerWorkout}/>}
  {tab==="integrations"&&<ArboxPanel/>}
  {tab==="workout"&&workout&&<section className="panel save-workout-shell"><div className="row"><SavePersonalWorkout key={workout.saveId} workout={workout}/><SaveWorkoutPanel workout={workout}/><button className="btn" onClick={()=>{setOfferWorkout(workout);setTab("team");}}>הציעי למחליפה</button></div></section>}
  </>}

  {(tab==="builder"&&(!task||taskState.canSubmit)||tab==="workout"&&workout)&&<IntervalTimer/>}

  {tab==="builder"&&(!task||taskState.canSubmit)&&<section className="panel hero-panel v26-builder-panel"><h2>בניית אימון</h2><div className="sub">{task?"בחרי מבנה, רמה וציוד לפי המסגרת שקיבלת.":"בחרו סוג אימון. המערכת מתאימה את הקצב לרמה ומתחשבת במלאי ובקיבולת התחנות."}</div>{!task&&<div className="v29-workout-types">{workoutTypes.map(type=><button type="button" key={type.id} className={`v29-workout-type ${workoutType===type.id?"selected":""}`} onClick={()=>selectWorkoutType(type.id)}><strong>{type.label}</strong><span>{type.description}</span></button>)}</div>}<div className="filters"><MultiChoice label="אזורי גוף — ניתן לבחור כמה" options={isBarre?barreRegions:allRegions} selected={regions} onChange={setRegions}/>{isBarre?<div className="field v28-multi-field">ציוד נדרש<strong>{BARRE_EQUIPMENT}</strong></div>:<MultiChoice label="משפחות ציוד — ניתן לבחור כמה" options={allEquipment} selected={equipments} onChange={setEquipments}/>}<details className="field v28-multi-field"><summary>פירוט הציוד והכמויות במלאי</summary><p className="small">משקולות יד וקטלבל נבחרים לפי משפחה. כאן מוצגים המשקלים והכמויות בפועל.</p><ul>{inventory.filter(item=>item.active!==false&&item.quantity>0).map(item=><li key={item.id||item.name_he}>{item.name_he} · {item.quantity}{item.name_he==="גלייד דיסק"?" זוגות":""}</li>)}</ul></details><label className="field">מבנה<select value={structure} onChange={e=>setStructure(e.target.value)}>{(isBarre?BARRE_STRUCTURES:workoutType===BONE_TYPE?boneStructures:STRUCTURES).map(x=><option key={x}>{x}</option>)}</select></label><label className="field">רמה<select value={level} onChange={e=>setLevel(e.target.value)}>{(workoutType===BONE_TYPE?levels.filter(x=>x!=="מתקדמים"):levels).map(x=><option key={x}>{x}</option>)}</select></label><label className="field">משתתפות<input type="number" min="1" max={isBarre?BARRE_MAX_PARTICIPANTS:40} aria-invalid={isBarre&&!validBarreSize} value={people} readOnly={Boolean(task)} onChange={e=>setPeople(+e.target.value)}/></label><label className="field">משך בדקות<input type="number" min="20" max="90" value={minutes} readOnly={Boolean(task)} onChange={e=>setMinutes(+e.target.value)}/></label></div>{!isBarre&&structure===BLOCKS&&people===9&&<label className="permission-check"><input type="checkbox" checked={blockTrios} onChange={e=>setBlockTrios(e.target.checked)}/> רוטציה בשלישיות · 3 תחנות בכל בלוק</label>}<label className="permission-check"><input type="checkbox" checked={includeFinisher} onChange={e=>setIncludeFinisher(e.target.checked)}/> {workoutType===BONE_TYPE?"הוספת סיום קבוצתי בשיווי משקל":isBarre?"הוספת פינישר ליבה בעמידה":"הוספת פינישר ליבה קבוצתי"}</label>{workoutType===BONE_TYPE&&<p className="notice">{BONE_NOTICE} ברמת ״מעורב״ משתמשים בתרגילי הבסיס.</p>}{isBarre&&<p className="notice">{BARRE_NOTICE}{!barreAvailable&&" הבר אינו זמין כרגע במלאי."}{!validBarreSize&&" יש להזין מספר משתתפות בין 1 ל־7."}</p>}{!isBarre&&structure===BLOCKS&&<p className="small">{workoutType===BONE_TYPE?"בחיזוק עצם נדרשות לפחות 3 תחנות בכל בלוק באימון של 30 דקות ומעלה. באימון קצר יותר נדרשות לפחות 2.":"עד ארבע תחנות בבלוק."} בחירת פלג גוף אחד יוצרת בלוק ממוקד. בחירת שניהם יוצרת שני בלוקים.</p>}{!task&&<div className="safe" style={{marginTop:14}}>
<strong>התאמות למגבלה / כאב שדווח מראש</strong>
<div className="small">אפשר לבחור יותר מאפשרות אחת. המערכת לא מאבחנת; היא רק מסמנת תרגילים לבדיקה ומציעה חלופה.</div>
<div className="row" style={{marginTop:10}}>{limitationProfiles.map(p=><button type="button" key={p.id} className={`btn ${limitations.includes(p.id)?"active-limit":""}`} onClick={()=>toggleLimitation(p.id)}>{p.label}</button>)}</div>
<label className="field" style={{marginTop:10}}>הערת מדריכה
<input value={limitationNote} onChange={e=>setLimitationNote(e.target.value)} placeholder="למשל: להימנע מכפיפה עמוקה בברך שמאל"/>
</label>
</div>}<div className="music"><strong>🎧 מוזיקה — אופציונלי</strong><div className="filters"><label className="field">שם הפלייליסט / השיר<input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="למשל BISS Strength"/></label><label className="field">קישור Spotify<input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="https://open.spotify.com/..."/></label></div></div>{trioError&&<div className="notice" style={{marginTop:14}}>
  <p role="alert">{trioError}</p>
  <div className="row">
    {equipments.length>0&&<button className="btn" onClick={()=>setEquipments([])}>לאפשר את כל הציוד</button>}
    {workoutType!==BONE_TYPE&&<button className="btn" onClick={()=>setStructure("תחנות")}>לעבור למבנה תחנות</button>}
  </div>
</div>}<div className="row" style={{marginTop:14}}><button className="btn primary" disabled={isBarre&&(!barreAvailable||!validBarreSize)} onClick={buildWorkout}>צרי אימון</button>{!isBarre&&<button className="btn" onClick={()=>setEquipments(["ללא ציוד"])}>משקל גוף בלבד</button>}</div></section>}

  {tab==="exercises"&&<section className="panel"><div className="row between"><div><h2>ספריית תרגילים</h2><div className="sub">חיפוש לפי שריר, אזור גוף, דפוס תנועה או ציוד.</div></div><div className="kpi">{libraryLoading?"…":filtered.length}</div></div><div className="filters"><label className="field">חיפוש<input value={q} onChange={e=>setQ(e.target.value)} placeholder="למשל glute medius, כתפיים, hinge..."/></label><MultiChoice label="אזור — בחירה מרובה" options={allRegions} selected={regions} onChange={setRegions}/><MultiChoice label="ציוד — בחירה מרובה" options={allEquipment} selected={equipments} onChange={setEquipments}/></div><div className="grid">{filtered.map(x=><article className="card exercise" key={x.id}><h3>{x.he}</h3><div className="small">{x.en}</div><p>{x.muscles}</p><div className="tags"><span className="tag green">{x.region}</span><span className="tag blue">{x.equipment}</span><span className="tag">{x.level}</span></div><p className="small"><strong>דגש:</strong> {x.cue}</p>{x.regression&&<div className="small">קל יותר: {x.regression}</div>}{x.safety&&<div className="small">⚠️ {x.safety}</div>}<div className="push-bottom"><input value={exerciseMusic[x.id]||""} onChange={e=>setExerciseMusic({...exerciseMusic,[x.id]:e.target.value})} placeholder="קישור Spotify אופציונלי"/><div className="row" style={{marginTop:8}}><Link className="btn primary" href={`/exercise/${x.id}`}>פתח תרגיל</Link><button className="btn green" onClick={()=>shareExercise(x,"whatsapp")}>WhatsApp</button><button className="btn blue" onClick={()=>shareExercise(x,"email")}>מייל</button><button className="btn" onClick={()=>shareExercise(x,"copy")}>העתקת קישור</button></div></div></article>)}</div></section>}

  {tab==="homework"&&<section className="panel"><h2>שיעורי בית למתאמנת</h2><div className="sub">לחיזוק משלים, יציבות, מוביליטי או התאוששות. לא מיועד לאבחון או טיפול בפציעה.</div><div className="filters"><MultiChoice label="אזור — בחירה מרובה" options={allRegions} selected={regions} onChange={setRegions}/><label className="field">מטרה<select value={homeGoal} onChange={e=>setHomeGoal(e.target.value)}>{goals.map(x=><option key={x}>{x}</option>)}</select></label><MultiChoice label="ציוד בבית — בחירה מרובה" options={allEquipment} selected={equipments} onChange={setEquipments}/><label className="field">פעמים בשבוע<input type="number" min="1" max="7" value={homeFreq} onChange={e=>setHomeFreq(+e.target.value)}/></label><label className="field">משך קצר בדקות<input type="number" min="5" max="30" value={homeMinutes} onChange={e=>setHomeMinutes(+e.target.value)}/></label></div><label className="field">הערה אישית<textarea value={homeNote} onChange={e=>setHomeNote(e.target.value)} placeholder="למשל: לעבוד לאט, להתמקד בשליטה בצד שמאל..."/></label><div className="music" style={{marginTop:12}}><strong>🎧 מוזיקה אופציונלית</strong><div className="filters"><input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="שם השיר / הפלייליסט"/><input value={musicUrl} onChange={e=>setMusicUrl(e.target.value)} placeholder="קישור Spotify"/></div></div><div className="notice">כאשר יש כאב משמעותי, נפיחות, חבלה, נימול/הקרנה, חולשה חדשה או מגבלה לא מוסברת — לא משתמשים בשיעורי בית כתחליף לבדיקה מקצועית.</div><button className="btn primary" style={{marginTop:12}} onClick={buildHomework}>צרי משימה</button></section>}

  {tab==="program"&&<section className="panel"><h2>תוכנית רב־שבועית</h2><div className="sub">בסיס לתוכנית עם התקדמות שבועית. המדריכה עוברת על התוכנית לפני שימוש.</div><div className="filters"><MultiChoice label="אזור — בחירה מרובה" options={allRegions} selected={regions} onChange={setRegions}/><MultiChoice label="ציוד — בחירה מרובה" options={allEquipment} selected={equipments} onChange={setEquipments}/><label className="field">שבועות<input type="number" min="2" max="12" value={programWeeks} onChange={e=>setProgramWeeks(+e.target.value)}/></label><label className="field">אימונים בשבוע<input type="number" min="1" max="5" value={programFreq} onChange={e=>setProgramFreq(+e.target.value)}/></label></div><div className="music"><strong>פלייליסט ברירת מחדל לתוכנית</strong><div className="filters"><label className="field">שם הפלייליסט<input maxLength={120} value={programMusic.musicTitle} onChange={e=>setProgramMusic({...programMusic,musicTitle:e.target.value})}/></label><label className="field">קישור לפלייליסט<input type="url" maxLength={500} value={programMusic.musicUrl} onChange={e=>setProgramMusic({...programMusic,musicUrl:e.target.value})}/></label></div></div><div className="row"><button className="btn primary" onClick={buildProgram}>{program?"צרי תוכנית חדשה":"צרי תוכנית"}</button>{program&&<button className="btn" onClick={()=>setTab("programResult")}>חזרה לתוכנית שבניתי</button>}<SaveProgramPanel/></div></section>}

  {tab==="workout"&&workout&&<section className="panel"><div className="row between v25-workout-head"><div><div className="v25-eyebrow">BISS WORKOUT</div><h2>{workout.title}</h2><strong>משך כולל: {workout.durationMinutes} דק׳</strong><WorkoutTiming workout={workout}/><div className="sub">{workout.meta}</div></div>{!task?.submitted_at&&<div className="v25-alt-wrap"><button className="btn v25-alt-btn" onClick={buildWorkout}>צור אימון חלופי</button><span className="small">אותם פרמטרים, שילוב תרגילים חדש</span></div>}</div>{workout.type===BONE_TYPE&&<p className="notice">{BONE_NOTICE}</p>}{workout.type===BARRE_TYPE&&<p className="notice">{BARRE_NOTICE}</p>}{workout.limitationLabels?.length>0&&<div className="safe" style={{margin:"12px 0"}}><strong>התאמות פעילות:</strong> {workout.limitationLabels.join(" · ")}{workout.limitationNote&&<div className="small">הערת מדריכה: {workout.limitationNote}</div>}</div>}{workout.musicUrl&&<div className="music">🎧 <a href={workout.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {workout.musicTitle}</a></div>}<div className="section-title v25-section-title"><span className="dot blue"/><strong>חימום</strong><span className="v25-count">{workout.warm.length} שלבים</span></div>{workout.warm.map((x,i)=><div className="workout-item v24-workout-item v25-warm-item" key={x}><span className="v25-mini-index">{i+1}</span><span>{x}</span></div>)}<div className="section-title v25-section-title"><span className="dot"/><strong>תוכנית האימון</strong><span className="v25-count">{workout.exercises.length} תרגילים</span></div><StationRotation workout={workout}/>{workout.warnings?.map(warning=><p className="notice" key={warning}>{warning}</p>)}{workout.exercises.map((x,i)=>{const issues=task?.submitted_at?[]:exerciseIssues(x),alt=alternatives[x.id],section=workout.sections?.find(s=>s.start===i);return <Fragment key={x.id}>{section&&<div className="section-title"><div>{section.title.startsWith("בלוק 2")&&workout.transitionMinutes>0&&<p className="small">{workout.transitionMinutes} דק׳ התארגנות בין הבלוקים</p>}<h3>{section.title}</h3><p className="small">{section.detail}</p></div></div>}<div className="workout-item v24-workout-item v25-exercise-card"><div className="v25-exercise-index">{String(i+1).padStart(2,"0")}</div><div className="v25-exercise-body"><div className="v25-exercise-title"><strong>{x.he}</strong><span>{x.en}</span></div><div className="v25-prescription">{x.prescription}</div><div className="v25-meta"><span>{x.equipment}</span><span>{x.level}</span>{x.supersetGroup&&<span className="tag v28-superset-tag">סופר סט {x.supersetGroup}{x.supersetSlot}</span>}</div><div className="v25-cue"><strong>דגש:</strong> {x.cue}</div><Link className="btn v25-open-btn v25-workout-exercise-link" href={`/exercise/${encodeURIComponent(x.id)}?from=workout`} onNavigate={()=>openWorkoutExercise(x.id)}>{x.demoUrl?"פתח תרגיל והדגמה ←":"פתח תרגיל ←"}</Link>{x.allocation&&<div className="notice" style={{marginTop:7}}>{x.allocation}</div>}{x.regression&&<div className="small">רגרסיה: {x.regression}</div>}{issues.length>0&&<div className="notice" style={{marginTop:8}}><strong>⚠️ התאמה נדרשת: {issues.join(", ")}</strong><div className="small">התרגיל נשאר לקבוצה, ולמתאמנת עם המגבלה ניתן לבחור חלופה אישית.</div><button className="btn" style={{marginTop:8}} onClick={(e)=>{e.preventDefault();chooseAlternative(x)}}>הצג תרגיל חלופי</button></div>}{alt&&<div className="safe" style={{marginTop:8}}><strong>חלופה מוצעת: {alt.he} <span className="small">({alt.en})</span></strong><div className="small">{alt.equipment} · {alt.cue}</div><div style={{marginTop:7}}><Link className="btn v25-workout-alternative-link" href={`/exercise/${encodeURIComponent(alt.id)}?from=workout`} onNavigate={()=>openWorkoutExercise(alt.id)}>פתח חלופה</Link></div>{alt.regression&&<div className="small">קל יותר: {alt.regression}</div>}<button className="btn" style={{marginTop:8}} onClick={(e)=>{e.preventDefault();chooseAlternative(x)}}>חלופה אחרת</button></div>}</div></div></Fragment>})}<div className="section-title v25-section-title"><span className="dot red"/><strong>שחרור</strong><span className="v25-count">{workout.cool.length} שלבים</span></div>{workout.cool.map((x,i)=><div className="workout-item v24-workout-item v25-warm-item" key={x}><span className="v25-mini-index">{i+1}</span><span>{x}</span></div>)}{task?(taskState.canSubmit&&!task.submitted_at&&<button className="btn primary" disabled={taskSaving} onClick={submitAssignedWorkout}>{taskSaving?"שולח…":"שליחת האימון למנהלת"}</button>):<ShareButtons type="workout" payload={workout}/>}<div className="safe" style={{marginTop:12}}>האימון נועד לשמש כלי עבודה למדריכה. יש להתאים עומס, טווח, קצב ותרגיל לפי המתאמנות בפועל.</div></section>}

  {tab==="homeworkResult"&&homework&&<section className="panel"><h2>{homework.title}</h2><div className="sub">{homework.meta}</div>{homework.musicUrl&&<div className="music">🎧 <a href={homework.musicUrl} target="_blank" rel="noreferrer">פתחי ב-Spotify · {homework.musicTitle}</a></div>}{homework.note&&<div className="safe" style={{margin:"12px 0"}}>הערת המדריכה: {homework.note}</div>}{homework.items.map((x,i)=><div className="workout-item v24-workout-item" key={x.id}><strong>{i+1}. {x.he}</strong><div>{x.prescription}</div><div className="small">{x.cue}</div><div style={{marginTop:7}}><Link className="btn" href={`/exercise/${x.id}`}>פתח תרגיל</Link></div></div>)}<ShareButtons type="homework" payload={homework}/></section>}
  {tab==="programResult"&&program&&<section className="panel">
    <ProgramResult program={program}
      onPlaylist={(index,playlist)=>setProgram(current=>({...current,sessions:current.sessions.map((session,i)=>i===index?{...session,...playlist}:session)}))}
      onOffer={session=>{setOfferWorkout(programSessionWorkout(program,session));setTab("team");}}/>
    <div className="row" style={{marginTop:14}}><SaveProgramPanel program={program}/></div>
    <ShareButtons type="program" payload={program}/>
  </section>}

  {tab==="equipment"&&<section className="panel"><div className="row between"><div><h2>מלאי הסטודיו</h2><div className="sub">הכמויות מתחברות לפי משפחת ציוד ומשמשות את מנגנון חלוקת התחנות.</div><div className={`v29-db-status ${inventoryStatus}`}><span/>{inventoryStatus==="connected"?"מחובר למסד Studio · השינויים נשמרים בענן":inventoryStatus==="loading"?"טוען מלאי מהמסד…":"החיבור למסד אינו זמין · לא ניתן לשנות מלאי"}</div></div><div className="kpi">{inventory.reduce((s,x)=>s+(x.active===false?0:x.quantity),0)}</div></div><div className="grid">{inventory.map((x,i)=><article className={`card inventory-card ${x.active===false?"unavailable":""}`} key={x.id||i}><h3>{x.name_he}</h3><div className="small">{x.name_en}</div><p><strong>{x.quantity}</strong> יחידות {x.active===false&&"· לא זמין כרגע"}</p><div className="tag">{EQUIPMENT_CATEGORY_OPTIONS.find(c=>c.value===x.category)?.label||"אחר"}</div>{x.details&&<div className="small">{x.details}</div>}{x.id&&<div className="row" style={{marginTop:10}}><button className="btn" disabled={inventoryStatus!=="connected"} onClick={()=>changeQty(x,-1)}>−</button><button className="btn" disabled={inventoryStatus!=="connected"} onClick={()=>changeQty(x,1)}>+</button><button className="btn" disabled={inventoryStatus!=="connected"} onClick={()=>toggleItem(x)}>{x.active===false?"החזרה לזמין":"לא זמין"}</button><button className="btn red" disabled={inventoryStatus!=="connected"} onClick={()=>deleteItem(x)}>מחיקה</button></div>}</article>)}</div><div className="admin"><h3>ניהול ציוד</h3><div className="small">פעולות שינוי דורשות PIN מנהל. יש לבחור משפחה מסודרת כדי שמשקלים שונים ייספרו יחד ולא ייצרו אפשרויות כפולות.</div><div className="filters"><label className="field">PIN<input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN מנהל"/></label></div><form className="filters" onSubmit={addEquipment}><input name="name" required placeholder="שם הציוד בעברית"/><input name="nameEn" placeholder="שם באנגלית"/><input name="quantity" type="number" min="0" required placeholder="כמות"/><select name="category" defaultValue="other" aria-label="משפחת ציוד">{EQUIPMENT_CATEGORY_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><input name="details" placeholder="פרטים / משקל"/><button
  className="btn primary"
  type="submit"
  disabled={savingEquipment||inventoryStatus!=="connected"}
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
    .v29-workout-types{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.v29-workout-type{display:flex;flex-direction:column;gap:5px;text-align:right;padding:15px;border:1px solid #dce4de;border-radius:18px;background:#fff;cursor:pointer;color:#455048}.v29-workout-type strong{font-size:15px}.v29-workout-type span{font-size:12px;line-height:1.5}.v29-workout-type.selected{background:#17201b;color:#fff;border-color:#17201b;box-shadow:0 8px 22px rgba(23,32,27,.13)}
    .v29-db-status{display:flex;align-items:center;gap:7px;margin-top:8px;font-size:12px;font-weight:800}.v29-db-status span{width:9px;height:9px;border-radius:50%;background:#d59b22}.v29-db-status.connected{color:#23734a}.v29-db-status.connected span{background:#2f9b61}.v29-db-status.error{color:#a33}.v29-db-status.error span{background:#c94747}
    @media(max-width:760px){.v29-workout-types{grid-template-columns:1fr}.v28-multi-field{grid-column:1/-1}.v28-multi-choice{max-height:190px;overflow:auto}.v28-choice{padding:9px 11px}}
  `}</style>
  <footer className="footer">BISS · מערכת עבודה פנימית לסטודיו · V2.9.0</footer>
 </main>
}
