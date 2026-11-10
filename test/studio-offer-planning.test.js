import test from "node:test";
import assert from "node:assert/strict";
import {studioLocalTimeToIso} from "../lib/studio-time.js";
import {studioWorkoutFields} from "../lib/studio-workout-payload.js";

test("new sessions use Israel time even when the server runs in UTC",()=>{
  assert.equal(studioLocalTimeToIso("2026-11-12T18:00"),"2026-11-12T16:00:00.000Z");
  assert.equal(studioLocalTimeToIso("2026-07-12T18:00"),"2026-07-12T15:00:00.000Z");
  assert.equal(studioLocalTimeToIso("2026-02-31T18:00"),null);
  assert.equal(studioLocalTimeToIso("2026-03-27T02:30"),null);
  assert.equal(studioLocalTimeToIso("2026-10-25T01:30"),null);
});

test("attached workout carries timing and public instructions without the private limitation note",()=>{
  const fields=studioWorkoutFields({
    title:"אימון דמה",meta:"50 דק׳",warm:["6 דק׳ חימום"],cool:["5 דק׳ שחרור"],limitationNote:"private",
    sections:[{start:0,title:"חלק מרכזי",detail:"39 דק׳"}],
    exercises:[{he:"תרגיל",id:"test",prescription:"2 סטים",private:"private"}]
  });
  assert.equal(JSON.stringify(fields).includes("private"),false);
  assert.match(fields.workout_summary,/6 דק׳ חימום[\s\S]*39 דק׳[\s\S]*5 דק׳ שחרור/);
  assert.equal(studioWorkoutFields({exercises:[]}),null);
});
