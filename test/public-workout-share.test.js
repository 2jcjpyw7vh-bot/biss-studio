import test from "node:test";
import assert from "node:assert/strict";
import {publicWorkoutShare} from "../lib/public-workout-share.js";
import {sharedWorkoutPlan, trioStationLabel, workoutTimeline} from "../lib/workout-structure.js";

test("workout sharing preserves instruction and timing without copying private notes", () => {
  const workout = {
    title:"אימון דמה", meta:"45 דק׳", durationMinutes:45, structure:"בלוקים",
    warm:["6 דק׳ חימום"], cool:["5 דק׳ שחרור"],
    sections:[{start:0,title:"בלוק 1",detail:"34 דק׳ · פתיחה: א׳ ב־1",privateNote:"INTERNAL_ONLY"}],
    exercises:[{id:"demo",he:"סקוואט",prescription:"40 שנ׳",cue:"תנועה נשלטת",allocation:"תחנה 1 בבלוק · 3 מקומות",privateNote:"INTERNAL_ONLY"}],
    musicUrl:"https://example.com/playlist",
    limitationNote:"INTERNAL_ONLY", limitations:["knee"], saveId:"INTERNAL_ONLY",
    warnings:["INTERNAL_ONLY"]
  };
  const shared = publicWorkoutShare(workout);
  assert.doesNotMatch(JSON.stringify(shared), /INTERNAL_ONLY|limitation|saveId|warnings/);
  assert.equal(shared.musicUrl, workout.musicUrl);
  assert.deepEqual(workoutTimeline(shared), {warm:6,main:34,finisher:0,transition:0,cool:5});
  assert.equal(trioStationLabel(sharedWorkoutPlan(shared).exercises[0]),workout.exercises[0].allocation);
  assert.deepEqual(publicWorkoutShare(shared), shared);
});
