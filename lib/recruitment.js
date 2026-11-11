import {publicWorkoutShare} from "./public-workout-share.js";
import {programPlaylistUrl} from "./program-session.js";

export const recruitmentDate = new Intl.DateTimeFormat("he-IL", {
  timeZone:"Asia/Jerusalem",dateStyle:"medium",timeStyle:"short"
});

export function shekelsToAgorot(value) {
  const text=String(value??"").trim();
  if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(text))return null;
  const [whole,fraction=""]=text.split(".");
  return Number(whole)*100+Number(fraction.padEnd(2,"0"));
}

const ils=new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS"});
export const shekels=agorot=>ils.format(agorot/100);

export function recruitmentPay(slots, selectedIds, travelSingle, travelMultiple) {
  const selected=new Set(selectedIds);
  const visits=new Map();
  let workouts=0;
  for(const slot of slots) {
    if(!selected.has(slot.id))continue;
    workouts+=slot.pay;
    visits.set(slot.visit,(visits.get(slot.visit)||0)+1);
  }
  const travel=[...visits.values()].reduce((sum,count)=>sum+(count>1?travelMultiple:travelSingle),0);
  return {workouts,travel,total:workouts+travel,visits:visits.size};
}

export const isRecruitmentId=value=>typeof value==="string"&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export const recruitmentText=(value,limit)=>typeof value==="string"?value.trim().slice(0,limit):"";

export function recruitmentApprovalError(application) {
  const insured=application?.professional_insurance===true;
  const qualified=Boolean(recruitmentText(application?.qualifications,800));
  if(!insured&&!qualified)return "חסרים אישור ביטוח אחריות מקצועית וסוג הסמכה.";
  if(!insured)return "חסר אישור ביטוח אחריות מקצועית.";
  if(!qualified)return "חסר סוג הסמכה.";
  return "";
}

export function recruitmentWorkoutFields(session, showWorkout) {
  if(!showWorkout)return {workout:[],playlist:""};
  const workoutPlan=publicWorkoutShare(session.workout_payload);
  return {
    workout:[],
    ...(workoutPlan&&{workoutPlan}),
    playlist:programPlaylistUrl(session.playlist_url)
  };
}

export function recruitmentPublic(posting,sessions,now=new Date()) {
  const current=new Map(sessions.map(session=>[session.id,session]));
  const {title,address,certifications,experience,notes,travelSingle,travelMultiple}=posting.terms;
  const slots=posting.terms.slots.flatMap(slot=>{
    const session=current.get(slot.id);
    if(!session||session.status!=="planned"||new Date(session.starts_at)<=now||
      session.instructor_id!==slot.originalInstructorId||session.instructor_name!==slot.originalInstructorName||
      Date.parse(session.starts_at)!==Date.parse(slot.startsAt))return [];
    const workoutPlan=publicWorkoutShare(slot.workoutPlan);
    const workout=Array.isArray(slot.workout)?slot.workout.map(item=>({
      name:recruitmentText(item?.name,120),prescription:recruitmentText(item?.prescription,160)
    })).filter(item=>item.name):[];
    return [{
      id:slot.id,title:slot.title,startsAt:slot.startsAt,pay:slot.pay,visit:slot.visit,
      workout,...(workoutPlan&&{workoutPlan}),playlist:programPlaylistUrl(slot.playlist)
    }];
  });
  return {title,address,certifications,experience,notes,travelSingle,travelMultiple,slots};
}
