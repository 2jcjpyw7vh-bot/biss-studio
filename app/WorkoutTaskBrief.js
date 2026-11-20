import {taskBrief,taskNextStep} from '../lib/workout-task-notice';
export default function WorkoutTaskBrief({task}){
 const brief=taskBrief(task.frame);if(!brief)return null;
 return <section className="safe" aria-label="תדריך למפגש הפתיחה"><h3>מפגש פתיחה · {brief.customerName}</h3><p>תוכנית של 6 מפגשים: מפגש ראשון עם מדריכה ועוד 5 אימונים עצמאיים לפי התוכנית שתותאם לאחר ההיכרות.</p><p><strong>השלב הבא: {taskNextStep(task)}</strong></p><p>המפגש נועד להיכרות עם המטרות והיכולות, הדרכה והתאמת התרגילים והציוד. לאחריו בונים את התוכנית להמשך ומעבירים לאישור ושיוך במערכת.</p><p className="small">השיבוץ כבר קיים בארבוקס. אין בכך אישור נוכחות מטעמך, אישור רפואי או הרשאה לשימוש בציוד.</p></section>;
}
