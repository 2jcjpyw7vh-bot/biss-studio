import test from "node:test";
import assert from "node:assert/strict";
import {BONE_TYPE, boneDemos, boneExercisesForLevel} from "../lib/bone-strength.js";
import {LOWER_BODY, UPPER_BODY, matchesBodyRegion, planWorkoutBlocks, workoutEquipment, workoutTimeline} from "../lib/workout-structure.js";
import {publicSubstituteOffer} from "../lib/substitute-privacy.js";

test("body presets share the block map and one selected preset creates only one block", () => {
  assert.equal(matchesBodyRegion("גב", [UPPER_BODY]), true);
  assert.equal(matchesBodyRegion("שוק", [UPPER_BODY]), false);
  assert.equal(matchesBodyRegion("שוק", [UPPER_BODY, LOWER_BODY]), true);
  const catalog = boneExercisesForLevel("מתחילים");
  const plan = planWorkoutBlocks({
    pool: catalog.filter(x => matchesBodyRegion(x.region, [LOWER_BODY])),
    inventory: [], people: 12, minutes: 25, level: "מתחילים", type: BONE_TYPE,
    regions: [LOWER_BODY], finisherPool: catalog
  });
  assert.match(plan.sections[0].title, /^בלוק 1 · פלג גוף תחתון/);
  assert.equal(plan.transition, 0);
  assert.equal(plan.sections.length, 2);
  assert.match(plan.sections[1].title, /שיווי משקל/);
  assert.ok(plan.exercises.every(x => x.equipment === "ללא ציוד"));
});

test("short beginner lesson has usable station timing, no jumps or advanced catalog entries", () => {
  const catalog = boneExercisesForLevel("מעורב");
  const plan = planWorkoutBlocks({
    pool: catalog.filter(x => !x.closing),
    inventory: [{name_he:"גומיות התנגדות",category:"bands",quantity:3}],
    people: 12, minutes: 20, level: "מעורב", type: BONE_TYPE, finisherPool: catalog
  });
  assert.ok(plan.sections.length >= 2);
  assert.ok(plan.sections.every(x => !x.detail.includes("0 סבבים")));
  assert.ok(plan.exercises.every(x => x.level === "מתחילים" && !/jump|impact/i.test(x.pattern)));
});

test("a 30-minute Studio bone-strength workout has two complete blocks and optional balance", () => {
  const catalog=boneExercisesForLevel("מעורב");
  const inventory=[
    {name_he:"גומיות התנגדות",category:"bands",quantity:12},
    {name_he:"כיסאות",category:"other",quantity:4},
    {name_he:"מדרגה",category:"cardio",quantity:1}
  ];
  const options={pool:catalog.filter(x=>!x.closing),inventory,people:9,minutes:30,level:"מעורב",type:BONE_TYPE};
  const plan=planWorkoutBlocks({...options,finisherPool:catalog});
  assert.deepEqual(plan.sections.map(section=>section.start),[0,3,6]);
  assert.equal(plan.exercises.length,8);
  assert.ok(plan.exercises.some(item=>item.id==="bone-sit-to-stand"));
  assert.ok(plan.exercises.some(item=>item.id==="bone-kneeling-side-plank"));
  assert.ok(!plan.exercises.some(item=>item.id==="bone-step"));
  assert.deepEqual(workoutTimeline({...plan,durationMinutes:30,warm:["6 דק׳"],cool:["5 דק׳"],transitionMinutes:2}),{
    warm:6,main:13,finisher:4,transition:2,cool:5
  });
  assert.equal(planWorkoutBlocks(options).sections.length,2);
  const rejected=planWorkoutBlocks({...options,pool:[catalog.find(x=>x.id==="bone-wall-press")]});
  assert.match(rejected.error,/פלג גוף עליון: 1.*פלג גוף תחתון: 0/);
  assert.equal(rejected.exercises,undefined);
});

test("a bike cannot satisfy the equipment requirement of a step-up station", () => {
  const step = boneExercisesForLevel("מתחילים").find(x => x.id === "bone-step");
  const bike = {name_he:"אופני כושר", category:"cardio", quantity:8};
  assert.equal(workoutEquipment(step, [bike]).capacity, 0);
  assert.equal(workoutEquipment(step, [bike,{name_he:"מדרגה",category:"cardio",quantity:2}]).capacity, 2);
});

test("only known source links are shown and hidden offers omit all demos", () => {
  const workout_payload = {exercises:[{id:"bone-wall-press",demoUrl:"https://untrusted.invalid"},{id:"invented"}],privateNote:"secret"};
  const demos = boneDemos(workout_payload);
  assert.equal(demos.length, 1);
  assert.equal(new URL(demos[0].demoUrl).hostname, "theros.org.uk");
  const offer = {biss_sessions:{workout_payload}};
  assert.equal(publicSubstituteOffer(offer).biss_sessions.bone_demos, undefined);
  const visible = publicSubstituteOffer({...offer,show_workout:true}).biss_sessions;
  assert.deepEqual(visible.bone_demos, demos);
  assert.equal(visible.workout_payload, undefined);
});
