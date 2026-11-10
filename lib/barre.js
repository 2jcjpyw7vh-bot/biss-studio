export const BARRE_TYPE = "barre";
export const BARRE_EQUIPMENT = "בר קבוע בסטודיו";
export const BARRE_MAX_PARTICIPANTS = 7;
export const BARRE_STRUCTURES = ["סטים וחזרות", "בלוקים"];
export const BARRE_NOTICE = "בסטודיו יש 14.5 מטר בר, שחלקם נגישים כיום. עד 7 משתתפות, לאחר בדיקת מרווח בטוח לאורך החלק הנגיש.";

export function barreCapacity(inventory) {
  return inventory.some(item =>
    item.name_he === BARRE_EQUIPMENT && item.active !== false && Number(item.quantity) > 0
  ) ? BARRE_MAX_PARTICIPANTS : 0;
}

export function planBarreWorkout({pool, finisher, inventory, participants, minutes, structure, level}) {
  if (!Number.isInteger(participants) || participants < 1 || participants > BARRE_MAX_PARTICIPANTS) {
    return {error: `אימון בר מתאים ל־1 עד ${BARRE_MAX_PARTICIPANTS} משתתפות.`};
  }
  if (!barreCapacity(inventory)) return {error: "הבר הקבוע אינו זמין במלאי הפעיל של Studio."};
  const warmMinutes = minutes < 30 ? 5 : 7;
  const coolMinutes = minutes < 30 ? 4 : 6;
  const finisherMinutes = finisher ? (minutes < 30 ? 3 : 4) : 0;
  const mainMinutes = minutes - warmMinutes - coolMinutes - finisherMinutes;
  const standing = pool.filter(x => x.barreGroup === "standing");
  const control = pool.filter(x => x.barreGroup === "control");
  if (!standing.length && !control.length) {
    return {error: "לא נמצאו תרגילי בר לאזור שנבחר. בחרו אזור נוסף או את כל הגוף."};
  }
  const hasTransition = structure === "בלוקים" && standing.length > 0 && control.length > 0;
  const transitionMinutes = hasTransition ? 2 : 0;
  const available = mainMinutes - transitionMinutes;
  const limit = Math.min(8, Math.floor(available / 3));
  const selected = [];
  for (let i = 0; selected.length < limit && i < Math.max(standing.length, control.length); i++) {
    for (const exercise of [standing[i], control[i]]) {
      if (exercise && selected.length < limit) selected.push(exercise);
    }
  }
  const groups = structure === "בלוקים" ? [
    {label: "רגליים וישבן", items: selected.filter(x => x.barreGroup === "standing")},
    {label: "יציבה, שיווי משקל וידיים", items: selected.filter(x => x.barreGroup === "control")}
  ].filter(x => x.items.length) : [{label: "עבודה רציפה ליד הבר", items: selected}];
  const exerciseBudget = Math.min(available, selected.length * 8);
  const exerciseMinutes = Math.floor(exerciseBudget / selected.length);
  const extraSlots = exerciseBudget % selected.length;
  const preparationMinutes = available - exerciseBudget;
  const sections = [];
  const exercises = [];

  for (const [index, group] of groups.entries()) {
    const start = exercises.length;
    for (const exercise of group.items) {
      const slot = exerciseMinutes + Number(exercises.length < extraSlots);
      const sets = level === "מתקדמים" && slot >= 5 ? 3 : 2;
      const reps = level === "מתקדמים" || level === "בינוניים" ? "10–12" : "6–8";
      exercises.push({...exercise, slotMinutes: slot,
        prescription: `${slot} דק׳ · ${sets} סטים × ${reps} חזרות נשלטות${exercise.eachSide ? " לכל צד" : ""} · מנוחה והדגמה בזמן שהוקצה`});
    }
    const preparation = index === 0 ? preparationMinutes : 0;
    const groupMinutes = exercises.slice(start).reduce((total, exercise) => total + exercise.slotMinutes, preparation);
    sections.push({start, title: structure === "בלוקים" ? `בלוק ${index + 1} · ${group.label}` : group.label,
      detail: `${groupMinutes} דק׳ · כולן יחד ליד הבר · תנועה, הדגמה ומנוחה${preparation ? ` · מתוכן ${preparation} דק׳ לתרגול מודרך של הטכניקה ולהפוגות` : ""}`});
  }
  if (finisher) {
    sections.push({start: exercises.length, title: "פינישר ליבה בעמידה", detail: `${finisherMinutes} דק׳ · כולן יחד ליד הבר`});
    exercises.push({...finisher, slotMinutes: finisherMinutes,
      prescription: `${finisherMinutes} דק׳ · 6–8 חזרות לכל צד בקצב נשלט · נוחו בין הסבבים לפי הצורך`});
  }
  return {
    exercises, sections, transitionMinutes, warnings: [],
    warm: [`${warmMinutes} דק׳ · חימום הדרגתי, הכנת כפות רגליים והדגמת אחיזה קלה בבר`],
    cool: [`${coolMinutes} דק׳ · האטת הקצב, נשימה ומתיחות עדינות בטווח נוח`]
  };
}
