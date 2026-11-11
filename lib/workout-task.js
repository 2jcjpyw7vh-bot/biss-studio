export const taskWorkoutTypes={
  classic:"אימון סטודיו",
  functional:"Functional Training",
  "functional-hiit":"Functional HIIT",
  barre:"אימון בר",
  "bone-strength":"חיזוק עצם"
};

export const taskLimitations={
  lowerBack:"גב תחתון",knee:"ברך",shoulder:"כתף",wrist:"שורש כף יד",
  ankle:"קרסול",balance:"שיווי משקל",pregnancy:"הריון"
};

export function workoutTaskFrame(input) {
  const type=input?.type;
  const duration=Number(input?.duration);
  const participants=Number(input?.participants);
  const limits=input?.limitations;
  if(typeof type!=="string"||!Object.hasOwn(taskWorkoutTypes,type)||!Number.isInteger(duration)||duration<20||duration>90||
     !Number.isInteger(participants)||participants<1||participants>(type==="barre"?7:40)||
     !Array.isArray(limits)||limits.some(limit=>typeof limit!=="string"||!Object.hasOwn(taskLimitations,limit)))return null;
  return {type,duration,participants,limitations:[...new Set(limits)]};
}

export function matchesWorkoutTask(frame, workout) {
  return workout?.type===frame.type&&workout?.durationMinutes===frame.duration&&
    workout?.participants===frame.participants&&Array.isArray(workout?.limitations)&&
    workout.limitations.length===frame.limitations.length&&frame.limitations.every(limit=>workout.limitations.includes(limit));
}

export function canReadWorkoutTask(profile, task) {
  return profile.role==="manager"||(profile.role==="instructor"&&profile.id===task.instructor_id);
}

export function workoutTaskAlternatives(exercises, alternatives) {
  const field=(value,max)=>typeof value==="string"?value.trim().slice(0,max):"";
  return Object.fromEntries(exercises.flatMap(({id})=>{
    if(!id||!alternatives||!Object.hasOwn(alternatives,id))return [];
    const alt=alternatives[id];
    if(!alt||!field(alt.id,100)||!field(alt.he,120))return [];
    return [[id,{id:field(alt.id,100),he:field(alt.he,120),en:field(alt.en,120),
      equipment:field(alt.equipment,120),cue:field(alt.cue,300),regression:field(alt.regression,300)}]];
  }));
}

export function suggestedLessonDuration(lesson) {
  if(!lesson?.start||!lesson?.end)return "";
  const minutes=value=>Number(value.slice(0,2))*60+Number(value.slice(3));
  const duration=(minutes(lesson.end)-minutes(lesson.start)+1440)%1440;
  return duration>=20&&duration<=90?duration:"";
}
