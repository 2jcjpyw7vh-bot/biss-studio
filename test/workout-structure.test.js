import test from "node:test";
import assert from "node:assert/strict";
import {planWorkoutBlocks, planFinisher, workoutEquipment, workoutPrescription, workoutSummary} from "../lib/workout-structure.js";

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
