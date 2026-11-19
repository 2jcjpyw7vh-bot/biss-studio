import test from "node:test";
import assert from "node:assert/strict";
import {selectExerciseVideo} from "../lib/exercise-video.js";

test("a generic tutorial cannot replace the requested exercise",()=>{
  const pallof={id:{videoId:"5aZ0IhJS8O8"},snippet:{title:"How to do a Pallof Press (Core Exercise)"}};
  const triceps={id:{videoId:"abcdefghijk"},snippet:{title:"Standing Band Triceps Press"}};
  assert.equal(selectExerciseVideo([pallof],"Waist Anchor Triceps Press"),null);
  assert.equal(selectExerciseVideo([pallof,triceps],"Waist Anchor Triceps Press"),triceps);
  assert.equal(selectExerciseVideo([],"TRX Low Row"),null);
});
