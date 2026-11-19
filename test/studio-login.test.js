import test from "node:test";
import assert from "node:assert/strict";
import { loginDestination, loginTarget } from "../lib/studio-login.js";

test("Arbox resumes only for a manager and keeps the destination within Studio", () => {
  assert.equal(loginDestination(loginTarget("arbox"), "manager"), "/?tab=integrations");
  assert.equal(loginDestination(loginTarget("arbox"), "instructor"), "");
  assert.equal(loginDestination(loginTarget("https://example.com"), "manager"), "");
});

test("the instructor library accepts both instructor and manager roles", () => {
  assert.equal(loginDestination("my-sessions", "instructor"), "/my-sessions");
  assert.equal(loginDestination("my-sessions", "manager"), "/my-sessions");
  assert.equal(loginDestination("my-sessions", "trainee"), "");
});

test("login resumes the assigned task without allowing arbitrary redirects", () => {
  const id="5f89d119-1c11-4aaf-a6f1-db29f34ff92d";
  assert.equal(loginDestination(loginTarget(`build-task:${id}`),"instructor"),`/?buildTask=${id}`);
  assert.equal(loginDestination(`build-task:${id}`,"manager"),`/?buildTask=${id}`);
  assert.equal(loginDestination(`build-task:${id}`,"trainee"),"");
  assert.equal(loginTarget("build-task:https://example.com"),"");
  assert.equal(loginTarget(`build-task:${id}&tab=team`),"");
});
