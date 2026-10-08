import test from 'node:test';
import assert from 'node:assert/strict';
import {roadDistances,uncachedRoadDistances} from '../../lib/aurum/geography.ts';
test('DEV-48: cache is equivalent, invalidates mutations and refuses caller poisoning',()=>{
  const roads:Record<string,boolean>={'0,0':true,'1,0':true,'2,0':true};
  assert.deepEqual(roadDistances('0,0',roads),uncachedRoadDistances('0,0',roads));
  roadDistances('0,0',roads).set('evil',1);
  assert.equal(roadDistances('0,0',roads).has('evil'),false);
  roads['1,0']=false;
  assert.deepEqual(roadDistances('0,0',roads),uncachedRoadDistances('0,0',roads));
  assert.equal(roadDistances('0,0',roads).has('2,0'),false);
  roads['1,0']=true;delete roads['2,0'];
  assert.deepEqual(roadDistances('0,0',roads),uncachedRoadDistances('0,0',roads));
});
