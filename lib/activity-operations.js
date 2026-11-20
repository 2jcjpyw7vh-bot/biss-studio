import {studioLocalTimeToIso} from './studio-time.js';
export const activityKinds={dj:'פעילות DJ',self_workout:'אימון עצמאי',hourly:'פעילות שעתית'};
export const activityStatuses={draft:'ממתין להכנה',submitted:'הכנה ממתינה לאישור מנהל',ready:'הפעילות מוכנה',cancelled:'בוטל'};
export const activityRoleAllowed=(role,kind)=>Object.hasOwn(activityKinds,kind)&&(role==='manager'||(kind==='self_workout'?role==='instructor':role==='operator'));
export const canReadActivity=(profile,job)=>Boolean(job&&profile?.status==='active'&&activityRoleAllowed(profile.role,job.kind)&&(profile.role==='manager'||Boolean(profile.id)&&profile.id===job.assigned_id));
export function isPersonalIntroduction(name){return /^מפגש (?:התאמה|היכרות) אישי לאימון עצמאי$/.test(String(name||'').normalize('NFKC').trim().replace(/\s+/g,' '));}
export function suggestedActivityKind(name){const text=String(name||'').toLowerCase();if(isPersonalIntroduction(name))return 'class';return /\bdjs?\b|די[י־ -]*ג[׳']?יי|דיג.?יי/.test(text)?'dj':/אימון.*עצמא|עצמא.*אימון/.test(text)?'self_workout':/השכר|פעילות שעתית|ביקור עצמאי/.test(text)?'hourly':'class';}
export function activitySourceFrame(lesson){
 if(!lesson||lesson.cancelled)return null;
 const start=studioLocalTimeToIso(`${lesson.date}T${lesson.start}`);let end=studioLocalTimeToIso(`${lesson.date}T${lesson.end}`);
 if(start&&end&&Date.parse(end)<=Date.parse(start)){const date=new Date(`${lesson.date}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);end=studioLocalTimeToIso(`${date.toISOString().slice(0,10)}T${lesson.end}`);}
 if(!start||!end||Date.parse(end)-Date.parse(start)>43200000)return null;
 return {starts_at:start,ends_at:end};
}
export function activitySourceMatches(job,lesson){const frame=activitySourceFrame(lesson);return Boolean(frame&&lesson.scheduleId===job.arbox_schedule_id&&Date.parse(frame.starts_at)===Date.parse(job.starts_at)&&Date.parse(frame.ends_at)===Date.parse(job.ends_at));}
const clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
export function activityTerms(input,assets){
 if(input?.verified!==true||!Array.isArray(input.items)||input.items.length>40||!Array.isArray(assets))return null;
 const seen=new Set();const items=[];
 for(const item of input.items){const asset=assets.find(asset=>asset.id===item?.id&&asset.active);const quantity=Number(item?.quantity);if(!asset||seen.has(asset.id)||!Number.isInteger(quantity)||quantity<1||quantity>100)return null;seen.add(asset.id);items.push({id:asset.id,name:asset.name,kind:asset.kind,quantity,required:item.required!==false});}
 return {items,mirror:input.mirror===true,notes:clean(input.notes,1600)};
}
export function activityPlan(input,terms){
 if(!input||!Array.isArray(input.picks)||input.picks.length>40||!Array.isArray(terms?.items))return null;
 const ids=new Set(),picks=[];
 for(const pick of input.picks){const quantity=Number(pick?.quantity),allowance=terms.items.find(item=>item.id===pick?.id);if(!allowance||ids.has(pick.id)||!Number.isInteger(quantity)||quantity<1||quantity>allowance.quantity)return null;ids.add(pick.id);picks.push({id:pick.id,quantity});}
 return {picks,clientInstructions:clean(input.clientInstructions,2000),arrivalInstructions:clean(input.arrivalInstructions,1200),departureInstructions:clean(input.departureInstructions,1200)};
}
export function completeActivityPlan(plan,terms){const valid=activityPlan(plan,terms);return Boolean(valid&&valid.arrivalInstructions&&valid.departureInstructions&&terms.items.filter(item=>item.required).every(item=>valid.picks.some(pick=>pick.id===item.id&&pick.quantity===item.quantity)));}
// Caller must verify customer ownership and revalidate the current Arbox source first.
export function clientActivityPlan(job){if(job?.status!=='ready'||!completeActivityPlan(job.plan,job.terms))return null;return {id:job.id,kind:job.kind,mirror:job.terms.mirror===true,clientInstructions:job.plan.clientInstructions||'',arrivalInstructions:job.plan.arrivalInstructions||'',departureInstructions:job.plan.departureInstructions||'',equipment:job.plan.picks.map(pick=>({name:job.terms.items.find(item=>item.id===pick.id)?.name||'',quantity:pick.quantity})).filter(item=>item.name)};}
