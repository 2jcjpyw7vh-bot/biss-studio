import test from "node:test";
import assert from "node:assert/strict";
import {hashAdminPin,verifyPinHash} from "../lib/admin-pin.js";

test("admin PIN is salted and verifies without storing plaintext",async()=>{
 const first=await hashAdminPin("839274"),second=await hashAdminPin("839274");
 assert.notEqual(first,second);
 assert.equal(first.includes("839274"),false);
 assert.equal(await verifyPinHash("839274",first),true);
 assert.equal(await verifyPinHash("839275",first),false);
});

