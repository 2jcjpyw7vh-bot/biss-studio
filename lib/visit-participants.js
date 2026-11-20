export const participantStatusLabels={invited:'ממתין לאישור ההזמנה',accepted:'ההצטרפות אושרה',removed:'ההזמנה בוטלה'};
export function participantInput(body){
 const name=typeof body?.name==='string'?body.name.trim().slice(0,120):'';
 const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
 const phone=typeof body?.phone==='string'?body.phone.trim().slice(0,40):'';
 if(!name||email.length>180||email&&!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)||!email&&!whatsappNumber(phone)||body.contactPermission!==true)return null;
 return {name,email,phone,age_band:['minor','adult'].includes(body.ageBand)?body.ageBand:'unknown'};
}
export function participantChecklist(row){
 return {registration:row.arbox_verified===true,health:row.health_verified===true,introduction:row.introduction_completed===true};
}
export function sharedVisitProjection(visit){
 // The purchaser's personal preferences and administration details never reach a guest.
 const {preferences,...safe}=visit;return {...safe,preferences:{},participant_access:true};
}
export function participantTrainingReady(row){return row?.arbox_verified===true&&row.health_verified===true&&row.introduction_completed===true&&row.guardian_verified===true;}
export async function participantTrainingGate(db,userId,now=new Date()){
 const participants=await db.from('biss_visit_participants').select('visit_id,arbox_verified,health_verified,introduction_completed,age_band,guardian_verified').eq('user_id',userId).eq('status','accepted');
 if(participants.error)return {error:true};
 if(!participants.data.length)return {pending:false};
 const visits=await db.from('biss_visits').select('id').in('id',participants.data.map(row=>row.visit_id)).in('service_kind',['workout','mixed']).eq('status','confirmed').gt('ends_at',now.toISOString());
 if(visits.error)return {error:true};
 return {pending:participants.data.some(row=>visits.data.some(visit=>visit.id===row.visit_id)&&!participantTrainingReady(row))};
}
import {whatsappNumber} from './substitute-contact.js';
