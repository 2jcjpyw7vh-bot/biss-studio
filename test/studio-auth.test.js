import test from "node:test";
import assert from "node:assert/strict";
import {studioProfileFromRequest} from "../lib/studio-auth.js";

const request={headers:{get:name=>name==="authorization"?"Bearer verified-token":""}};

function fakeDb(profile){
 let activated=false;
 return{
  auth:{getUser:async()=>({data:{user:{id:"auth-user",email:"manager@example.com"}},error:null})},
  from:()=>{
   let operation="select";
   return{
    select(){return this},
    update(values){operation="update";activated=values.status==="active";return this},
    eq(){return this},
    is(){return this},
    async maybeSingle(){
     if(operation==="update")return{data:activated?{...profile,status:"active"}:null,error:null};
     return{data:profile,error:null};
    }
   };
  },
  wasActivated:()=>activated
 };
}

test("verified invited Studio user becomes active on first login",async()=>{
 const db=fakeDb({id:"profile-1",full_name:"Invited manager",email:"manager@example.com",role:"manager",status:"invited",can_view_health:true,auth_user_id:"auth-user"});
 const result=await studioProfileFromRequest(request,db);
 assert.equal(db.wasActivated(),true);
 assert.equal(result.profile.status,"active");
 assert.equal(result.status,200);
});

test("inactive Studio user remains blocked",async()=>{
 const db=fakeDb({id:"profile-2",full_name:"Inactive manager",email:"manager@example.com",role:"manager",status:"inactive",can_view_health:true,auth_user_id:"auth-user"});
 const result=await studioProfileFromRequest(request,db);
 assert.equal(db.wasActivated(),false);
 assert.equal(result.status,403);
});
