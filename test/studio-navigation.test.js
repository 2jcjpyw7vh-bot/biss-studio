import test from "node:test";
import assert from "node:assert/strict";
import {personalArea,accountArea,workspaceSection,publicStudioPath} from "../lib/studio-navigation.js";

test("personal navigation preserves role boundaries and known workspace destinations",()=>{
  assert.equal(personalArea("manager"),"/my-sessions");
  assert.equal(personalArea("instructor"),"/my-sessions");
  assert.equal(personalArea("trainee"),"/my-visits");
  assert.equal(personalArea(undefined),"/login");
  for(const section of ["team","continuity","program","homework","equipment","integrations"]){assert.equal(workspaceSection(section),section);}
  assert.equal(workspaceSection("https://example.com"),"");
  assert.equal(workspaceSection("__proto__"),"");
  assert.equal(publicStudioPath("/train/id/0"),true);
  assert.equal(publicStudioPath("/my-sessions"),false);
});
test('a customer visit keeps personal navigation in customer context without altering staff role destinations',()=>{
 assert.equal(accountArea('manager','/my-visits'),'/my-visits');
 assert.equal(accountArea('instructor','/my-program'),'/my-visits');
 assert.equal(accountArea('manager','/my-sessions'),'/my-sessions');
 assert.equal(accountArea('operator','/operations'),'/operations');
 assert.equal(accountArea(undefined,'/my-visits'),'/login');
 assert.equal(personalArea('manager'),'/my-sessions');
});
