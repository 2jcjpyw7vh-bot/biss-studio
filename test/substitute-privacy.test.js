import test from "node:test";
import assert from "node:assert/strict";
import {publicSubstituteOffer} from "../lib/substitute-privacy.js";

const privateData={
  id:"offer-1",status:"pending",message:"הודעת שיבוץ",expires_at:"2026-11-12T10:00:00Z",show_workout:false,
  instructor_id:"private-instructor-id",biss_users:{full_name:"שם פרטי"},
  biss_sessions:{id:"session-1",title:"Functional HIIT",starts_at:"2026-11-12T08:00:00Z",group_id:"group-1",workout_summary:"תוכן האימון",playlist_url:"https://example.com/private",biss_groups:{name:"קבוצת בוקר"},trainee_names:["אסור לחשוף"]},
  internal_note:"אסור לחשוף",
};

test("private substitute link omits workout and all internal fields",()=>{
  const result=publicSubstituteOffer(privateData);
  assert.equal(result.biss_sessions.workout_summary,"");
  assert.equal(result.biss_sessions.playlist_url,"");
  assert.equal("biss_users" in result,false);
  assert.equal("instructor_id" in result,false);
  assert.equal("internal_note" in result,false);
  assert.equal("trainee_names" in result.biss_sessions,false);
});

test("manager can expose only the safe workout fields",()=>{
  const result=publicSubstituteOffer({...privateData,show_workout:true});
  assert.equal(result.biss_sessions.workout_summary,"תוכן האימון");
  assert.equal(result.biss_sessions.playlist_url,"https://example.com/private");
  assert.deepEqual(Object.keys(result.biss_sessions).sort(),["biss_groups","group_id","id","playlist_url","starts_at","title","workout_summary"]);
});

