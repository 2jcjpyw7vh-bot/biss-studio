import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {availableExerciseEquipment,equipmentCapacity,equipmentFamily} from "../lib/equipment-families.js";
import {workoutEquipment} from "../lib/workout-structure.js";
import {planStationRotation} from "../lib/station-rotation.js";

const inventory=[
  {name_he:"משקולות יד 2 ק״ג",category:"dumbbells",quantity:8,active:true},
  {name_he:"משקולות יד 5 ק״ג",category:"dumbbells",quantity:4,active:true},
  {name_he:"קטלבל 4–8 ק״ג",category:"kettlebells",quantity:6,active:true}
];

test("floor and waist anchors have independent capacity, including legacy categories",()=>{
  const floor="נקודת עיגון לגומיות - רצפה";
  const waist="נקודת עיגון לגומיות - גובה מותן";
  const stock=[
    {name_he:floor,category:"anchor",quantity:2},
    {name_he:waist,category:"anchor",quantity:4}
  ];
  const exercises=[{id:"deadlift",equipment:floor},{id:"row",equipment:waist}];
  assert.equal(equipmentCapacity(floor,stock),2);
  assert.equal(equipmentCapacity(waist,stock),4);
  assert.equal(equipmentCapacity(floor,stock.slice(1)),0);
  assert.notEqual(workoutEquipment(exercises[0],stock).key,workoutEquipment(exercises[1],stock).key);
  assert.deepEqual(availableExerciseEquipment(exercises,stock),["ללא ציוד",floor,waist]);
  const plan=planStationRotation(exercises,stock,6,20,"functional-hiit","מעורב");
  assert.equal(plan.stationRotation.filter(station=>station===1).length,2);
  assert.equal(plan.stationRotation.filter(station=>station===2).length,4);
  assert.equal(planStationRotation(exercises,stock,7,20,"functional-hiit","מעורב"),null);
});

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

test("stocked apparatus with catalog exercises appear individually in the builder",()=>{
  const catalog=JSON.parse(readFileSync(new URL("../data/exercises.json",import.meta.url),"utf8"));
  const names=["TRX","חישוק פילאטיס","גלייד דיסק","שרפרף 30 ס״מ","כיסאות","גומיות לופ ארוכות","מוט משקולת + סט פלטות"];
  const stock=names.map(name_he=>({name_he,category:"other",quantity:4,active:true}));
  stock[5].category="bands";
  stock[6].category="barbells";
  const labels=availableExerciseEquipment(catalog,stock);
  for(const name of [...names.slice(0,-1),"מוט משקולת"])assert.ok(labels.includes(name),name);
  assert.equal(labels.includes("אחר"),false);
  assert.equal(equipmentCapacity("TRX",stock.filter(x=>x.name_he!=="TRX")),0);
  assert.equal(equipmentCapacity("גומיות לופ ארוכות",stock),4);
  assert.equal(equipmentCapacity("גומיות התנגדות",stock),0);
  stock[0].quantity=0;
  assert.equal(availableExerciseEquipment(catalog,stock).includes("TRX"),false);
});

