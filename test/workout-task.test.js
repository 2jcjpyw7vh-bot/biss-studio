import test from "node:test";
import assert from "node:assert/strict";
import {canReadWorkoutTask,matchesWorkoutTask,suggestedLessonDuration,workoutTaskAlternatives,workoutTaskFrame} from "../lib/workout-task.js";

test("the assigned workout must use the manager's workout type, duration, group size and adaptations",()=>{
  const frame=workoutTaskFrame({type:"functional",duration:"45",participants:"9",limitations:["knee","knee"]});
  assert.deepEqual(frame,{type:"functional",duration:45,participants:9,limitations:["knee"]});
  const workout={type:"functional",durationMinutes:45,participants:9,limitations:["knee"]};
  assert.equal(matchesWorkoutTask(frame,workout),true);
  for(const change of [{durationMinutes:50},{participants:10},{type:"classic"},{limitations:[]}]){
    assert.equal(matchesWorkoutTask(frame,{...workout,...change}),false);
  }
  assert.equal(workoutTaskFrame({...frame,type:"barre"}),null);
  assert.equal(workoutTaskFrame({...frame,limitations:["unknown"]}),null);
});

test("task access and the saved alternatives are scoped to their owner and exercises",()=>{
  const task={instructor_id:"assigned"};
  assert.equal(canReadWorkoutTask({role:"instructor",id:"assigned"},task),true);
  assert.equal(canReadWorkoutTask({role:"instructor",id:"other"},task),false);
  assert.equal(canReadWorkoutTask({role:"trainee",id:"assigned"},task),false);
  assert.equal(canReadWorkoutTask({role:"manager",id:"manager"},task),true);
  const alternatives=workoutTaskAlternatives([{id:"squat"}],{squat:{id:"chair",he:"קימה מכיסא",note:"internal"},unknown:{id:"other",he:"אחר"}});
  assert.deepEqual(Object.keys(alternatives),["squat"]);
  assert.equal(alternatives.squat.note,undefined);
  assert.equal(suggestedLessonDuration({start:"23:30",end:"00:15"}),45);
});
