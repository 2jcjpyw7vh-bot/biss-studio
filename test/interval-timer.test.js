import test from "node:test";
import assert from "node:assert/strict";
import {intervalTimerPosition} from "../lib/interval-timer.js";

test("interval timer follows elapsed time and skips rest after the final set",()=>{
  const plan={work:40,rest:20,sets:3};
  assert.deepEqual(intervalTimerPosition(plan,39999),{phase:"work",set:1,seconds:1,phaseAge:39999});
  assert.deepEqual(intervalTimerPosition(plan,40000),{phase:"rest",set:1,seconds:20,phaseAge:0});
  assert.deepEqual(intervalTimerPosition(plan,121100),{phase:"work",set:3,seconds:39,phaseAge:1100});
  assert.deepEqual(intervalTimerPosition(plan,160000),{phase:"done",set:3,seconds:0,phaseAge:0});
});

test("zero rest starts the next set immediately",()=>{
  assert.deepEqual(intervalTimerPosition({work:10,rest:0,sets:2},10000),{phase:"work",set:2,seconds:10,phaseAge:0});
});
