import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boundedView,minimapPoint} from '../../lib/aurum/camera.ts';
import {visibleFeatures} from '../../lib/aurum/map-renderer.ts';
import type {MapData} from '../../lib/aurum/geography.ts';
test('DEV-14/15/19/65: bounded camera, minimap positions and feature culling',()=>{
  assert.deepEqual(boundedView({center:{x:-10,y:900},width:100},500,500),{center:{x:0,y:500},width:240});
  assert.deepEqual(minimapPoint(120,75,240,150,500,500),{x:250,y:250});
  const map=JSON.parse(readFileSync(new URL('../../fixtures/itaipu-start-map.json',import.meta.url),'utf8')) as MapData;
  const narrow=visibleFeatures(map,{center:{x:1000,y:1000},width:900},960,660);
  const wide=visibleFeatures(map,{center:{x:map.metadata.widthM/2,y:map.metadata.heightM/2},width:map.metadata.widthM*2},960,660);
  assert(narrow.length<map.features.length);assert(wide.length>=narrow.length);
});
