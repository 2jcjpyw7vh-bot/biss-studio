import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BARRE_EQUIPMENT, barreCapacity, planBarreWorkout} from "../lib/barre.js";
import {workoutEquipment} from "../lib/workout-structure.js";

const catalog = JSON.parse(readFileSync(new URL("../data/exercises.json", import.meta.url), "utf8"));
const pool = catalog.filter(x => x.barreGroup === "standing" || x.barreGroup === "control");
const finisher = catalog.find(x => x.barreGroup === "finisher");
const inventory = [{name_he: BARRE_EQUIPMENT, category: "bar", active: true, quantity: 1}];
const options = {pool, inventory, participants: 7, minutes: 50, level: "מעורב", structure: "בלוקים"};

test("fixed barre has seven places and a weighted bar does not satisfy it", () => {
  assert.equal(barreCapacity(inventory), 7);
  assert.equal(barreCapacity([{name_he: "מוט משקולת + סט פלטות", quantity: 3}]), 0);
  assert.equal(barreCapacity([{...inventory[0], active: false}]), 0);
  assert.equal(workoutEquipment(pool[0], inventory).capacity, 7);
  for (const participants of [0, 7.5, 8, 40]) assert.match(planBarreWorkout({...options, participants}).error, /1 עד 7/);
  assert.match(planBarreWorkout({...options, inventory: []}).error, /אינו זמין/);
  assert.equal(planBarreWorkout(options).error, undefined);
});

test("Barre plans account for every minute across structures and finisher choices", () => {
  for (const structure of ["בלוקים", "סטים וחזרות"]) {
    for (const minutes of [20, 50, 90]) {
      for (const closing of [undefined, finisher]) {
        const plan = planBarreWorkout({...options, structure, minutes, finisher: closing});
        const total = [plan.warm[0], ...plan.sections.map(x => x.detail), plan.cool[0]]
          .reduce((sum, text) => sum + Number.parseInt(text, 10), plan.transitionMinutes);
        assert.equal(total, minutes);
        assert.equal(plan.transitionMinutes, structure === "בלוקים" ? 2 : 0);
        assert.equal(plan.exercises.some(x => x.barreGroup === "finisher"), Boolean(closing));
        assert.ok(plan.exercises.every(x => x.equipment === BARRE_EQUIPMENT && x.slotMinutes >= 3));
      }
    }
  }
});
