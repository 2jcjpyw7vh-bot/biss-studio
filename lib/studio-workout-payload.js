import {publicWorkoutSections,workoutSummary} from "./workout-structure.js";

const clean=(value,max)=>String(value||"").trim().slice(0,max);

export function studioWorkoutFields(workout) {
  const exercises=Array.isArray(workout?.exercises)?workout.exercises.slice(0,20):[];
  if(!exercises.length)return null;
  const workout_payload={
    title:clean(workout.title,180),meta:clean(workout.meta,300),
    sections:publicWorkoutSections(workout,exercises.length),transitionMinutes:workout.transitionMinutes===2?2:0,
    musicUrl:clean(workout.musicUrl,500),musicTitle:clean(workout.musicTitle,120),
    warm:Array.isArray(workout.warm)?workout.warm.slice(0,10).map(x=>clean(x,250)):[],
    exercises:exercises.map(x=>({id:clean(x?.id,100),he:clean(x?.he,120),en:clean(x?.en,120),equipment:clean(x?.equipment,120),level:clean(x?.level,40),prescription:clean(x?.prescription,200),cue:clean(x?.cue,300),allocation:clean(x?.allocation,300)})),
    cool:Array.isArray(workout.cool)?workout.cool.slice(0,10).map(x=>clean(x,250)):[]
  };
  return {workout_payload,workout_summary:workoutSummary(workout_payload)};
}
