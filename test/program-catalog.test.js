import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectProgramExercises,exerciseFamily} from '../lib/program-selection.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/exercises.json',import.meta.url)));
test('real catalog produces balanced distinct strength drafts for full-body selections',()=>{
 const pool=catalog.filter(x=>x.goal==='חיזוק');
 for(let i=0;i<50;i++){
  const result=selectProgramExercises({pool});assert.equal(result.complete,true);
  assert.deepEqual(result.coverage.map(x=>x.selected),[2,2,2]);
  assert.equal(new Set(result.items.map(x=>exerciseFamily(x))).size,6);
 }
});
test('new sourced entries retain explanation links without claiming playable videos',()=>{
 const added=catalog.filter(x=>['studio-long-loop-squat','studio-long-loop-pull-apart','studio-long-loop-seated-row','studio-physio-hamstring-curl'].includes(x.id));
 assert.equal(added.length,4);
 for(const x of added){assert.match(x.demoUrl,/^https:\/\/(www.acefitness.org|eat-move-save.extension.illinois.edu)\//);assert.ok(x.cue&&x.regression&&x.progression&&x.safety);assert.equal(x.videoUrl,'');}
 assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
});
