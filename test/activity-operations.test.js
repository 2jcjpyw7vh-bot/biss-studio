import test from 'node:test';
import assert from 'node:assert/strict';
import {activityRoleAllowed,canReadActivity,suggestedActivityKind,activitySourceFrame,activitySourceMatches,activityTerms,activityPlan,completeActivityPlan,clientActivityPlan} from '../lib/activity-operations.js';

const assets=[{id:'xdj-az',name:'XDJ AZ',kind:'asset',quantity:null,active:true},{id:'coffee',name:'פינת קפה',kind:'facility',active:true},{id:'retired',active:false}];
const terms=activityTerms({verified:true,mirror:true,items:[{id:'xdj-az',quantity:1},{id:'coffee',quantity:1,required:false}]},assets);
const plan={picks:[{id:'xdj-az',quantity:1}],arrivalInstructions:'הדרכה וקבלת הציוד',departureInstructions:'בדיקת ציוד והחזרה',clientInstructions:'ברוכים הבאים'};
const lesson={scheduleId:'arbox-demo',date:'2026-11-22',start:'11:00',end:'13:00',cancelled:false};

test('operator sees only assigned non-fitness jobs; no fitness or inactive-account access',()=>{
 const job={kind:'dj',assigned_id:'operator-a'};
 assert.equal(canReadActivity({id:'operator-a',role:'operator',status:'active'},job),true);
 assert.equal(canReadActivity({id:'operator-b',role:'operator',status:'active'},job),false);
 assert.equal(canReadActivity({id:'operator-a',role:'operator',status:'inactive'},job),false);
 assert.equal(canReadActivity({id:'operator-a',role:'operator',status:'active'},{...job,kind:'self_workout'}),false);
 assert.equal(canReadActivity({id:'operator-a',role:'trainee',status:'active'},job),false);
 assert.equal(canReadActivity(undefined,job),false);
 assert.equal(canReadActivity({role:'manager',status:'active'},undefined),false);
 assert.equal(activityRoleAllowed('instructor','self_workout'),true);
 assert.equal(activityRoleAllowed('manager','dj'),true);
 assert.equal(activityRoleAllowed('operator','unknown'),false);
 assert.equal(activityRoleAllowed('manager','__proto__'),false);
});

test('source time frame uses Israel time, allows midnight and rejects cancelled or invalid schedule',()=>{
 assert.deepEqual(activitySourceFrame(lesson),{starts_at:'2026-11-22T09:00:00.000Z',ends_at:'2026-11-22T11:00:00.000Z'});
 assert.equal(activitySourceFrame({...lesson,cancelled:true}),null);
 assert.equal(activitySourceFrame({...lesson,start:'99:00'}),null);
 assert.equal(activitySourceFrame({...lesson,end:'23:30'}),null);
 assert.deepEqual(activitySourceFrame({...lesson,start:'23:00',end:'01:00'}),{starts_at:'2026-11-22T21:00:00.000Z',ends_at:'2026-11-22T23:00:00.000Z'});
 const job={arbox_schedule_id:lesson.scheduleId,...activitySourceFrame(lesson)};
 assert.equal(activitySourceMatches(job,lesson),true);
 assert.equal(activitySourceMatches(job,{...lesson,end:'14:00'}),false);
 assert.equal(activitySourceMatches(job,{...lesson,scheduleId:'other'}),false);
 assert.equal(activitySourceMatches(job,{...lesson,cancelled:true}),false);
});

test('classification is only a suggestion, ordinary fitness remains class',()=>{
 assert.equal(suggestedActivityKind('DJ practice'),'dj');
 assert.equal(suggestedActivityKind('אימון עצמאי זוגי'),'self_workout');
 assert.equal(suggestedActivityKind('השכרת חלל'),'hourly');
 assert.equal(suggestedActivityKind('פילאטיס מזרן'),'class');
});

test('booking terms require manager verification and current unique catalog items',()=>{
 assert.equal(activityTerms({verified:false,items:[]},assets),null);
 for(const items of [[{id:'missing',quantity:1}],[{id:'retired',quantity:1}],[{id:'xdj-az',quantity:0}],[{id:'xdj-az',quantity:1.5}],[{id:'xdj-az',quantity:1},{id:'xdj-az',quantity:1}]])assert.equal(activityTerms({verified:true,items},assets),null);
 assert.equal(terms.items[0].name,'XDJ AZ');
 assert.equal(assets[0].quantity,null,'unknown stock must not be invented');
});

test('operator cannot add unbooked equipment or exceed entitlement; required equipment blocks submission',()=>{
 assert.equal(activityPlan({...plan,picks:[{id:'projector',quantity:1}]},terms),null);
 assert.equal(activityPlan({...plan,picks:[{id:'xdj-az',quantity:2}]},terms),null);
 assert.equal(activityPlan({...plan,picks:[{id:'xdj-az',quantity:1},{id:'xdj-az',quantity:1}]},terms),null);
 assert.equal(completeActivityPlan({...plan,picks:[]},terms),false);
 assert.equal(completeActivityPlan({...plan,arrivalInstructions:' '},terms),false);
 assert.equal(completeActivityPlan({...plan,picks:[{id:'xdj-az',quantity:2}]},terms),false);
 assert.equal(completeActivityPlan(plan,terms),true);
 assert.equal(activityPlan(plan,null),null);
});

test('customer view hides draft plans and excludes staff identity and private fields',()=>{
 const job={id:'job-demo',kind:'dj',terms,plan,status:'draft',assigned_id:'private',visit_id:'private',recruitment:'private',health:'private'};
 assert.equal(clientActivityPlan(job),null);
 const visible=clientActivityPlan({...job,status:'ready'});
 assert.deepEqual(Object.keys(visible).sort(),['id','kind','mirror','clientInstructions','arrivalInstructions','departureInstructions','equipment'].sort());
 assert.deepEqual(visible.equipment,[{name:'XDJ AZ',quantity:1}]);
 assert.equal(visible.mirror,true);
 assert.equal(clientActivityPlan({...job,status:'ready',plan:{...plan,picks:[]}}),null);
});
