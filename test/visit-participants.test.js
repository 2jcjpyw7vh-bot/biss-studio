import test from 'node:test';
import assert from 'node:assert/strict';
import {participantInput,participantChecklist,sharedVisitProjection,participantTrainingReady} from '../lib/visit-participants.js';
test('participant invitation requires permission and personal contact, without importing privileges',()=>{
 const input={name:' Guest ',email:'Guest@Example.com',phone:'0540000000',contactPermission:true,role:'manager',health_verified:true};
 assert.deepEqual(participantInput(input),{name:'Guest',email:'guest@example.com',phone:'0540000000',age_band:'unknown'});
 assert.equal(participantInput({...input,contactPermission:false}),null);
 assert.equal(participantInput({...input,email:'bad\naddress@example.com'}),null);
 assert.equal(participantInput({...input,name:''}),null);
});
test('phone-only invitation lets a minor provide email later without collecting identity documents',()=>{
 assert.deepEqual(participantInput({name:'Guest',phone:'0520000000',ageBand:'minor',contactPermission:true}),{name:'Guest',phone:'0520000000',email:'',age_band:'minor'});
 assert.equal(participantInput({name:'Guest',phone:'invalid',contactPermission:true}),null);
});
test('minor enrollment requires own registration, health check, introduction and guardian review independently of a paid booking',()=>{
 const complete={arbox_verified:true,health_verified:true,introduction_completed:true,age_band:'minor',guardian_verified:true};
 assert.equal(participantTrainingReady({...complete,guardian_verified:false}),false);
 assert.equal(participantTrainingReady({...complete,introduction_completed:false}),false);
 assert.equal(participantTrainingReady({...complete,health_verified:false}),false);
 assert.equal(participantTrainingReady({...complete,arbox_verified:false}),false);
 assert.equal(participantTrainingReady(complete),true);
 assert.equal(participantTrainingReady({...complete,age_band:'adult',guardian_verified:false}),false);
});
test('invitation never infers registration, health completion or introduction from payment',()=>{
 assert.deepEqual(participantChecklist({status:'accepted',paid:true}),{registration:false,health:false,introduction:false});
 assert.equal(participantChecklist({arbox_verified:'true'}).registration,false);
});
test('guest visit projection removes purchaser preferences and marks read-only participant access',()=>{
 const visible=sharedVisitProjection({id:'booking',title:'Independent visit',preferences:{notes:'private health',musicUrl:'private'}});
 assert.deepEqual(visible,{id:'booking',title:'Independent visit',preferences:{},participant_access:true});
 assert.equal(JSON.stringify(visible).includes('private'),false);
});
