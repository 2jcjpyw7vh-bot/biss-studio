import test from "node:test";
import assert from "node:assert/strict";
import {planWorkoutBlocks, planFinisher, planBoneSets, planSupersets, sharedWorkoutPlan, SUPERSET, workoutEquipment, workoutPrescription, workoutSummary} from "../lib/workout-structure.js";

const bodyweight = "ללא ציוד";
const exercise = (id, region, equipment = bodyweight) => ({id, he: id, region, equipment});
const upper = Array.from({length: 4}, (_, i) => exercise("upper" + i, "חזה"));
const lower = Array.from({length: 4}, (_, i) => exercise("lower" + i, "רגליים"));
const core = [exercise("core1", "ליבה"), exercise("core2", "ליבה")];
const options = {inventory: [], people: 12, minutes: 45, level: "מתחילים", type: "functional-hiit"};

test("builds 4+4 stations and a separate synchronous finisher within the lesson", () => {
  const plan = planWorkoutBlocks({...options, pool: [...upper, ...lower], finisherPool: core});
  assert.deepEqual(plan.sections.map(x => x.start), [0, 4, 8]);
  assert.equal(plan.exercises.length, 10);
  assert.match(plan.sections[0].detail, /עד 3 בתחנה/);
  assert.match(plan.exercises[0].prescription, /30 שנ׳ עבודה/);
  assert.match(plan.sections[2].detail, /כולן יחד/);
  const blockMinutes = plan.sections.slice(0, 2).reduce((total, x) => total + Number.parseInt(x.detail), 0);
  assert.equal(blockMinutes + plan.warmMinutes + plan.coolMinutes + plan.transition + plan.finisherMinutes, 45);
});

test("concurrent stations cannot overbook two variants of the same equipment family", () => {
  const variants = ["משקולות יד 1 ק״ג", "משקולות יד 2 ק״ג"];
  const inventory = variants.map(name_he => ({name_he, category: "dumbbells", quantity: 2}));
  const limited = [exercise("weights1", "חזה", variants[0]), exercise("weights2", "גב", variants[1]), ...upper];
  const plan = planWorkoutBlocks({...options, inventory, pool: [...limited, ...lower]});
  assert.equal(plan.exercises.filter(x => variants.includes(x.equipment)).length, 1);
  assert.equal(plan.warnings.length, 0);
});

test("an unrelated item in Other does not give an absent apparatus capacity", () => {
  assert.equal(workoutEquipment(exercise("trx", "גב", "TRX"), [{name_he:"חבל", category:"other", quantity:12}]).capacity, 0);
  const plan = planWorkoutBlocks({...options, pool:lower});
  assert.equal(plan.sections.length, 1);
  assert.equal(plan.transition, 0);
  assert.match(plan.warnings[0], /לא נמצאה/);
});

test("functional structures change prescriptions and the finisher can stand alone", () => {
  const input = {level:"מתחילים", count:6, index:0};
  assert.match(workoutPrescription({...input, type:"functional-hiit", structure:"EMOM"}), /12 דקות/);
  assert.match(workoutPrescription({...input, type:"functional-hiit", structure:"פירמידה"}), /20 \/ 25 \/ 30/);
  assert.match(workoutPrescription({...input, type:"functional", structure:"סטים וחזרות"}), /8–10 חזרות/);
  const finisher = planFinisher(core, 25, 6);
  assert.equal(finisher.section.start, 6);
  assert.equal(finisher.minutes, 2);
});

test("summary preserves block headings and can read legacy workouts", () => {
  const plan = planWorkoutBlocks({...options, pool:[...upper, ...lower], finisherPool:core});
  const summary = workoutSummary({title:"אימון", meta:"בלוקים", ...plan, transitionMinutes:2});
  assert.match(summary, /בלוק 1[\s\S]*בלוק 2[\s\S]*פינישר ליבה קבוצתי/);
  assert.match(workoutSummary({title:"ישן", meta:"תחנות", exercises:[{he:"תרגיל", prescription:"3 סטים"}]}), /תרגיל — 3 סטים/);
});

test("a 50 minute bone workout reallocates the full finisher budget when disabled", () => {
  const exercises=lower.map(x=>({...x,boneReps:"8–10"}));
  const withFinisher=planBoneSets(exercises,50-6-5-4,"מעורב");
  const withoutFinisher=planBoneSets(exercises,50-6-5,"מעורב");
  const plannedMinutes=plan=>plan.preparationMinutes+plan.exercises.reduce((sum,x)=>sum+Number.parseInt(x.prescription),0);
  assert.equal(plannedMinutes(withFinisher)+6+5+4,50);
  assert.equal(plannedMinutes(withoutFinisher)+6+5,50);
  assert.deepEqual(withoutFinisher.exercises.map(x=>Number.parseInt(x.prescription)),[9,9,9,9]);
  assert.equal(withoutFinisher.preparationMinutes,3);
  assert.ok(withoutFinisher.exercises.every(x=>x.prescription.includes("2 סטים")));
});

test("blocks retain the full duration when the finisher is off", () => {
  const pool=[...upper,...lower];
  const off=planWorkoutBlocks({...options,pool});
  const on=planWorkoutBlocks({...options,pool,finisherPool:core});
  const blockMinutes=plan=>plan.sections.slice(0,2).reduce((sum,x)=>sum+Number.parseInt(x.detail),0);
  assert.equal(blockMinutes(off)-blockMinutes(on),on.finisherMinutes);
  assert.equal(blockMinutes(off)+off.warmMinutes+off.coolMinutes+off.transition,options.minutes);
});

test("a 50-minute superset workout specifies pairs, rounds and per-round repetitions", () => {
  const exercises=Array.from({length:6},(_,i)=>({
    ...exercise(`pair-${i}`,"רגליים"),supersetGroup:Math.floor(i/2)+1,supersetSlot:i%2?"B":"A"
  }));
  const plan=planSupersets(exercises,39,"classic","מעורב");
  assert.deepEqual(plan.sections.map(x=>x.start),[0,2,4]);
  assert.ok(plan.sections.every(x=>/^13 דק׳ · 3 סבבים/.test(x.detail)));
  assert.match(plan.exercises[1].prescription,/B1 · 8–12 חזרות בכל סבב/);
  const legacy=sharedWorkoutPlan({meta:`50 דק׳ · 9 משתתפות · ${SUPERSET}`,exercises:exercises.map(x=>({
    id:x.id,prescription:`${x.supersetSlot}${x.supersetGroup} · 8–12 חזרות`
  }))});
  assert.deepEqual(legacy.legacyTiming,{warm:6,cool:5,mainMinutes:39,finisher:0});
  assert.deepEqual(legacy.sections,plan.sections);
  const newShare=sharedWorkoutPlan({meta:`50 דק׳ · ${SUPERSET}`,...plan});
  assert.equal(newShare.legacyTiming,undefined);
  assert.deepEqual(newShare.sections,plan.sections);
});
