import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseFamily,programRegions,selectProgramExercises,programPrescription} from '../lib/program-selection.js';
const pool=[...['חזה','כתפיים','גב','ידיים'].flatMap((region,i)=>Array.from({length:5},(_,j)=>({id:`u${i}-${j}`,region,pattern:`u${i}`}))),...['רגליים','ישבן','ירך אחורית'].flatMap((region,i)=>Array.from({length:3},(_,j)=>({id:`l${i}-${j}`,region,pattern:`l${i}`}))),...Array.from({length:6},(_,i)=>({id:`c${i}`,region:'ליבה',pattern:'core'}))];
test('upper lower core receive fixed quotas despite an unequal pool',()=>{
 const result=selectProgramExercises({pool,regions:['פלג גוף עליון','פלג גוף תחתון','ליבה']});
 assert.equal(result.complete,true);assert.deepEqual(result.coverage.map(x=>x.selected),[2,2,2]);
});
test('missing lower body stays visible rather than silently becoming upper body',()=>{
 const result=selectProgramExercises({pool:pool.filter(x=>x.id.startsWith('u')),regions:['פלג גוף עליון','פלג גוף תחתון']});
 assert.equal(result.complete,false);assert.equal(result.items.length,3);assert.match(result.warnings.join(' '),/פלג גוף תחתון/);
});
test('deadlift variants cannot occupy two slots in one session',()=>{
 const variants=[{id:'a',en:'Romanian Deadlift',region:'רגליים'},{id:'b',en:'Band Deadlift',region:'ירך אחורית'}];
 assert.equal(exerciseFamily(variants[0]),exerciseFamily(variants[1]));
 assert.equal(selectProgramExercises({pool:variants,regions:['פלג גוף תחתון'],count:2}).items.length,1);
});
test('overlapping broad and specific selections do not gain duplicate quotas',()=>{
 assert.deepEqual(programRegions(['פלג גוף עליון','גב','ליבה','ליבה']),['פלג גוף עליון','ליבה']);
 assert.deepEqual(programRegions(['כל הגוף']),['פלג גוף עליון','פלג גוף תחתון','ליבה']);
});
test('alternative program prefers unused exercises when enough choices exist',()=>{
 const previous=selectProgramExercises({pool,random:()=>0.5}).items;
 const next=selectProgramExercises({pool,previous,random:()=>0.5}).items;
 assert.equal(next.some(x=>previous.some(y=>x.id===y.id)),false);
});
test('static planks use hold time and avoid counting two plank variants as distinct movements',()=>{
 assert.match(programPrescription({en:'TRX Suspended Plank',pattern:'Plank'}),/שנ׳ החזקה/);
 assert.doesNotMatch(programPrescription({en:'TRX Suspended Plank',pattern:'Plank'}),/חזרות/);
 assert.equal(exerciseFamily({en:'Side Plank'}),exerciseFamily({en:'Forearm Plank'}));
 assert.match(programPrescription({en:'Squat',eachSide:true}),/חזרות לכל צד/);
});
