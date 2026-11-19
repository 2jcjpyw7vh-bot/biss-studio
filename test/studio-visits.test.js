import test from 'node:test';
import assert from 'node:assert/strict';
import {visitFrameError,visitHasDJ,visitHasWorkout,visitMediaUrl,visitOwnerId,visitPhase,visitPreferenceResult} from '../lib/studio-visits.js';
import {loginDestination,loginTarget} from '../lib/studio-login.js';
const now=new Date('2026-11-19T10:00:00Z');
const visit={id:'demo',title:'DJ visit',service_kind:'dj',status:'confirmed',starts_at:'2026-11-20T09:00:00Z',ends_at:'2026-11-20T12:00:00Z',arbox_booking_id:'QA123',party_size:2,included_items:['זמן לסט DJ — שלוש שעות']};
test('visits support short, long and mixed uses while keeping a bounded booking frame',()=>{
 assert.equal(visitFrameError(visit,now),'');
 assert.equal(visitFrameError({...visit,service_kind:'mixed'},now),'');
 assert.match(visitFrameError({...visit,ends_at:'2026-11-20T09:10:00Z'},now),/משך/);
 assert.match(visitFrameError({...visit,ends_at:'2026-11-21T09:00:00Z'},now),/משך/);
 assert.match(visitFrameError({...visit,party_size:0},now),/מבקרים/);
 assert.match(visitFrameError({...visit,included_items:[]},now),/כלול/);
 assert.equal(visitHasDJ({...visit,service_kind:"mixed",activities:["workout","leisure"]}),false);
 assert.equal(visitHasWorkout({...visit,service_kind:"mixed",activities:["dj","leisure"]}),false);
 assert.equal(visitHasDJ({...visit,service_kind:"mixed",activities:["workout","dj","leisure"]}),true);
 assert.equal(visitHasDJ(visit),true);assert.equal(visitHasWorkout(visit),false);
});
test('customer preferences cannot mutate times, payment, owner or equipment eligibility',()=>{
 const result=visitPreferenceResult(visit,{starts_at:'2099-01-01',customer_id:'other',status:'paid',equipment_access:true,workoutMinutes:60,bodyAreas:'arms',equipmentRequests:'חיבור למחשב',musicUrl:'https://soundcloud.com/artist/demo'},now);
 assert.deepEqual(Object.keys(result.preferences).sort(),['equipmentRequests','musicTitle','musicUrl','notes']);
 assert.equal(result.preferences.equipmentRequests,'חיבור למחשב');
 assert.equal(visitMediaUrl('javascript:alert(1)'), '');assert.equal(visitMediaUrl('https://open.spotify.com.evil.example/playlist/demo'),'');assert.equal(visitMediaUrl('https://user:password@open.spotify.com/playlist/demo'),'');
});
test('workout time fits booked time; non-DJ gear requests are not saved',()=>{
 const workout={...visit,service_kind:'workout',ends_at:'2026-11-20T10:00:00Z'};
 assert.match(visitPreferenceResult(workout,{workoutMinutes:90},now).error,/משך/);
 const result=visitPreferenceResult(workout,{workoutMinutes:45,equipmentRequests:'DJ',bodyAreas:'גוף מלא'},now);
 assert.equal(result.preferences.workoutMinutes,45);assert.equal(result.preferences.equipmentRequests,'');
 assert.ok(visitPreferenceResult({...workout,status:'cancelled'},{workoutMinutes:45},now).error);
 assert.ok(visitPreferenceResult(workout,{workoutMinutes:45},new Date('2026-11-21T10:00:00Z')).error);
});
test('visit phase and login target honor the booking boundary and client role',()=>{
 assert.equal(visitPhase(visit,new Date(visit.starts_at)),'current');assert.equal(visitPhase(visit,new Date(visit.ends_at)),'past');
 const id='20d8be70-bafd-49e3-92b9-051d69b0978c';assert.equal(loginTarget('visit:'+id),'visit:'+id);assert.equal(loginDestination('visit:'+id,'trainee'),'/my-visits?visit='+id);assert.equal(loginDestination('visit:'+id,'instructor'),'');assert.equal(loginTarget('visit:https://evil.example'),'');assert.equal(loginDestination('my-visits','trainee'),'/my-visits');
});

test('client ownership cannot be overridden through a preview parameter',()=>{
 const other="20d8be70-bafd-49e3-92b9-051d69b0978c";
 assert.equal(visitOwnerId({id:"self",role:"trainee",status:"active"},other),"self");
 assert.equal(visitOwnerId({id:"coach",role:"instructor",status:"active"},other),"");
 assert.equal(visitOwnerId({id:"manager",role:"manager",status:"active"},other),other);
 assert.equal(visitOwnerId({id:"manager",role:"manager",status:"inactive"},other),"");
});
