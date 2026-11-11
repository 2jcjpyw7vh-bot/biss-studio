import test from "node:test";
import assert from "node:assert/strict";
import {loadCurrentWorkout,nextSessionIndex,selfServiceAccess} from "../lib/self-service-access.js";

const trainee={role:"trainee",status:"active"};

test("direct workout links require the current approved assignment",async()=>{
 const profile={...trainee,id:"trainee-qa"};
 const program={id:"current",status:"active",approved_at:"2026-11-10T08:00:00Z",coach_id:"coach",equipment_access:true,program_payload:{sessions:[{name:"אימון"}]}};
 const now=new Date("2026-11-10T22:00:00Z");
 const db={from(table){
  assert.equal(table,"biss_programs");
  return {
   select(){return this},
   eq(field,value){assert.equal(value,{trainee_id:profile.id,status:"active"}[field]);return this},
   or(filter){assert.equal(filter,"starts_on.is.null,starts_on.lte.2026-11-11");return this},
   order(){return this},
   limit(value){assert.equal(value,1);return this},
   async maybeSingle(){return {data:program}}
  };
 }};
 assert.equal((await loadCurrentWorkout(db,profile,"old",0,now)).status,404);
 assert.equal((await loadCurrentWorkout(db,profile,"current",1,now)).status,404);
 assert.equal((await loadCurrentWorkout(db,profile,"current",0,now)).session.name,"אימון");
 program.equipment_access=false;
 assert.equal((await loadCurrentWorkout(db,profile,"current",0,now)).status,403);
});
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

test("approval dates include the full Israel calendar day in winter and summer",()=>{
 for(const [day,start,end] of [
  ["2026-11-11","2026-11-10T22:00:00Z","2026-11-11T22:00:00Z"],
  ["2026-07-11","2026-07-10T21:00:00Z","2026-07-11T21:00:00Z"]
 ]){
  const program={status:"active",approved_at:"2026-01-01T00:00:00Z",coach_id:"coach",equipment_access:true,starts_on:day,ends_on:day};
  assert.equal(selfServiceAccess(trainee,program,new Date(Date.parse(start)-1)).equipment,false);
  assert.equal(selfServiceAccess(trainee,program,new Date(start)).equipment,true);
  assert.equal(selfServiceAccess(trainee,program,new Date(Date.parse(end)-1)).equipment,true);
  assert.equal(selfServiceAccess(trainee,program,new Date(end)).equipment,false);
 }
});
