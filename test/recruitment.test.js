import test from "node:test";
import assert from "node:assert/strict";
import {recruitmentAd,recruitmentApprovalError,recruitmentDocumentError,recruitmentPay,recruitmentPublic,recruitmentWorkoutFields,shekelsToAgorot} from "../lib/recruitment.js";

test("document policy enforces files, real expiry dates, Israel lesson date and manager review",()=>{
  const terms={documentPolicy:1,requireInsurance:true,requireCertificate:true,slots:[{id:"a",startsAt:"2026-11-22T23:30:00Z"}]};
  const app={professional_insurance:true,qualifications:"פילאטיס",insurance_mime:"application/pdf",certificate_mime:"image/png",insurance_valid_until:"2026-11-22",requested_ids:["a"]};
  assert.match(recruitmentApprovalError(app,terms),/אינו בתוקף/);
  app.insurance_valid_until="2026-11-23";
  assert.match(recruitmentApprovalError(app,terms),/בדיקת מסמכים/);
  app.documents_reviewed_at="2026-11-19T12:00:00Z";
  assert.equal(recruitmentApprovalError(app,terms),"");
  assert.match(recruitmentDocumentError({...app,insurance_valid_until:"2027-02-30"},terms),/תאריך/);
  assert.match(recruitmentDocumentError({...app,insurance_mime:null},terms),/מסמך ביטוח/);
  assert.match(recruitmentDocumentError({...app,certificate_mime:null},terms),/תעודת/);
});

test("ad includes pay, travel, recurrence and conditions without applicant or original instructor data",()=>{
  const ad=recruitmentAd({title:"פילאטיס",recurring:"ימי ראשון",slots:[{title:"פילאטיס",startsAt:"2026-11-22T07:15:00Z",pay:15000,originalInstructorName:"private"}],travelSingle:3000,travelMultiple:5000,address:"כתובת בדיקה",requireInsurance:true,requireCertificate:true},"https://biss-studio.vercel.app/recruit/demo");
  assert.ok(ad.indexOf("https://biss-studio.vercel.app/recruit/demo")<ad.indexOf("https://www.instagram.com/"));
  assert.match(ad,/ימי ראשון/);assert.match(ad,/150/);assert.match(ad,/ביטוח/);assert.match(ad,/תעודת/);assert.doesNotMatch(ad,/private/);
});

test("recruitment approval requires both a declaration and a qualification",()=>{
  assert.match(recruitmentApprovalError({professional_insurance:false,qualifications:"הדרכת כושר"}),/ביטוח/);
  assert.match(recruitmentApprovalError({professional_insurance:true,qualifications:"  "}),/הסמכה/);
  assert.match(recruitmentApprovalError({}),/ביטוח.*הסמכה/);
  assert.equal(recruitmentApprovalError({professional_insurance:true,qualifications:"הדרכת כושר"}),"");
});

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

test("publishing a workout carries rotation instructions only when explicitly enabled",()=>{
  const session={
    playlist_url:"https://example.com/playlist",
    workout_payload:{
      limitationNote:"internal-only",
      sections:[{start:0,title:"בלוק 1",detail:"פתיחה: א׳ ב־1, ב׳ ב־2, ג׳ ב־3."}],
      exercises:[{id:"demo",he:"סקוואט",prescription:"40 שנ׳",allocation:"תחנה 1 בבלוק · 3 מקומות"}]
    }
  };
  assert.deepEqual(recruitmentWorkoutFields(session,false),{workout:[],playlist:""});
  const published=recruitmentWorkoutFields(session,true);
  assert.match(published.workoutPlan.sections[0].detail,/פתיחה/);
  assert.match(published.workoutPlan.exercises[0].allocation,/תחנה 1/);
  assert.doesNotMatch(JSON.stringify(published),/internal-only/);
  assert.equal(published.playlist,session.playlist_url);
});
