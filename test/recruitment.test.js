import test from "node:test";
import assert from "node:assert/strict";
import {recruitmentPay,recruitmentPublic,shekelsToAgorot} from "../lib/recruitment.js";

const slots=[
  {id:"one",visit:"1",pay:12000},
  {id:"two",visit:"1",pay:18000},
  {id:"three",visit:"2",pay:15000}
];

test("travel uses the number of approved or selected workouts in each visit",()=>{
  assert.deepEqual(recruitmentPay(slots,["one","two","three"],3000,5000),{workouts:45000,travel:8000,total:53000,visits:2});
  assert.deepEqual(recruitmentPay(slots,["one","three"],3000,5000),{workouts:27000,travel:6000,total:33000,visits:2});
  assert.deepEqual(recruitmentPay(slots,["one","one"],3000,5000),{workouts:12000,travel:3000,total:15000,visits:1});
  assert.equal(shekelsToAgorot("120.05"),12005);
  assert.equal(shekelsToAgorot(""),null);
  assert.equal(shekelsToAgorot("-2"),null);
});

test("public view omits original instructor details and hides a changed time or assignment",()=>{
  const now=new Date("2026-11-11T10:00:00Z");
  const startsAt="2026-11-12T10:00:00Z";
  const slot={...slots[0],startsAt,title:"Functional Training",originalInstructorId:"private-id",originalInstructorName:"private-name",workout:[],playlist:""};
  const post={terms:{title:"Open training",slots:[slot]}};
  const session={id:"one",status:"planned",starts_at:startsAt,instructor_id:"private-id",instructor_name:"private-name"};
  assert.equal(recruitmentPublic(post,[session],now).slots.length,1);
  assert.doesNotMatch(JSON.stringify(recruitmentPublic(post,[session],now)),/private-/);
  assert.equal(recruitmentPublic(post,[{...session,instructor_id:"new-id"}],now).slots.length,0);
  assert.equal(recruitmentPublic(post,[{...session,starts_at:"2026-11-13T10:00:00Z"}],now).slots.length,0);
});
