import {equipmentCapacity, equipmentFamily} from "./equipment-families.js";
import {BONE_TYPE, bonePrescription} from "./bone-strength.js";
import {BARRE_EQUIPMENT, barreCapacity} from "./barre.js";

export const BLOCKS = "בלוקים";
export const STRUCTURES = ["תחנות", "סטים וחזרות", "סופר סט / Super Fit", "AMRAP", "EMOM", "פירמידה", BLOCKS];
export const FINISHER_TITLE = "פינישר ליבה קבוצתי";
export const SUPERSET = "סופר סט / Super Fit";

export const UPPER_BODY = "פלג גוף עליון";
export const LOWER_BODY = "פלג גוף תחתון";
const bodyRegions = {
  [UPPER_BODY]: new Set(["חזה", "כתפיים", "גב", "ידיים"]),
  [LOWER_BODY]: new Set(["רגליים", "ישבן", "ירך אחורית", "ירך", "ירכיים", "שוק", "קרסול"])
};

export function matchesBodyRegion(region, selected) {
  return !selected.length || selected.some(choice => choice === region || bodyRegions[choice]?.has(region));
}

export function workSeconds(level) {
  if (level === "מתחילים") return 30;
  if (level === "מתקדמים") return 45;
  return 40;
}

export function workoutPrescription({type, structure, level, index, count, paired}) {
  if (type === BONE_TYPE) return bonePrescription({});
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
  if (label === BARRE_EQUIPMENT) return {key: BARRE_EQUIPMENT, capacity: barreCapacity(inventory)};
  const family = equipmentFamily(label, inventory);
  if (family !== "other" && !exercise.exactEquipment) return {key: family, capacity: equipmentCapacity(label, inventory)};
  const key = String(label || "").trim().toLowerCase();
  const items = inventory.filter(item => item.active !== false && String(item.name_he || "").trim().toLowerCase() === key);
  return {key, capacity: items.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0)};
}

