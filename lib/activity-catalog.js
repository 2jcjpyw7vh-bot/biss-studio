// Entitlements are selected only after the manager checks the actual Arbox order.
// This is a preparation catalog, not an assertion of stock or a price list.
import {visitMediaUrl} from './studio-visits.js';
export const activityCatalog=[
 {id:'dj-table',name:'שולחן DJ',kind:'asset',active:true},
 {id:'xdj-az',name:'עמדת XDJ AZ',kind:'asset',active:true},
 {id:'sound',name:'מערכת הגברה',kind:'asset',active:true},
 {id:'mixer',name:'מיקסר סאונד',kind:'asset',active:true},
 {id:'projector',name:'מקרן',kind:'asset',active:true},
 {id:'coffee',name:'גישה לפינת קפה',kind:'facility',active:true},
 {id:'farm-shop',name:'גישה לחנות המשק בשירות עצמי',kind:'facility',active:true},
 {id:'toilets',name:'שירותים',kind:'facility',active:true},
 {id:'screen-mirror',name:'שיקוף מסך',kind:'facility',active:true},
];
export function activitySetup(body,kind){
 if(body?.verified!==true||!body.receipt?.trim()||!body.bookingReference?.trim())return null;
 const size=Number(body.partySize);
 if(!Number.isInteger(size)||size<1||size>12)return null;
 return {party_size:size,receipt:body.receipt.trim().slice(0,160),booking_reference:body.bookingReference.trim().slice(0,120)};
}
export function activityCustomerPreferences(preferences){
 return {equipmentRequests:typeof preferences?.equipmentRequests==='string'?preferences.equipmentRequests.slice(0,800):'',musicTitle:typeof preferences?.musicTitle==='string'?preferences.musicTitle.slice(0,120):'',musicUrl:visitMediaUrl(preferences?.musicUrl)};
}
