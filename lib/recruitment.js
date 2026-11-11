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

export function recruitmentPublic(posting,sessions,now=new Date()) {
  const current=new Map(sessions.map(session=>[session.id,session]));
  const {title,address,certifications,experience,notes,travelSingle,travelMultiple}=posting.terms;
  const slots=posting.terms.slots.flatMap(slot=>{
    const session=current.get(slot.id);
    if(!session||session.status!=="planned"||new Date(session.starts_at)<=now||
      session.instructor_id!==slot.originalInstructorId||session.instructor_name!==slot.originalInstructorName||
      Date.parse(session.starts_at)!==Date.parse(slot.startsAt))return [];
    return [{id:slot.id,title:slot.title,startsAt:slot.startsAt,pay:slot.pay,visit:slot.visit,workout:slot.workout,playlist:slot.playlist}];
  });
  return {title,address,certifications,experience,notes,travelSingle,travelMultiple,slots};
}
