import {equipmentFamily} from "./equipment-families.js";
import {workSeconds,workoutEquipment} from "./workout-structure.js";

export function planStationRotation(pool, inventory, people, minutes, type, level) {
  const stations = [];
  const used = new Map();
  const exactUsed = new Map();
  const limit = Math.max(8,Math.min(12,people));
  const reserve = exercise => {
    const {key,capacity} = workoutEquipment(exercise,inventory);
    const family = equipmentFamily(exercise.equipment,inventory);
    if (family === "bodyweight") return true;
    const exact = family !== "anchors" && (exercise.exactEquipment || family === "cardio");
    const familyKey = exact && family !== "other" ? family : key;
    const familyCapacity = exact && family !== "other"
      ? workoutEquipment({...exercise,exactEquipment:false},inventory).capacity : capacity;
    const familyDemand = (used.get(familyKey) || 0) + 1;
    if (familyDemand > familyCapacity) return false;
    if (exact) {
      const exactKey = String(exercise.equipment).trim().toLowerCase();
      const exactCapacity = workoutEquipment({...exercise,exactEquipment:true},inventory).capacity;
      const demand = (exactUsed.get(exactKey) || 0) + 1;
      if (demand > exactCapacity) return false;
      exactUsed.set(exactKey,demand);
    }
    used.set(familyKey,familyDemand);
    return true;
  };

  for (const exercise of pool) {
    if (stations.length === limit) break;
    if (!reserve(exercise)) continue;
    stations.push({exercise,places:1});
  }
  if (!stations.length) return null;
  const rotation = stations.map((_,index)=>index+1);
  while (rotation.length < people) {
    let added = false;
    for (const [index,station] of stations.entries()) {
      if (!reserve(station.exercise)) continue;
      station.places++;
      rotation.push(index+1);
      added = true;
      if (rotation.length === people) break;
    }
    if (!added) return null;
  }

  const interval = Math.min(60,Math.floor((minutes-1)*60/rotation.length/5)*5);
  if (interval < 30) return null;
  const roundLimit = level === "מתחילים" || (type === "functional-hiit" && level !== "מתקדמים") ? 3 : 4;
  const rounds = Math.min(roundLimit,Math.floor((minutes-1)*60/(rotation.length*interval)));
  const active = rounds*rotation.length*interval;
  const prep = minutes*60-active;
  const duration = seconds => [Math.floor(seconds/60) && `${Math.floor(seconds/60)} דק׳`,seconds%60 && `${seconds%60} שנ׳`].filter(Boolean).join(" ו־");
  const work = Math.round((type === "functional-hiit" ? workSeconds(level) : 40)*interval/60);
  return {
    stationRotation:rotation,
    sections:[{start:0,title:"תחנות",detail:`${minutes} דק׳ · ${rounds} סבבים של ${rotation.length} מקטעים בני ${interval} שנ׳ · ${duration(prep)} להדגמה והתארגנות`}],
    exercises:stations.map(({exercise,places})=>({
      ...exercise,
      allocation:places===1?"מקום אחד בתחנה":`${places} מקומות בתחנה`,
      prescription:`${work} שנ׳ עבודה · ${interval-work} שנ׳ מנוחה ומעבר`
    }))
  };
}

export function stationPlaces(rotation) {
  if (!Array.isArray(rotation) || rotation.length>40 ||
    !rotation.every(station=>Number.isInteger(station)&&station>=1&&station<=20)) return [];
  const totals = new Map();
  const seen = new Map();
  for (const station of rotation) totals.set(station,(totals.get(station)||0)+1);
  return rotation.map(station=>{
    const place=(seen.get(station)||0)+1;
    seen.set(station,place);
    return {station,label:totals.get(station)>1 ? `${station}.${place}` : String(station)};
  });
}

export function stationRotationText(rotation) {
  const order=stationPlaces(rotation).map(place=>place.label);
  if (!order.length) return "";
  const places = order.some(item=>item.includes(".")) ? " מספר אחרי נקודה מציין מקום נפרד באותה תחנה." : "";
  return `סדר המעבר בין המקומות: ${order.join(" ← ")}. שבצי משתתפת אחת בכל אחד מהמקומות הראשונים, ואת היתר השאירי פנויים. בסוף כל מקטע כולן עוברות למקום הבא, ומהמקום האחרון חוזרות לראשון.${places}`;
}
