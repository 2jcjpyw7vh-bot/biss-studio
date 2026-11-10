import {equipmentCapacity, equipmentFamily} from "./equipment-families.js";

export const BLOCKS = "בלוקים";
export const STRUCTURES = ["תחנות", "סטים וחזרות", "סופר סט / Super Fit", "AMRAP", "EMOM", "פירמידה", BLOCKS];
export const FINISHER_TITLE = "פינישר ליבה קבוצתי";

const upper = new Set(["חזה", "כתפיים", "גב", "ידיים"]);
const lower = new Set(["רגליים", "ישבן", "ירך אחורית", "ירך", "ירכיים", "שוק"]);

export function workSeconds(level) {
  if (level === "מתחילים") return 30;
  if (level === "מתקדמים") return 45;
  return 40;
}

export function workoutPrescription({type, structure, level, index, count, paired}) {
  const hiit = type === "functional-hiit";
  const seconds = workSeconds(level);
  const reps = level === "מתחילים" ? "8–10" : "10–12";
  const interval = `${seconds} שנ׳ עבודה · ${60 - seconds} שנ׳ מנוחה`;
  switch (structure) {
    case "סטים וחזרות":
      if (hiit) return `עד ${reps} חזרות נשלטות בתוך ${seconds} שנ׳ · ${60 - seconds} שנ׳ מנוחה · 3 סטים`;
      return `${type === "classic" ? (index % 2 ? 10 : 12) : reps} חזרות × 3 סטים · 30–45 שנ׳ מנוחה`;
    case "סופר סט / Super Fit":
      if (!paired) return hiit ? `${interval} · 3 סבבים` : `${reps} חזרות · 3 סטים · 45 שנ׳ מנוחה`;
      return hiit ? `${seconds} שנ׳ לכל תרגיל בזוג · ${60 - seconds} שנ׳ אחרי הזוג · 3 סבבים` : `${type === "classic" ? "8–12" : reps} חזרות · מעבר לתרגיל הבא בזוג · 60–90 שנ׳ מנוחה אחרי הזוג`;
    case "AMRAP":
      return hiit ? "סבבים איכותיים ב־10 דקות · 6–8 חזרות לתרגיל · מנוחה לפי צורך" : `${type === "classic" ? "8–12" : reps} חזרות · AMRAP של 10–14 דקות בקצב נשלט`;
    case "EMOM":
      return `${hiit ? seconds : 35} שנ׳ לכל היותר בתחילת כל דקה · יתרת הדקה מנוחה · ${count * 2} דקות (2 סבבים)`;
    case "פירמידה":
      return hiit ? `${seconds - 10} / ${seconds - 5} / ${seconds} / ${seconds - 5} / ${seconds - 10} שנ׳ עבודה · יתרת כל דקה מנוחה` : "8 / 10 / 12 / 10 / 8 חזרות · מנוחה בין הסטים";
    default:
      return hiit ? `${interval} · ${level === "מתקדמים" ? 4 : 3} סבבים` : "40 שנ׳ עבודה · 20 שנ׳ מעבר · 3 סבבים";
  }
}

export function workoutEquipment(exercise, inventory) {
  const label = exercise.equipment;
  const family = equipmentFamily(label, inventory);
  if (family !== "other") return {key: family, capacity: equipmentCapacity(label, inventory)};
  const key = String(label || "").trim().toLowerCase();
  const items = inventory.filter(item => item.active !== false && String(item.name_he || "").trim().toLowerCase() === key);
  return {key, capacity: items.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0)};
}

function pickStations(pool, people, inventory) {
  for (let count = Math.min(4, pool.length); count > 0; count--) {
    const perStation = Math.ceil(people / count);
    const used = new Map();
    const picked = [];
    for (const exercise of pool) {
      const {key, capacity} = workoutEquipment(exercise, inventory);
      const demand = (used.get(key) || 0) + perStation;
      if (demand > capacity) continue;
      picked.push(exercise);
      used.set(key, demand);
      if (picked.length === count) return {picked, perStation};
    }
  }
  return {picked: [], perStation: 0};
}

