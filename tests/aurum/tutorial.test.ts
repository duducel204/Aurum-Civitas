import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.ts';
import {firstHouseTutorial} from '../../lib/aurum/tutorial.ts';
test('DEV-25: stages require observed house, physical delivery, construction and service',()=>{
  const f=fixture();assert(firstHouseTutorial(f.state,false).every(s=>!s.done));
  assert(firstHouseTutorial(f.state,true)[0].done);
  const state=structuredClone(f.state);
  state.stores.push({id:'site:home',pos:{x:1,y:1},kind:'site',inventory:{},incorporated:{},capacity:20,construction:'house',buildTicks:0,status:'awaiting_materials'});
  const stages=firstHouseTutorial(state,true);assert(stages[1].done);assert(!stages[2].done);assert(!stages[3].done);assert(!stages[4].done);
  state.events.push({semantic_id:'RM3',tick:1,kind:'delivered',target:'site:home'});
  assert(firstHouseTutorial(state,true)[2].done);
});
