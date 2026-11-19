import {suggestedLessonDuration,taskWorkoutTypes} from "./workout-task.js";
import {studioLocalTimeToIso} from "./studio-time.js";
export function suggestedWorkoutType(name){
  const title=String(name||"").toLowerCase();
  if(/עצם|bone/.test(title))return "bone-strength";
  if(/barre|אימון בר/.test(title))return "barre";
  if(/hiit/.test(title))return "functional-hiit";
  if(/power|functional|פונקציונ/.test(title))return "functional";
  return "classic";
}
export function personalLessonFrame(lesson,type){
  const duration=suggestedLessonDuration(lesson);
  const participants=lesson.registrations||lesson.capacity;
  const resolvedType=type||suggestedWorkoutType(lesson.name);
  if(!duration||!Number.isInteger(participants)||participants<1||participants>40||!Object.hasOwn(taskWorkoutTypes,resolvedType)||resolvedType==="barre"&&participants>7)return null;
  return {type:resolvedType,duration,participants,limitations:[]};
}
export function upcomingArboxLessons(lessons,now=Date.now()){
  return lessons.filter(lesson=>!lesson.cancelled&&Date.parse(studioLocalTimeToIso(`${lesson.date}T${lesson.start}`))>now);
}
