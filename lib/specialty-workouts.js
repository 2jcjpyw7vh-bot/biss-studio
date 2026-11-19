import {workoutEquipment} from "./workout-structure.js";
export const PILATES_TYPE="pilates",TRX_TYPE="trx";
export const PILATES_STRUCTURES=["סטים וחזרות","בלוקים"];
export const TRX_STRUCTURES=["תחנות","סטים וחזרות","בלוקים"];
export const SPECIALTY_NOTICES={
  pilates:"פילאטיס מזרן מודרך: נשימה, שליטה ותנועה מדויקת. קצב נוח ואיכות ביצוע לפני מספר חזרות. לכל משתתפת נדרש מזרן זמין.",
  trx:"בדקו עיגון ורצועות תקינים ומרווח תנועה. ההתנגדות מותאמת בזווית הגוף. כשמספר המשתתפות גדול ממספר הרצועות, יש לשלב תחנות ללא רצועות."
};
const trxComplements=new Set(["squat","reverse-lunge","glute-bridge","dead-bug","bird-dog","plank","side-plank","march"]);
export function specialtyCatalog(type,library,level){
  const allowed=level==="מתחילים"?new Set(["מתחילים"]):level!=="מתקדמים"?new Set(["מתחילים","בינוניים"]):new Set(["מתחילים","בינוניים","מתקדמים"]);
  return library.filter(exercise=>allowed.has(exercise.level)&&(type===PILATES_TYPE?exercise.id.startsWith("pilates-"):type===TRX_TYPE?exercise.equipment==="TRX"||trxComplements.has(exercise.id):true));
}
export function exactMatCapacity(inventory){return workoutEquipment({equipment:"מזרני פילאטיס",exactEquipment:true},inventory).capacity;}
export function planPilatesWorkout({pool,inventory,participants,minutes,structure,level,finisher}){
  if(exactMatCapacity(inventory)<participants)return {error:`לאימון פילאטיס נדרשים ${participants} מזרנים. במלאי הפעיל יש ${exactMatCapacity(inventory)}. יש לעדכן מלאי או להקטין את הקבוצה.`};
  const available=pool.filter(exercise=>workoutEquipment(exercise,inventory).capacity>=participants);
  if(available.length<3)return {error:`נמצאו רק ${available.length} תרגילי פילאטיס מתאימים לסינון ולמלאי לכל הקבוצה. הרחיבי אזורים או ציוד.`};
  const warmMinutes=minutes<30?4:6,coolMinutes=minutes<30?3:5;
  const ending=finisher&&workoutEquipment(finisher,inventory).capacity>=participants?finisher:null;
  const finisherMinutes=ending?(minutes<30?2:4):0;
  const mainMinutes=minutes-warmMinutes-coolMinutes-finisherMinutes;
  const picked=available.slice(0,Math.min(8,Math.floor(mainMinutes/3)));
  const groups=structure==="בלוקים"?[
    {title:"בלוק 1 · שליטה וליבה",items:picked.filter(x=>x.region==="ליבה"||x.region==="גב")},
    {title:"בלוק 2 · אגן, רגליים ויציבה",items:picked.filter(x=>x.region!=="ליבה"&&x.region!=="גב")}
  ].filter(group=>group.items.length):[{title:"רצף פילאטיס מזרן",items:picked}];
  const transitionMinutes=groups.length>1?2:0;
  const exerciseBudget=mainMinutes-transitionMinutes;
  const slot=Math.floor(exerciseBudget/picked.length),extra=exerciseBudget%picked.length;
  const sections=[],exercises=[];
  for(const group of groups){const start=exercises.length;let groupMinutes=0;for(const exercise of group.items){const allocated=slot+Number(exercises.length<extra);groupMinutes+=allocated;exercises.push({...exercise,slotMinutes:allocated,prescription:`${allocated} דק׳ לתרגיל · 2 סטים של ${level==="מתחילים"?"6–8":"8–10"} חזרות נשלטות${exercise.eachSide?" בכל צד":""} · נשימה, הדגמה ומנוחה בתוך הזמן שהוקצה`});}sections.push({start,title:group.title,detail:`${groupMinutes} דק׳ · כולן יחד · קצב מודרך ושליטה בתנועה`});}
  if(ending){sections.push({start:exercises.length,title:"סיום קבוצתי · שליטה ויציבה",detail:`${finisherMinutes} דק׳`});exercises.push({...ending,slotMinutes:finisherMinutes,prescription:`${finisherMinutes} דק׳ · 6–8 חזרות איטיות לכל צד, עם הפוגות לפי הצורך`});}
  return {exercises,sections,transitionMinutes,warnings:available.length<pool.length?["תרגילי אביזרים שאין מהם די לכל הקבוצה הושמטו."]:[],warm:[`${warmMinutes} דק׳ · נשימה, ארגון יציבה ותנועות הכנה בטווח נוח`],cool:[`${coolMinutes} דק׳ · האטה, נשימה ושחרור עדין`]};
}
