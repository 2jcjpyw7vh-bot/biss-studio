import test from "node:test";
import assert from "node:assert/strict";
import {matchArboxSessions} from "../lib/arbox-session-matching.js";

const lesson=(scheduleId,name,start="01:00",extra={})=>({
  scheduleId,name,date:"2026-11-11",start,...extra
});
const midnight={title:"  BARRE  ערב ",starts_at:"2026-11-10T23:00:00Z"};

test("Arbox match compares Israel local time and distinguishes confirmed from possible matches",()=>{
  const linked=[
    {arbox_session_id:"10",starts_at:"2026-11-10T23:00:00Z"},
    {arbox_session_id:"11",starts_at:"2026-11-20T23:00:00Z"}
  ];
  const result=matchArboxSessions([
    lesson("10","שונה"),lesson("11","Barre"),lesson("12","Barre ערב"),lesson("13","Pilates"),
    lesson("14","Barre ערב","02:00"),lesson("","Barre ערב"),lesson("15","Barre ערב","01:00",{cancelled:true})
  ],[midnight],linked);
  assert.deepEqual(result.map(x=>x.match),["linked","linked_time_changed","possible","same_time","unmatched","missing_id","cancelled"]);
  assert.ok(result.every(x=>!("scheduleId" in x)));
});

test("duplicates on either side are ambiguous and a session already linked elsewhere is not a candidate",()=>{
  const arbox=[lesson("1","Barre ערב"),lesson("2","Barre ערב")];
  assert.deepEqual(matchArboxSessions(arbox,[midnight],[]).map(x=>x.match),["ambiguous","ambiguous"]);
  assert.equal(matchArboxSessions(arbox.slice(0,1),[midnight,{...midnight}],[])[0].match,"ambiguous");
  assert.equal(matchArboxSessions(arbox.slice(0,1),[{...midnight,arbox_session_id:"3"}],[])[0].match,"same_time");
});
