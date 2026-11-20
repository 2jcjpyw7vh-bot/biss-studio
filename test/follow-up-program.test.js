import test from 'node:test';import assert from 'node:assert/strict';
import {safeProgram,followUpDraftError,followUpApprovalError} from '../lib/follow-up-program.js';
const customerId='00000000-0000-0000-0000-000000000001';
const program=safeProgram({title:'תוכנית',sessions:Array.from({length:5},()=>({name:'אימון',items:[{he:'סקוואט',equipment:'ללא ציוד',health:'omit'}]}))});
const task={id:'task',instructor_id:'coach',starts_at:'2026-11-26T07:30:00Z',frame:{duration:60,brief:{kind:'independent-introduction',customerId,customerName:'לקוח',sessions:6},follow_up:{program}}};
test('only the active assigned instructor can draft five follow-up workouts; no role alone grants access',()=>{
 assert.equal(followUpDraftError({id:'coach',role:'instructor',status:'active'},task,program),'');
 for(const profile of [{id:'other',role:'instructor',status:'active'},{id:'other',role:'manager',status:'active'},{id:'coach',role:'instructor',status:'inactive'},{id:'coach',role:'trainee',status:'active'}])assert.ok(followUpDraftError(profile,task,program));
 for(const sessions of [[],program.sessions.slice(0,4),[...program.sessions,program.sessions[0]],program.sessions.map(()=>({items:[]}))])assert.ok(followUpDraftError({id:'coach',role:'instructor',status:'active'},task,{sessions}));
 assert.equal(JSON.stringify(program).includes('health'),false);
});
test('publication requires correct customer/coach, saved draft, completed first appointment and explicit confirmation',()=>{
 const after=Date.parse('2026-11-26T08:31:00Z');
 assert.equal(followUpApprovalError(task,customerId,'coach',true,after),'');
 assert.ok(followUpApprovalError(task,customerId,'coach',true,Date.parse('2026-11-26T08:29:00Z')));
 assert.ok(followUpApprovalError(task,customerId,'coach',false,after));
 assert.ok(followUpApprovalError(task,'other','coach',true,after));
 assert.ok(followUpApprovalError(task,customerId,'other',true,after));
 assert.ok(followUpApprovalError({...task,frame:{...task.frame,follow_up:null}},customerId,'coach',true,after));
});