export function planFinisher(pool, minutes, start) {
  const selected = pool.filter(x => x.region === "ליבה" && x.equipment === "ללא ציוד" && !["שחרור", "מוביליטי", "מתיחות"].includes(x.goal)).slice(0, 2);
  if (!selected.length) return null;
  const duration = minutes < 30 ? 2 : 4;
  return {
    minutes: duration,
    section: {start, title: FINISHER_TITLE, detail: `${duration} דק׳ · כולן יחד · ${duration / selected.length} סבבים`},
    exercises: selected.map(x => ({...x, prescription: "30 שנ׳ עבודה נשלטת · 30 שנ׳ מנוחה או מעבר"}))
  };
}

export function planWorkoutBlocks({pool, inventory, people, minutes, level, type, finisherPool = []}) {
  const slots = [
    {title: "בלוק 1 · פלג גוף עליון", ...pickStations(pool.filter(x => upper.has(x.region)), people, inventory)},
    {title: "בלוק 2 · פלג גוף תחתון", ...pickStations(pool.filter(x => lower.has(x.region)), people, inventory)}
  ];
  const active = slots.filter(x => x.picked.length);
  const finisher = planFinisher(finisherPool, minutes, active.reduce((total, slot) => total + slot.picked.length, 0));
  const transition = active.length === 2 ? 2 : 0;
  const warmMinutes = minutes < 30 ? 4 : 6;
  const coolMinutes = minutes < 30 ? 3 : 5;
  const finisherMinutes = finisher?.minutes || 0;
  const available = minutes - warmMinutes - coolMinutes - finisherMinutes - transition;
  const perBlock = Math.floor(available / (active.length || 1));
  const exercises = [];
  const sections = [];
  const warnings = [];
  const hiit = type === "functional-hiit";
  const seconds = hiit ? workSeconds(level) : 40;
  slots.forEach(({title, picked, perStation}, i) => {
    if (picked.length < 4) warnings.push(`${title}: ${picked.length ? `נמצאו ${picked.length} תחנות מתאימות` : "לא נמצאה תחנה מתאימה"} לפי הבחירה, המלאי וגודל הקבוצה.`);
    if (!picked.length) return;
    const blockMinutes = perBlock + (active.length === 2 && i === 1 ? available % 2 : 0);
    const rounds = Math.min(5, Math.floor(blockMinutes / picked.length));
    const coaching = blockMinutes - rounds * picked.length;
    const detail = `${blockMinutes} דק׳ · ${rounds} סבבים · עד ${perStation} בתחנה${coaching ? ` · ${coaching} דק׳ להדגמה והתאוששות` : ""}`;
    sections.push({start: exercises.length, title, detail});
    const prescription = hiit
      ? `${seconds} שנ׳ עבודה · ${60 - seconds} שנ׳ מעבר/מנוחה`
      : `${level === "מתחילים" ? "6–8" : "8–10"} חזרות נשלטות בתוך 40 שנ׳ · 20 שנ׳ מעבר`;
    exercises.push(...picked.map(x => ({...x, prescription})));
  });
  if (finisher) {
    sections.push(finisher.section);
    exercises.push(...finisher.exercises);
  }
  return {sections, exercises, warnings, warmMinutes, coolMinutes, transition, finisherMinutes};
}

export function publicWorkoutSections(workout, count) {
  if (!Array.isArray(workout.sections)) return [];
  const seen = new Set();
  return workout.sections.slice(0, 10).flatMap(section => {
    const start = section?.start;
    if (!Number.isInteger(start) || start < 0 || start >= count || seen.has(start)) return [];
    seen.add(start);
    const title = String(section.title || "").trim().slice(0, 100);
    const detail = String(section.detail || "").trim().slice(0, 220);
    return title ? [{start, title, detail}] : [];
  }).sort((a, b) => a.start - b.start);
}

export function workoutSummary(workout) {
  const headings = new Map(publicWorkoutSections(workout, workout.exercises.length).map(section => [section.start, section]));
  const lines = [workout.title, workout.meta];
  if (headings.size && workout.warm?.length) lines.push("", "חימום", ...workout.warm);
  for (const [index, exercise] of workout.exercises.entries()) {
    const heading = headings.get(index);
    if (heading?.title.startsWith("בלוק 2") && workout.transitionMinutes) {
      lines.push("", `${workout.transitionMinutes} דק׳ התארגנות בין הבלוקים`);
    }
    if (heading) lines.push("", heading.title, heading.detail);
    lines.push(`${index + 1}. ${exercise.he} — ${exercise.prescription}`);
  }
  if (headings.size && workout.cool?.length) lines.push("", "שחרור", ...workout.cool);
  return lines.join("\n");
}
