import test from "node:test";
import assert from "node:assert/strict";
import {programDateError, programSessionWorkout, sessionPlaylist} from "../lib/program-session.js";
import {studioWorkoutFields} from "../lib/studio-workout-payload.js";
import {publicSubstituteOffer} from "../lib/substitute-privacy.js";

const program = {musicUrl:"https://example.com/default", musicTitle:"ברירת מחדל", trainee:"מידע פרטי"};
test("program dates can be omitted or use the same day, and must be valid and ordered", () => {
  assert.equal(programDateError("",undefined),"");
  assert.equal(programDateError("2028-02-29","2028-02-29"),"");
  assert.notEqual(programDateError("2026-02-29",""),"");
  assert.notEqual(programDateError("2026-11-12","2026-11-11"),"");
  assert.notEqual(programDateError(false,""),"");
});
const session = {
  name:"שבוע 2 · אימון 1",
  progression:"תוספת חזרות",
  musicUrl:"https://example.com/override",
  items:[{id:"squat",he:"סקוואט",prescription:"3 × 10",internalNote:"מידע פרטי"}]
};

test("a session uses its own playlist and legacy sessions inherit the program playlist", () => {
  assert.equal(sessionPlaylist(program, session).musicUrl, "https://example.com/override");
  assert.equal(sessionPlaylist(program, {}).musicUrl, "https://example.com/default");
  assert.equal(sessionPlaylist(program, {musicUrl:"javascript:alert(1)"}).musicUrl, "https://example.com/default");
});

test("the selected session and playlist appear only in an offer that exposes the workout", () => {
  const draft = programSessionWorkout(program, session);
  const fields = studioWorkoutFields(draft);
  const planned = {...fields,playlist_url:draft.musicUrl};
  const visible = publicSubstituteOffer({show_workout:true,biss_sessions:planned}).biss_sessions;
  assert.match(visible.workout_summary,/שבוע 2 · אימון 1/);
  assert.deepEqual(visible.exercises,[{id:"squat",he:"סקוואט"}]);
  assert.equal(visible.playlist_url, session.musicUrl);
  assert.equal(JSON.stringify({draft,visible}).includes("מידע פרטי"),false);
  const hidden = publicSubstituteOffer({show_workout:false,biss_sessions:planned}).biss_sessions;
  assert.equal(hidden.workout_summary,"");
  assert.equal(hidden.playlist_url,"");
  assert.equal(hidden.exercises,undefined);
});
