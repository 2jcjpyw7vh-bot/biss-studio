import test from 'node:test';import assert from 'node:assert/strict';
import {introductionBrief,taskBrief,taskNextStep,workoutTaskNotice} from '../lib/workout-task-notice.js';
const customer={id:'00000000-0000-0000-0000-000000000001',full_name:'לקוח\nפיילוט',status:'active',email:'private@example.com',health:'private health'};
test('an introduction brief requires explicitly verified six-session terms and an active linked customer',()=>{
 const brief=introductionBrief({verified:true,sessions:6},customer);assert.equal(brief.customerName,'לקוח פיילוט');assert.deepEqual(Object.keys(brief).sort(),['customerId','customerName','kind','sessions']);
 assert.equal(introductionBrief({verified:false,sessions:6},customer),null);assert.equal(introductionBrief({verified:true,sessions:5},customer),null);assert.equal(introductionBrief({verified:true,sessions:6},{...customer,status:'inactive'}),null);assert.equal(taskBrief({brief:{...brief,sessions:99}}),null);
});
test('the WhatsApp brief describes the actual next step, the whole series and the intended customer without private fields',()=>{
 const task={title:'מפגש התאמה אישי לאימון עצמאי',starts_at:'2026-11-26T07:30:00Z',frame:{duration:60,limitations:['private health'],brief:introductionBrief({verified:true,sessions:6},customer)}};
 const text=workoutTaskNotice({full_name:'מדריכה'},task,'https://example.com/task');
 for(const part of ['לקוח פיילוט','6 מפגשים','5 אימונים עצמאיים','09:30','להכין את מפגש הפתיחה','https://example.com/task'])assert.ok(text.includes(part),part);
 for(const part of ['private@example.com','private health',customer.id])assert.ok(!text.includes(part));
 assert.match(taskNextStep({...task,submitted_at:'now'}),/הוכן ונשלח/);assert.match(workoutTaskNotice({full_name:'מדריכה'},{...task,frame:{duration:60}},'https://example.com/task'),/לבנות את האימון ולשלוח/);
});
