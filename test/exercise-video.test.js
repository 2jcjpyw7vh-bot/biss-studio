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

test("specialty demonstrations preserve TRX and Pilates rather than matching only a generic movement",()=>{
  const generic={id:{videoId:"abcdefghijk"},snippet:{title:"How to Chest Press"}};
  const trx={id:{videoId:"lmnopqrstuv"},snippet:{title:"How to TRX Chest Press"}};
  assert.equal(selectExerciseVideo([generic],"TRX Chest Press"),null);
  assert.equal(selectExerciseVideo([generic,trx],"TRX Chest Press"),trx);
  assert.equal(selectExerciseVideo([{id:{videoId:"abcdefghijk"},snippet:{title:"Heel Slide Tutorial"}}],"Supine Pilates Heel Slide"),null);
});
