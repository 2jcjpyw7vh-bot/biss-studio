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
