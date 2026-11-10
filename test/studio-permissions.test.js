import test from "node:test";
import assert from "node:assert/strict";
import {canAccessInstructorArea,canViewAdaptations} from "../lib/studio-permissions.js";

test("trainees cannot enter the instructor schedule",()=>assert.equal(canAccessInstructorArea({role:"trainee",status:"active"}),false));
test("inactive instructors cannot enter the instructor schedule",()=>assert.equal(canAccessInstructorArea({role:"instructor",status:"inactive"}),false));
test("health adaptations require explicit instructor permission",()=>{
 assert.equal(canViewAdaptations({role:"instructor",status:"active",can_view_health:false}),false);
 assert.equal(canViewAdaptations({role:"instructor",status:"active",can_view_health:true}),true);
 assert.equal(canViewAdaptations({role:"manager",status:"active",can_view_health:true}),true);
});

