import {whatsappNumber} from './substitute-contact.js';
import {activityRoleAllowed,canReadActivity} from './activity-operations.js';
const short=value=>typeof value==='string'?value.trim().slice(0,180):'';
export function activityContact(person,phoneFallback=''){
 if(person?.status!=='active')return null;
 const raw=whatsappNumber(person.phone)?person.phone:phoneFallback,number=whatsappNumber(raw);
 const email=short(person.email).toLowerCase();
 return {name:short(person.full_name)||'צוות BISS',phone:number?String(raw).trim():'',email:/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)?email:''};
}
export function assignedActivityContact(job,visit,person){
 if(!job||!visit||job.visit_id!==visit.id||job.status==='cancelled'||visit.status==='cancelled'||job.assigned_id!==person?.id||!activityRoleAllowed(person?.role,job.kind))return null;
 return activityContact(person);
}
export function activityCustomerContacts(profile,job,visit,payer,participants=[],people=[]){
 if(!canReadActivity(profile,job)||job.status==='cancelled'||!visit||visit.status==='cancelled'||job.visit_id!==visit.id||job.customer_id!==visit.customer_id)return [];
 const result=[],seen=new Set();
 if(payer?.id===visit.customer_id){const contact=activityContact(payer);if(contact){result.push({...contact,label:'הלקוח/ה המשלם/ת'});seen.add(payer.id);}}
 for(const row of participants){
  if(row.visit_id!==visit.id||row.status!=='accepted'||seen.has(row.user_id))continue;
  const person=people.find(person=>person.id===row.user_id),contact=activityContact(person,row.contact_phone);
  if(contact){result.push({...contact,label:'משתתף/ת נוסף/ת'});seen.add(row.user_id);}
 }
 return result;
}
export function activityContactLinks(contact,visit,direction='customer'){
 const number=whatsappNumber(contact?.phone),title=short(visit?.title).replace(/\s+/g,' ');
 const time=Date.parse(visit?.starts_at);
 const date=Number.isFinite(time)?new Intl.DateTimeFormat('he-IL',{timeZone:'Asia/Jerusalem',dateStyle:'short',timeStyle:'short'}).format(new Date(time)):'';
 const body=direction==='staff'?`שלום ${contact?.name||''}, כאן צוות BISS. אני פונה בנוגע להזמנה ״${title}״${date?` בתאריך ${date}`:''}.`:`שלום ${contact?.name||''}, יש לי שאלה בנוגע לביקור שלי בביסס ״${title}״${date?` בתאריך ${date}`:''}.`;
 const email=contact?.email||'';
 return {whatsapp:number?`https://wa.me/${number}?text=${encodeURIComponent(body)}`:'',tel:number?`tel:+${number}`:'',mail:/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)?`mailto:${encodeURIComponent(email).replace(/%40/g,'@')}?subject=${encodeURIComponent('BISS · '+title)}&body=${encodeURIComponent(body)}`:''};
}
