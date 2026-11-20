import test from 'node:test';
import assert from 'node:assert/strict';
import {activitySetup,activityCustomerPreferences} from '../lib/activity-catalog.js';
import {activityVisitState} from '../lib/activity-visit-state.js';
import {activitySourceFrame,suggestedActivityKind} from '../lib/activity-operations.js';
import {loginTarget,loginDestination} from '../lib/studio-login.js';
import {personalArea} from '../lib/studio-navigation.js';
import {canAccessInstructorArea,canViewAdaptations} from '../lib/studio-permissions.js';

test('payment confirmation needs explicit manager check and both order and payment references',()=>{
 const valid={verified:true,receipt:'21618803',bookingReference:'arbox-order',partySize:1};
 assert.equal(activitySetup({...valid,verified:false}),null);
 assert.equal(activitySetup({...valid,receipt:''}),null);
 assert.equal(activitySetup({...valid,bookingReference:' '}),null);
 assert.equal(activitySetup({...valid,partySize:0}),null);
 assert.equal(activitySetup(valid).party_size,1);
});
test('customer readiness disappears when the Arbox event changes, is absent or cannot be verified',()=>{
 const lesson={scheduleId:'live-id',date:'2026-11-22',start:'12:00',end:'13:00'};
 const job={arbox_schedule_id:'live-id',...activitySourceFrame(lesson),status:'ready'};
 assert.equal(activityVisitState(job,{lessons:[lesson]}),'ready');
 assert.equal(activityVisitState(job,{lessons:[{...lesson,end:'14:00'}]}),'changed');
 assert.equal(activityVisitState(job,{lessons:[{...lesson,cancelled:true}]}),'changed');
 assert.equal(activityVisitState(job,{lessons:[]}),'changed');
 assert.equal(activityVisitState(job,{error:'unavailable'}),'unverified');
 assert.equal(activityVisitState({...job,status:'draft'},{lessons:[lesson]}),'waiting');
 assert.equal(suggestedActivityKind('זמן יצירה למוזיקאים ו-DJs'),'dj');
});
test('operator destinations are bounded and confer neither instructor nor health access',()=>{
 const id='20d8be70-bafd-49e3-92b9-051d69b0978c';
 assert.equal(personalArea('operator'),'/operations');
 assert.equal(loginTarget('activity:'+id),'activity:'+id);
 assert.equal(loginDestination('activity:'+id,'operator'),'/operations?job='+id);
 assert.equal(loginDestination('activity:'+id,'trainee'),'');
 assert.equal(loginTarget('activity:https://evil.example'),'');
 assert.equal(canAccessInstructorArea({role:'operator',status:'active'}),false);
 assert.equal(canViewAdaptations({role:'operator',status:'active',can_view_health:true}),false);
});
test('operator preparation receives only equipment requests and validated music, never general or medical notes',()=>{
 const preferences=activityCustomerPreferences({equipmentRequests:'חיבור למחשב',musicTitle:'הסט שלי',musicUrl:'https://soundcloud.com/artist/demo',notes:'private medical note',health:'private',receipt:'private'});
 assert.deepEqual(Object.keys(preferences).sort(),['equipmentRequests','musicTitle','musicUrl']);
 assert.equal(JSON.stringify(preferences).includes('private'),false);
 assert.equal(activityCustomerPreferences({musicUrl:'javascript:alert(1)'}).musicUrl,'');
});
