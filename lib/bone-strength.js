export const BONE_TYPE = "bone-strength";
export const BONE_NOTICE = "טיוטה לשיעור בהדרכת מדריכה. יש לבדוק התאמה אישית, במיוחד לאחר שבר או כשיש סיכון מוגבר לשבר.";

const source = "https://theros.org.uk/information-and-support/exercise/";
const strength = source + "exercise-for-bones/strength-exercise-to-help-make-your-bones-stronger/";
const balance = source + "exercise-to-help-your-balance/";
const bodyweight = "ללא ציוד";

function exercise(slug, he, en, region, equipment, pattern, cue, demo = {}) {
  const {url = strength, level = 1, placement = "", close = false, exactEquipment = false} = demo;
  return {
    id: "bone-" + slug, he, en, region, equipment, pattern, cue, goal: placement ? "יציבות" : "חיזוק",
    level: level === 1 ? "מתחילים" : "בינוניים", muscles: region,
    safety: close ? "יש לוודא נקודת תמיכה יציבה ומקום בטוח לכל משתתפת." : "המדריכה בודקת טווח תנועה, התנגדות וטכניקה לפני העלאת עומס.",
    demoUrl: url, demoLabel: placement || `סרטון רמה ${level}`,
    closing: Boolean(placement), exactEquipment
  };
}

export const BONE_EXERCISES = [
  exercise("wall-press", "דחיפה מול קיר", "Wall Press", "חזה", bodyweight, "Push", "עמדו מול קיר יציב. כופפו ויישרו את המרפקים בשליטה.", {close:true}),
  exercise("kneeling-side-plank", "פלאנק צד בתמיכת ברכיים", "Kneeling Side Plank", "ליבה", bodyweight, "Plank", "תמכו באמה ובברכיים. המדריכה בודקת התאמה לכתף ולמעבר לרצפה."),
  exercise("band-row", "חתירה בגומייה", "Band-assisted Row", "גב", "גומיות התנגדות", "Pull", "משכו את המרפקים לאחור בלי להרים את הכתפיים. המדריכה בודקת את הגומייה ואת אופן העיגון."),
  exercise("press-up", "שכיבת סמיכה", "Press-up", "חזה", bodyweight, "Push", "גרסה מתקדמת ביחס לדחיפה מול קיר. שמרו על גוף יציב ועבדו בטווח שהמדריכה אישרה.", {level:2}),
  exercise("single-band-row", "חתירה ביד אחת בגומייה", "Single-arm Band-assisted Row", "גב", "גומיות התנגדות", "Pull", "משכו ביד אחת בלי לסובב את הגוף. המדריכה בודקת את הגומייה ואת אופן העיגון.", {level:2}),
  exercise("bridge", "גשר ישבן", "Bridge", "ישבן", bodyweight, "Hinge", "הרימו אגן בשליטה תוך שמירה על נשימה רציפה. המדריכה בודקת התאמה למעבר לרצפה."),
  exercise("sit-to-stand", "קימה מכיסא", "Sit-to-stand", "רגליים", "כיסאות", "Squat", "השתמשו בכיסא יציב ללא גלגלים. קומו ושבו בשליטה בטווח שהמדריכה אישרה.", {exactEquipment:true}),
  exercise("split-lunge", "מכרע בעמידת פסיעה", "Split Lunge", "רגליים", bodyweight, "Lunge", "התחילו בטווח קטן ובשליטה. ודאו תמיכה יציבה זמינה לפי הצורך.", {close:true}),
  exercise("step", "עלייה למדרגה", "Step", "רגליים", "מדרגה", "Step", "השתמשו במדרגה יציבה ובגובה שאושר, עם תמיכה לפי הצורך.", {close:true,exactEquipment:true}),
  exercise("squat", "סקוואט מבוקר", "Squat", "רגליים", bodyweight, "Squat", "כופפו ברכיים וירכיים בטווח נשלט, והתרוממו בקצב קבוע.", {level:2}),
  exercise("band-hinge", "ציר ירך בגומייה", "Band-assisted Romanian Deadlift", "ירך אחורית", "גומיות התנגדות", "Hinge", "שלחו את האגן אחורה תוך שמירה על גב יציב והשתמשו בהתנגדות שהמדריכה אישרה.", {level:2}),
  exercise("dumbbell-lunge", "מכרע עם משקולות יד", "Dumbbell Lunge", "רגליים", "משקולות יד", "Lunge", "הוסיפו משקל רק לאחר שהמדריכה בדקה יציבות וטכניקה.", {level:2}),
  exercise("heel-raise", "עליית עקבים ליד תמיכה", "Supported Heel Raise", "שיווי משקל", bodyweight, "Balance", "התרוממו באיטיות על קדמת כף הרגל ליד משטח יציב.", {url:balance,placement:"סרטון שיווי משקל",close:true}),
  exercise("heel-toe-stand", "עמידת עקב לצד אצבעות", "Supported Heel-toe Stand", "שיווי משקל", bodyweight, "Balance", "עמדו ליד משטח יציב. שמרו על תמיכה והחליפו את הרגל המובילה לפי הנחיית המדריכה.", {url:balance,placement:"סרטון שיווי משקל",close:true})
];

export function boneExercisesForLevel(level) {
  return BONE_EXERCISES.filter(x => level !== "מתחילים" && level !== "מעורב" || x.level === "מתחילים");
}

export function boneDemos(workout) {
  const ids = new Set(Array.isArray(workout?.exercises) ? workout.exercises.map(x => x?.id) : []);
  return BONE_EXERCISES.filter(x => ids.has(x.id)).map(({id, he, demoUrl, demoLabel}) => ({id, he, demoUrl, demoLabel}));
}

export function bonePrescription(exercise) {
  return exercise.closing
    ? "תרגול נשלט ליד תמיכה · עצירה ומנוחה לפי הצורך"
    : "6–10 חזרות נשלטות · מנוחה לפני הסבב הבא · ללא יעד מהירות";
}
