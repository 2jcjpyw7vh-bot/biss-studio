import test from "node:test";
import assert from "node:assert/strict";
import {availableExerciseEquipment,equipmentCapacity,equipmentFamily} from "../lib/equipment-families.js";

const inventory=[
  {name_he:"משקולות יד 2 ק״ג",category:"dumbbells",quantity:8,active:true},
  {name_he:"משקולות יד 5 ק״ג",category:"dumbbells",quantity:4,active:true},
  {name_he:"קטלבל 4–8 ק״ג",category:"kettlebells",quantity:6,active:true}
];

test("weight variants resolve to one equipment family",()=>{
  assert.equal(equipmentFamily("משקולות יד",inventory),"dumbbells");
  assert.equal(equipmentFamily("משקולות יד 5 ק״ג",inventory),"dumbbells");
});

test("station capacity totals every active item in the family",()=>{
  assert.equal(equipmentCapacity("משקולות יד",inventory),12);
  assert.equal(equipmentCapacity("קטלבל",inventory),6);
});

test("exercise filters expose families, not individual weights",()=>{
  const labels=availableExerciseEquipment([{equipment:"משקולות יד"},{equipment:"קטלבל"}],inventory);
  assert.deepEqual(labels,["ללא ציוד","משקולות יד","קטלבל"]);
});

