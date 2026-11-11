import test from "node:test";
import assert from "node:assert/strict";
import {approvedSessionChoices,matchingApprovedSessions} from "../lib/self-service-choices.js";

test("approved workout filters keep original session indexes and prescriptions",()=>{
  const first={name:"Upper",items:[{id:"row",he:"חתירה",equipment:"גומייה"}]};
  const second={name:"Lower",items:[{id:"squat",he:"סקוואט",region:"רגליים",equipment:"ללא ציוד"}]};
  const choices=approvedSessionChoices([first,{items:[]},second],{row:"גב",squat:"other"});
  assert.deepEqual(choices.map(choice=>choice.index),[0,2]);
  assert.deepEqual(matchingApprovedSessions(choices,"גב","גומייה").map(choice=>choice.session),[first]);
  assert.deepEqual(matchingApprovedSessions(choices,"רגליים","ללא ציוד").map(choice=>choice.session),[second]);
  assert.deepEqual(matchingApprovedSessions(choices,"רגליים","גומייה"),[]);
});