function pickStations(pool, people, inventory, limit) {
  for (let count = Math.min(limit, pool.length); count > 0; count--) {
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

export function planFinisher(pool, minutes, start, type) {
  const bone = type === BONE_TYPE;
  const selected = pool.filter(x => (bone ? x.closing : x.region === "ליבה") && x.equipment === "ללא ציוד" && !["שחרור", "מוביליטי", "מתיחות"].includes(x.goal)).slice(0, 2);
  if (!selected.length) return null;
  const duration = minutes < 30 ? 2 : 4;
  return {
    minutes: duration,
    section: {start, title: bone ? "סיום קבוצתי · שיווי משקל" : FINISHER_TITLE, detail: bone
      ? `${duration} דק׳ · בהדרכה · לוודא תמיכה יציבה ומרווח לכל משתתפת`
      : `${duration} דק׳ · כולן יחד · ${duration / selected.length} סבבים`},
    exercises: selected.map(x => ({...x, prescription: bone ? bonePrescription(x) : "30 שנ׳ עבודה נשלטת · 30 שנ׳ מנוחה או מעבר"}))
  };
}

export function planBoneSets(exercises, minutes, level) {
  if (!exercises.length) return {exercises: [], preparationMinutes: minutes};
  const slotBudget = Math.min(minutes, exercises.length * 9);
  const baseMinutes = Math.floor(slotBudget / exercises.length);
  const extraSlots = slotBudget % exercises.length;
  return {
    preparationMinutes: minutes - slotBudget,
    exercises: exercises.map((exercise, index) => {
      const slotMinutes = baseMinutes + Number(index < extraSlots);
      const sets = slotMinutes < 3 ? 1 : level === "בינוניים" && slotMinutes >= 6 ? 3 : 2;
      return {
        ...exercise,
        prescription: `${slotMinutes} דק׳ לתרגיל · ${sets} סטים · ${bonePrescription(exercise)} · עד 90 שנ׳ לסט כולל מנוחה · יתרת הזמן להדגמה, תרגול טכניקה ומעבר`
      };
    })
  };
}

export function planSupersets(exercises, minutes, type, level) {
  const groups = [];
  for (const [index, exercise] of exercises.entries()) {
    const last = groups.at(-1);
    if (exercise.supersetGroup && last?.items[0].supersetGroup === exercise.supersetGroup) last.items.push(exercise);
    else groups.push({start: index, items: [exercise]});
  }
  const sections = [];
  const prescribed = [];
  for (const [index, group] of groups.entries()) {
    const slot = Math.floor(minutes / groups.length) + Number(index < minutes % groups.length);
    const paired = group.items.length === 2;
    const hiit = type === "functional-hiit";
    const work = hiit ? workSeconds(level) : 45;
    const rest = hiit ? 60 - work : paired ? 90 : 45;
    const rounds = Math.min(3, Math.max(1, Math.floor((slot * 60 + rest) / (work * group.items.length + rest))));
    const reps = type === "classic" || !type ? "8–12" : level === "מתחילים" ? "8–10" : "10–12";
    const prescription = hiit ? `${work} שנ׳ עבודה בכל סבב` : `${reps} חזרות בכל ${paired ? "סבב" : "סט"}`;
    const restText = hiit ? `${rest} שנ׳` : paired ? "60–90 שנ׳" : "45 שנ׳";
    const sequence = paired ? " · תרגיל A ואז B" : "";
    const count = rounds === 1 ? (paired ? "סבב אחד" : "סט אחד") : `${rounds} ${paired ? "סבבים" : "סטים"}`;
    const recovery = rounds > 1 ? ` · ${restText} מנוחה בין ${paired ? "הסבבים" : "הסטים"}` : "";
    sections.push({start:group.start,
      title:paired ? `זוג ${group.items[0].supersetGroup} · סופר־סט` : `תרגיל ${index + 1} · סטים`,
      detail:`${slot} דק׳ · ${count}${sequence}${recovery} · יתרת הזמן להדגמה, התאמות והתארגנות`});
    prescribed.push(...group.items.map(exercise=>({...exercise,
      prescription:`${paired ? `${exercise.supersetSlot}${exercise.supersetGroup} · ` : ""}${prescription}`})));
  }
  return {sections, exercises:prescribed};
}

export function workoutDuration(workout) {
  return workout.durationMinutes || Number(String(workout.meta || "").match(/^(\d+)\s*דק/)?.[1]) || null;
}

export function sharedWorkoutPlan(workout) {
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
  const sections = publicWorkoutSections(workout, exercises.length);
  const duration = workoutDuration(workout);
  const isSuperset = workout.structure === SUPERSET || String(workout.meta || "").includes(SUPERSET);
  if (!isSuperset || !duration || !exercises.length || sections.some(s=>/^זוג \d|^תרגיל \d/.test(s.title))) {
    return {sections, exercises, duration};
  }
  const closing = sections.find(s=>s.title === FINISHER_TITLE);
  const main = sections.find(s=>s.start === 0);
  const warm = duration < 30 ? 4 : 6;
  const cool = duration < 30 ? 3 : 5;
  const finisher = Number.parseInt(closing?.detail,10) || 0;
  const mainMinutes = Number.parseInt(main?.detail,10) || duration-warm-cool-finisher;
  if (mainMinutes < 1) return {sections, exercises, duration};
  const mainExercises = exercises.slice(0, closing?.start).map(exercise=>{
    const legacyPair = String(exercise.prescription || "").match(/^([AB])(\d+)\s*·/);
    return !exercise.supersetGroup && legacyPair
      ? {...exercise,supersetSlot:legacyPair[1],supersetGroup:Number(legacyPair[2])}
      : exercise;
  });
  const plan = planSupersets(mainExercises,mainMinutes,workout.type,workout.level);
  return {
    duration, legacyTiming: {warm,cool,mainMinutes,finisher},
    sections: [...plan.sections,...(closing?[closing]:[])],
    exercises: [...plan.exercises,...(closing?exercises.slice(closing.start):[])]
  };
}

export function planWorkoutBlocks({pool, inventory, people, minutes, level, type, finisherPool = [], regions = []}) {
  const bodyChoices = [UPPER_BODY, LOWER_BODY];
  const requested = bodyChoices.filter(choice => regions.some(region => region === choice || bodyRegions[choice].has(region)));
  const blockChoices = requested.length ? requested : bodyChoices;
  const warmMinutes = minutes < 30 ? 4 : 6;
  const coolMinutes = minutes < 30 ? 3 : 5;
  const bone = type === BONE_TYPE;
  const slotMinutes = bone ? 1.5 : 1;
  const finisher = planFinisher(finisherPool, minutes, 0, type);
  const finisherMinutes = finisher?.minutes || 0;
  const budget = minutes - warmMinutes - coolMinutes - finisherMinutes - (blockChoices.length === 2 ? 2 : 0);
  const limit = Math.min(4, Math.floor(Math.floor(budget / blockChoices.length) / slotMinutes));
  const slots = blockChoices.map((choice, i) => ({
    title: `בלוק ${i + 1} · ${choice}`,
    ...pickStations(pool.filter(x => bodyRegions[choice].has(x.region)), people, inventory, limit)
  }));
  const active = slots.filter(x => x.picked.length);
  const transition = active.length === 2 ? 2 : 0;
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
    const rounds = Math.min(bone ? 3 : 5, Math.floor(blockMinutes / (picked.length * slotMinutes)));
    const coaching = blockMinutes - rounds * picked.length * slotMinutes;
    const detail = `${blockMinutes} דק׳ · ${rounds} סבבים · עד ${perStation} בתחנה${coaching ? ` · ${coaching} דק׳ להדגמה והתאוששות` : ""}`;
    sections.push({start: exercises.length, title, detail});
    const prescription = hiit
      ? `${seconds} שנ׳ עבודה · ${60 - seconds} שנ׳ מעבר/מנוחה`
      : `${level === "מתחילים" ? "6–8" : "8–10"} חזרות נשלטות בתוך 40 שנ׳ · 20 שנ׳ מעבר`;
    exercises.push(...picked.map(x => ({...x, prescription: bone ? `${bonePrescription(x)} · עד 90 שנ׳ לתחנה כולל מנוחה ומעבר` : prescription})));
  });
  if (finisher) {
    sections.push({...finisher.section, start: exercises.length});
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
