import test from "node:test";
import assert from "node:assert/strict";
import {planStationRotation,stationPlaces} from "../lib/station-rotation.js";
import {studioWorkoutFields} from "../lib/studio-workout-payload.js";
import {workoutTimeline} from "../lib/workout-structure.js";

const step={id:"step",he:"עליות מדרגה",equipment:"מדרגה"};
const inventory=[{name_he:"מדרגה",category:"cardio",quantity:1},{name_he:"אופניים",category:"cardio",quantity:2}];
const bodyweight=Array.from({length:8},(_,index)=>({id:`floor-${index}`,he:`תרגיל ${index+1}`,equipment:"ללא ציוד"}));

test("nine people and one step fit a 45 minute workout with nine single places",()=>{
  const plan=planStationRotation([step,...bodyweight],inventory,9,34,"functional-hiit","מעורב");
  assert.deepEqual(plan.stationRotation,[1,2,3,4,5,6,7,8,9]);
  assert.match(plan.sections[0].detail,/3 סבבים של 9 מקטעים בני 60 שנ׳ · 7 דק׳/);
  const workout={...plan,durationMinutes:45,warm:["6 דק׳"],cool:["5 דק׳"]};
  assert.deepEqual(workoutTimeline(workout),{warm:6,main:34,finisher:0,transition:0,cool:5});
  const fields=studioWorkoutFields(workout);
  assert.deepEqual(fields.workout_payload.stationRotation,plan.stationRotation);
  assert.match(fields.workout_summary,/סדר המעבר בין המקומות/);
});

test("shared stations never put two people on the same step",()=>{
  const plan=planStationRotation([step,{...step,id:"second-step"},...bodyweight.slice(0,7)],inventory,9,34,"functional-hiit","מעורב");
  assert.equal(plan.exercises.length,8);
  assert.equal(plan.exercises.filter(x=>x.equipment==="מדרגה").length,1);
  assert.equal(plan.stationRotation.filter(station=>station===1).length,1);
  assert.equal(plan.stationRotation.filter(station=>station===2).length,2);
  assert.equal(plan.stationRotation.length,9);
});

test("a plan cannot promise places or a full rotation that do not fit",()=>{
  assert.equal(planStationRotation([step],inventory,9,34,"functional-hiit","מעורב"),null);
  assert.equal(planStationRotation(bodyweight,inventory,40,13,"functional-hiit","מעורב"),null);
});

test("the assignment list distinguishes two places in one station",()=>{
  assert.deepEqual(stationPlaces([1,2,3,2]),[
    {station:1,label:"1"},{station:2,label:"2.1"},{station:3,label:"3"},{station:2,label:"2.2"}
  ]);
  assert.deepEqual(stationPlaces([0,1]),[]);
});
