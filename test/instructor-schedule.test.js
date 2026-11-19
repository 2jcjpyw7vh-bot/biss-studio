import test from "node:test";
import assert from "node:assert/strict";
import {readArboxSchedule,readArboxStaff} from "../lib/arbox-config.js";
import {personalLessonFrame,upcomingArboxLessons} from "../lib/instructor-schedule.js";
test("personal calendar uses the assigned server-side staff ID and excludes registrations",async()=>{
  const result=await readArboxSchedule({ARBOX_API_KEY:"test"},async url=>{
    const q=new URL(url).searchParams;
    assert.equal(q.get("staff_id"),"123");assert.equal(q.get("limit"),"500");assert.equal(q.get("registration_details"),"0");assert.equal(q.get("to_date"),"2026-12-16");
    return Response.json({data:[{schedule_id:"a",date:"2026-11-22",start_time:"09:00",staff_member:{name:"Coach",user_id:123,email:"must not escape",phone:"must not escape"},second_staff_member:"Assistant",registration_details:[{name:"must not escape"}]}]});
  },new Date("2026-11-19T10:00:00Z"),{staffId:"123",days:28});
  assert.equal(result.lessons[0].instructorName,"Coach");assert.equal(result.lessons[0].secondInstructorName,"Assistant");assert.equal(JSON.stringify(result).includes("must not escape"),false);
  assert.deepEqual(await readArboxSchedule({ARBOX_API_KEY:"test"},()=>assert.fail("invalid staff must not query"),new Date(),{staffId:"123&other=1"}),{error:"invalid_staff"});
});
test("staff list exposes only identity needed for explicit mapping",async()=>{
  const result=await readArboxStaff({ARBOX_API_KEY:"test"},async()=>Response.json({data:[{user_id:12,first_name:"Coach",last_name:"One",birthday:"private",email:"private",phone:"private"}]}));
  assert.deepEqual(result,{staff:[{id:"12",name:"Coach One"}],limited:false});
});
test("lesson frame preserves timing and capacity and rejects unsafe unsupported durations",()=>{
  const lesson={name:"Power",date:"2026-11-22",start:"09:00",end:"09:50",registrations:9,capacity:10};
  assert.deepEqual(personalLessonFrame(lesson),{type:"functional",duration:50,participants:9,limitations:[]});
  assert.equal(personalLessonFrame({...lesson,end:"09:10"}),null);
  assert.equal(personalLessonFrame({...lesson,name:"אימון בר"}),null);
  assert.equal(personalLessonFrame(lesson,"__proto__"),null);
  assert.equal(upcomingArboxLessons([lesson,{...lesson,cancelled:true}],Date.parse("2026-11-21T00:00:00Z")).length,1);
  assert.equal(upcomingArboxLessons([lesson],Date.parse("2026-11-23T00:00:00Z")).length,0);
});
