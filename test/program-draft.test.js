import test from 'node:test';
import assert from 'node:assert/strict';
import {readProgramDraft,programReturnPath,programDraftKey} from '../lib/program-draft.js';
const context={owner:'coach-a',taskId:'task',revision:'v1',now:1000000000};
const record={...context,at:context.now,program:{sessions:[{items:[{id:'squat'}]}]}};
test('draft restore is scoped to owner task and cloud revision',()=>{
 const raw=JSON.stringify(record);assert.ok(readProgramDraft(raw,context));
 for(const changed of [{owner:'coach-b'},{taskId:'other'},{revision:'v2'},{owner:''}])assert.equal(readProgramDraft(raw,{...context,...changed}),null);
 assert.notEqual(programDraftKey('a','t'),programDraftKey('b','t'));
});
test('draft cache rejects stale malformed and oversized content',()=>{
 assert.equal(readProgramDraft('bad',context),null);
 assert.equal(readProgramDraft('a'.repeat(500001),context),null);
 assert.equal(readProgramDraft(JSON.stringify(record),{...context,now:context.now+8*86400000}),null);
});
test('program return only targets a local builder route',()=>{
 assert.equal(programReturnPath('https://evil.example',999),'/?tab=programResult#program-session-0');
 assert.match(programReturnPath('237ab55f-d5e4-43fe-a685-2e4672f912ff',2),/buildTask=237ab55f.*#program-session-2$/);
});
