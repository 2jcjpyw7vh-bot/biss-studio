import test from "node:test";
import assert from "node:assert/strict";
import {arboxConfiguration,checkArboxConnection,readArboxSchedule} from "../lib/arbox-config.js";

test("Arbox integration stays disabled without official credentials",()=>assert.equal(arboxConfiguration({}).configured,false));
test("Arbox integration rejects URLs other than the official V3 endpoint",()=>{
 assert.equal(arboxConfiguration({ARBOX_API_V3_BASE_URL:"http://api.arboxapp.com",ARBOX_API_KEY:"x"}).configured,false);
 assert.equal(arboxConfiguration({ARBOX_API_V3_BASE_URL:"https://arbox.example.com",ARBOX_API_KEY:"x"}).configured,false);
 assert.equal(arboxConfiguration({ARBOX_API_V3_BASE_URL:"https://other.arboxapp.com/api/public/v3",ARBOX_API_KEY:"x"}).configured,false);
});
test("Arbox integration uses the official endpoint by default without exposing the key",()=>{
 const result=arboxConfiguration({ARBOX_API_KEY:"secret"});
 assert.equal(result.configured,true);assert.equal(result.host,"arboxserver.arboxapp.com");assert.equal(JSON.stringify(result).includes("secret"),false);
});

test("Arbox connection checks only locations and schedule and returns status only",async()=>{
 const calls=[];
 const request=async(url,options)=>{
  calls.push({url,options});
  return new Response("private response",{status:url.includes("/locations")?200:403});
 };
 const result=await checkArboxConnection({ARBOX_API_KEY:"test-only"},request,new Date("2026-11-10T23:00:00Z"));
 assert.deepEqual(result,{locations:{ok:true,status:200},schedule:{ok:false,status:403}});
 assert.deepEqual(calls.map(({url})=>url),[
  "https://arboxserver.arboxapp.com/api/public/v3/locations?limit=1",
  "https://arboxserver.arboxapp.com/api/public/v3/schedule?from_date=2026-11-11&to_date=2026-11-12&limit=1",
 ]);
 assert.ok(calls.every(({options})=>options.headers["api-key"]==="test-only"&&options.redirect==="error"));
});

test("Arbox connection skips requests without configuration and reports network errors",async()=>{
 const unavailable=async()=>{throw new Error("private error");};
 assert.equal(await checkArboxConnection({},unavailable),null);
 const result=await checkArboxConnection({ARBOX_API_KEY:"test-only"},unavailable);
 assert.deepEqual(result,{locations:{ok:false,status:null},schedule:{ok:false,status:null}});
});

test("Arbox weekly preview requests aggregate registrations and excludes personal data",async()=>{
 const now=new Date("2026-11-10T23:00:00Z");
 const result=await readArboxSchedule({ARBOX_API_KEY:"test-only"},async(url,options)=>{
  const request=new URL(url);
  assert.equal(request.href,"https://arboxserver.arboxapp.com/api/public/v3/schedule?from_date=2026-11-11&to_date=2026-11-17&limit=20&sort=asc&registration_count=1&registration_details=0");
  assert.equal(options.redirect,"error");
  return Response.json({data:[
   {date:"2026-11-12",start_time:"18:00:00",end_time:"18:50",schedule_id:123,session_name:"Barre",location_name:"Studio",max_participants:"7",registration_count:"0",cancelled_status:"1",staff_member:"private",registration_details:[{name:"private"}]},
   {date:"2026-11-11",start_time:"8:00",schedule_id:"invalid,id",session_name:"Pilates"},
   {date:"2026-11-10",start_time:"08:00",session_name:"Outside range"},
   {date:"2026-11-11",start_time:"27:00",session_name:"Invalid time"},
  ]});
 },now);
 assert.deepEqual(result,{
  from:"2026-11-11",to:"2026-11-17",limited:false,skipped:2,
  lessons:[
   {scheduleId:"",date:"2026-11-11",start:"08:00",end:"",name:"Pilates",location:"",capacity:null,registrations:null,cancelled:false},
   {scheduleId:"123",date:"2026-11-12",start:"18:00",end:"18:50",name:"Barre",location:"Studio",capacity:7,registrations:0,cancelled:true},
  ]
 });
});

test("Arbox weekly preview distinguishes missing credentials, a rejected request and an empty week",async()=>{
 const env={ARBOX_API_KEY:"test-only"};
 assert.deepEqual(await readArboxSchedule({},()=>assert.fail("unconfigured request")),{error:"not_configured"});
 assert.deepEqual(await readArboxSchedule(env,async()=>new Response(null,{status:403})),{error:"access_denied"});
 assert.deepEqual(await readArboxSchedule(env,async()=>Response.json({unexpected:[]})),{error:"unexpected_response"});
 assert.deepEqual((await readArboxSchedule(env,async()=>new Response(null,{status:204}))).lessons,[]);
});
