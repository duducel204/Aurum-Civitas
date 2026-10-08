/** DEV-48/65: measured work reduction on the declared Itaipu fixture. */
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createState,step} from '../lib/aurum/simulation.ts';
import {roadDistances,uncachedRoadDistances,roadAccess} from '../lib/aurum/geography.ts';
import {visibleFeatures} from '../lib/aurum/map-renderer.ts';
import {canonical} from '../lib/aurum/rules.ts';
import type {MapData} from '../lib/aurum/geography.ts';
const f=JSON.parse(readFileSync('fixtures/itaipu-scenario.json','utf8'));
const map=JSON.parse(readFileSync('fixtures/itaipu-start-map.json','utf8')) as MapData;
const state=createState(f.rules,f.stores,f.carriers);
const start=roadAccess(f.stores.find((s:{kind:string})=>s.kind==='depot').pos,state,f.rules)!;
const iterations=100;
roadDistances(start,state.roads);
function measured(fn:()=>unknown) {const samples=[];for(let trial=0;trial<5;trial++) {const t=performance.now();for(let i=0;i<iterations;i++)fn();samples.push(performance.now()-t);}return samples.sort((a,b)=>a-b)[2];}
const uncachedMs=measured(()=>uncachedRoadDistances(start,state.roads));
const cachedMs=measured(()=>roadDistances(start,state.roads));
assert.deepEqual(roadDistances(start,state.roads),uncachedRoadDistances(start,state.roads));
const view={center:f.stores.find((s:{kind:string})=>s.kind==='depot').pos,width:900};
const visible=visibleFeatures(map,view,960,660);
assert(visible.length<map.features.length);
// Repeated reads/culling must not mutate canonical transition inputs.
const before=canonical(state);visibleFeatures(map,view,960,660);roadDistances(start,state.roads);assert.equal(canonical(state),before);
assert.equal(canonical(step(state,[],f.rules)),canonical(step(structuredClone(state),[],f.rules)));
const simulationStart=performance.now();let simulated=state;
for(let i=0;i<20;i++)simulated=step(simulated,[],f.rules);
const simulationMs=performance.now()-simulationStart;
const evidence={runtime:process.version,platform:process.platform,architecture:process.arch,fixture:'itaipu-scenario.json',
  cache:{iterations,trials:5,statistic:'median wall time',uncachedMs,cachedMs,speedup:uncachedMs/cachedMs,equivalent:true},
  culling:{before:map.features.length,after:visible.length,excluded:map.features.length-visible.length,viewport:{width:960,height:660},view},
  tickBudget:{sampleTicks:20,totalSimulationMs:simulationMs,meanSimulationMs:simulationMs/20,configuredTickMs:f.rules.tickMs,skippedEffects:0,
    routeTiming:'Separate cache section above',renderTiming:'Real browser last-frame profile in diagnostic download'},
  limits:'Synthetic repeated queries and culled feature count on this machine; no FPS or production-scale guarantee.'};
writeFileSync('evidence/task-benchmark.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
