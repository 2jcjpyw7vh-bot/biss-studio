const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const name=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,120):'';
export function introductionBrief(input,customer){
 if(input?.verified!==true||Number(input.sessions)!==6||!uuid(customer?.id)||customer.status!=='active'||!name(customer.full_name))return null;
 return {kind:'independent-introduction',customerId:customer.id,customerName:name(customer.full_name),sessions:6};
}
export function taskBrief(frame){
 const brief=frame?.brief;
 return brief?.kind==='independent-introduction'&&brief.sessions===6&&uuid(brief.customerId)&&name(brief.customerName)?{kind:brief.kind,customerId:brief.customerId,customerName:name(brief.customerName),sessions:6}:null;
}
export function taskNextStep(task){return task?.submitted_at?'האימון הוכן ונשלח. אפשר לפתוח אותו לבדיקה או לעריכה.':taskBrief(task?.frame)?'להכין את מפגש הפתיחה עם הלקוח':'לבנות את האימון ולשלוח אותו למנהלת';}
export function workoutTaskNotice(person,task,url){
 const date=new Intl.DateTimeFormat('he-IL',{timeZone:'Asia/Jerusalem',weekday:'long',day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(task.starts_at));
 const brief=taskBrief(task.frame);
 const lines=[`היי ${name(person.full_name).replace(/\s*[—–].*$/,'')}, 🌿`,`מחכה לך ${brief?'מפגש פתיחה לפיילוט האימונים העצמאיים של BISS':'משימת אימון ב־BISS Studio'}.`,brief?`*הלקוח: ${brief.customerName}*`:`האימון: ${name(task.title)}`,`מתי? ${date}${task.frame?.duration?` · ${task.frame.duration} דקות`:''}`];
 if(brief)lines.push('נרכשה סדרה של 6 מפגשים: מפגש ראשון איתך ועוד 5 אימונים עצמאיים לפי התוכנית שתתאימי לאחר ההיכרות.','במפגש הראשון תכירי את המטרות והיכולות, תדריכי ותגדירי את התרגילים והציוד המתאימים.','השיבוץ כבר קיים בארבוקס. ההודעה הזו היא בקשת הכנה, ולא אישור נוכחות בשמך.');
 lines.push(`מה השלב הבא? ${taskNextStep(task)}`,brief?'לאחר המפגש: לבנות את התוכנית להמשך ולהעביר לאישור ושיוך במערכת.':'מסגרת האימון מחכה לך במשימה.','לפתיחת המשימה ולהמשך 👇',url,'אם את כבר מחוברת בדפדפן הזה, תמשיכי ישירות. אחרת אפשר לאשר כניסה בקישור האישי. הקישור מיועד לך בלבד.','תודה, צוות BISS 🌿');
 return lines.join('\n\n');
}
