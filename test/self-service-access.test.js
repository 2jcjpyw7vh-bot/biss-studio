import test from "node:test";
import assert from "node:assert/strict";
import {nextSessionIndex,selfServiceAccess} from "../lib/self-service-access.js";

const trainee={role:"trainee",status:"active"};
test("unregistered or inactive people are denied self-service access",()=>{
 assert.equal(selfServiceAccess(null,null).mode,"denied");
 assert.equal(selfServiceAccess({role:"trainee",status:"inactive"},null).mode,"denied");
});
test("trainee without an approved program receives mat-only access",()=>assert.deepEqual(selfServiceAccess(trainee,null),{mode:"mat_only",equipment:false}));
test("equipment requires an active trainer-approved program",()=>{
 const approved={status:"active",approved_at:"2026-11-10T08:00:00Z",coach_id:"coach",equipment_access:true,starts_on:"2026-11-01",ends_on:"2026-12-01"};
 assert.equal(selfServiceAccess(trainee,approved,new Date("2026-11-10T10:00:00Z")).equipment,true);
 assert.equal(selfServiceAccess(trainee,{...approved,coach_id:null},new Date("2026-11-10T10:00:00Z")).equipment,false);
 assert.equal(selfServiceAccess(trainee,{...approved,ends_on:"2026-11-09"},new Date("2026-11-10T10:00:00Z")).equipment,false);
});
test("next workout is the first session not completed and restarts after the cycle",()=>{
 assert.equal(nextSessionIndex(4,[0,2]),1);
 assert.equal(nextSessionIndex(3,[0,1,2]),0);
 assert.equal(nextSessionIndex(0,[]),0);
});

