import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {specialtyCatalog,planPilatesWorkout,exactMatCapacity} from "../lib/specialty-workouts.js";
import {variedExerciseOrder,repeatedExerciseSet} from "../lib/workout-variation.js";
import {planStationRotation} from "../lib/station-rotation.js";
import {studioPlaylistType} from "../lib/studio-playlists.js";
import {workoutTaskFrame} from "../lib/workout-task.js";
import {suggestedWorkoutType} from "../lib/instructor-schedule.js";
const catalog=JSON.parse(fs.readFileSync(new URL('../data/exercises.json',import.meta.url)));
const inventory=[{name_he:"מזרני פילאטיס",quantity:12,category:"pilates"},{name_he:"קוביות פילאטיס",quantity:24,category:"pilates"},{name_he:"TRX",quantity:6,category:"other"},{name_he:"אוברבול",quantity:5,category:"balls"},{name_he:"כדורי פיזיו",quantity:12,category:"balls"}];
test("Pilates requires actual mats and never counts blocks or large balls as missing small equipment",()=>{
  assert.equal(exactMatCapacity(inventory),12);
  const pool=specialtyCatalog("pilates",catalog,"מעורב");
  const plan=planPilatesWorkout({pool,inventory,participants:9,minutes:50,structure:"בלוקים",level:"מעורב"});
  assert.equal(plan.error,undefined);
  assert.ok(plan.exercises.every(x=>x.id.startsWith('pilates-')));
  assert.ok(!plan.exercises.some(x=>x.equipment==='אוברבול'));
  const elapsed=plan.sections.reduce((sum,x)=>sum+Number(x.detail.match(/^\d+/)[0]),0)+plan.transitionMinutes+6+5;
  assert.equal(elapsed,50);
  assert.match(planPilatesWorkout({pool,inventory,participants:13,minutes:50,structure:"בלוקים",level:"מעורב"}).error,/מזרנים/);
});
test("fresh ordering prefers unused exercises and discloses when the candidate set is unchanged",()=>{
  const pool=specialtyCatalog('pilates',catalog,'מתחילים');const previous=pool.slice(0,6);
  const ordered=variedExerciseOrder(pool,previous,()=>0.5);
  assert.ok(ordered.slice(0,6).every(x=>!previous.some(y=>y.id===x.id)));
  assert.equal(repeatedExerciseSet(ordered.slice(0,6),previous),false);
  assert.equal(repeatedExerciseSet([...previous].reverse(),previous),true);
  assert.equal(repeatedExerciseSet(previous.slice(1),previous),false);
});
test("TRX nine-person rotation reserves no more than six straps and fills remaining places without straps",()=>{
  const pool=specialtyCatalog('trx',catalog,'מעורב');
  const ordered=[...pool.filter(x=>x.equipment==='TRX'),...pool.filter(x=>x.equipment==='ללא ציוד')];
  const plan=planStationRotation(ordered,inventory,9,34,'trx','מעורב');
  assert.equal(plan.stationRotation.length,9);
  const strapDemand=plan.stationRotation.filter(index=>plan.exercises[index-1].equipment==='TRX').length;
  assert.ok(strapDemand>0&&strapDemand<=6);
  assert.ok(plan.exercises.some(x=>x.equipment==='ללא ציוד'));
  assert.ok(pool.every(x=>x.level!=='מתקדמים'));
});
test("specialties work across Arbox suggestions, task frames and playlist types",()=>{
  for(const type of ['pilates','trx']){assert.equal(studioPlaylistType(type),type);assert.equal(workoutTaskFrame({type,duration:50,participants:9,limitations:[]}).type,type);}
  assert.equal(suggestedWorkoutType('פילאטיס ומתיחות'),'pilates');assert.equal(suggestedWorkoutType('TRX'),'trx');
});
