import {publicWorkoutSections, workoutDuration} from "./workout-structure.js";
import {programPlaylistUrl} from "./program-session.js";

const text = value => typeof value === "string" ? value : "";

export function publicWorkoutShare(workout) {
  if (!Array.isArray(workout?.exercises) || !workout.exercises.length ||
      workout.exercises.some(item => !item || typeof item.he !== "string" || !item.he.trim())) return null;

  const exercises = workout.exercises.map(item => ({
    id:text(item.id),
    he:item.he,
    prescription:text(item.prescription),
    cue:text(item.cue),
    allocation:text(item.allocation),
    supersetGroup:Number.isInteger(item.supersetGroup) ? item.supersetGroup : undefined,
    supersetSlot:text(item.supersetSlot)
  }));
  const rotation = workout.stationRotation;
  const stationRotation = Array.isArray(rotation) && rotation.length <= 40 &&
    rotation.every(station => Number.isInteger(station) && station >= 1 && station <= exercises.length)
    ? rotation : undefined;

  return {
    title:text(workout.title),
    meta:text(workout.meta),
    type:text(workout.type),
    structure:text(workout.structure),
    level:text(workout.level),
    durationMinutes:workoutDuration({durationMinutes:Number.isFinite(workout.durationMinutes)?workout.durationMinutes:null,meta:text(workout.meta)}),
    transitionMinutes:workout.transitionMinutes === 2 ? 2 : 0,
    warm:Array.isArray(workout.warm) ? workout.warm.filter(line=>typeof line==="string") : [],
    cool:Array.isArray(workout.cool) ? workout.cool.filter(line=>typeof line==="string") : [],
    sections:publicWorkoutSections(workout,exercises.length),
    musicUrl:programPlaylistUrl(workout.musicUrl),
    musicTitle:text(workout.musicTitle),
    exercises,
    stationRotation
  };
}
