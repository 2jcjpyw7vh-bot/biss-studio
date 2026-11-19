export const visitKinds={workout:"אימון עצמאי",dj:"עבודה עצמאית על סט DJ",leisure:"זמן בביסס",mixed:"ביקור משולב"};
export const visitAddress="הזורעים 6 מושב היוגב";
export function visitActivities(visit){
 if(visit?.service_kind==="mixed")return Array.isArray(visit.activities)?visit.activities:["workout","leisure"];
 return [visit?.service_kind].filter(Boolean);
}
export const visitHasWorkout=visit=>visitActivities(visit).includes("workout");
export const visitHasDJ=visit=>visitActivities(visit).includes("dj");
export const visitTime=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",hour:"2-digit",minute:"2-digit"});
export const visitDay=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",dateStyle:"full"});
export function visitPhase(visit,now=new Date()){
 if(visit.status==="cancelled")return "cancelled";
 if(visit.status==="completed"||Date.parse(visit.ends_at)<=now.getTime())return "past";
 return Date.parse(visit.starts_at)<=now.getTime()?"current":"upcoming";
}
const clean=(value,max)=>typeof value==="string"?value.trim().slice(0,max):"";
export function visitMediaUrl(value){
 if(!value)return "";
 try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&["open.spotify.com","soundcloud.com","www.soundcloud.com","mixcloud.com","www.mixcloud.com","www.youtube.com","youtube.com","youtu.be","music.youtube.com"].includes(url.hostname)?url.href:"";}catch{return "";}
}
export function visitPreferenceResult(visit,input,now=new Date()){
 if(visit.status!=="confirmed"||Date.parse(visit.ends_at)<=now.getTime())return {error:"הביקור הסתיים או בוטל. לא ניתן לשנות את ההכנה."};
 if(!input||typeof input!=="object")return {error:"יש למלא העדפות לביקור"};
 const duration=Number(input.workoutMinutes||0);
 if(visitHasWorkout(visit)&&(!Number.isInteger(duration)||duration<10||duration>Math.min(180,Math.floor((Date.parse(visit.ends_at)-Date.parse(visit.starts_at))/60000))))return {error:"משך האימון צריך להתאים לזמן שהוזמן."};
 const music=visitMediaUrl(input.musicUrl);
 if(input.musicUrl&&!music)return {error:"יש להכניס קישור HTTPS תקין מ־Spotify, SoundCloud, Mixcloud או YouTube."};
 return {preferences:{musicUrl:music,musicTitle:clean(input.musicTitle,120),
   notes:clean(input.notes,800),equipmentRequests:visitHasDJ(visit)?clean(input.equipmentRequests,800):"",
   ...(visitHasWorkout(visit)?{workoutMinutes:duration,bodyAreas:clean(input.bodyAreas,240)}:{})}};
}
export function visitFrameError(row,now=new Date()){
 const start=Date.parse(row.starts_at),end=Date.parse(row.ends_at),minutes=(end-start)/60000;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<=now.getTime()||minutes<15||minutes>720)return "יש לבחור מועד עתידי ומשך ביקור בין 15 דקות ל־12 שעות.";
 if(!Object.hasOwn(visitKinds,row.service_kind))return "יש לבחור סוג ביקור.";
 if(!Number.isInteger(row.party_size)||row.party_size<1||row.party_size>12)return "מספר המבקרים צריך להיות בין 1 ל־12.";
 if(!row.title?.trim()||!row.arbox_booking_id?.trim()||!row.included_items?.length)return "יש להזין שם הזמנה, אסמכתת ארבוקס ומה כלול בביקור.";
 return "";
}

export function visitOwnerId(profile,preview){
 if(profile?.status!=="active")return "";
 if(profile.role==="trainee")return profile.id;
 return profile.role==="manager"&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(preview||"")?preview:"";
}
