import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { normalize360 } from 'astrological-functions';
import {
  buildSourcedHousePlacementMatrix as publicMatrix,
} from 'astrological-functions/sourced-house-placement-matrix';
import { buildSourcedHousePlacementMatrix as internalMatrix } from
  '../src/sourced-house-placement-matrix.mjs';

const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const require=createRequire(import.meta.url);
const dt='2026-11-13T16:00:00Z';
const basis={type:'TROPICAL'};
const source={
  datetimeUtc:dt,frame:'ECLIPTIC_OF_DATE',longitudeBasis:basis,
  observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC_TEST_ENGINE',kernelSetId:'SYNTHETIC_TEST_KERNEL',
  timeModel:'SYNTHETIC_TEST_TIME',corrections:'APPARENT',
  calculationProfileId:'SYNTHETIC_TEST_PROFILE',
};
const common={
  datetimeUtc:dt,frame:'ECLIPTIC_OF_DATE',longitudeBasis:basis,
  provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
};
const whole={snapshot:{...common,houseSystem:'WHOLE_SIGN',
  cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300]},source};
const equal={snapshot:{...common,houseSystem:'EQUAL_ASCENDANT',
  cuspsDeg:[345,15,45,75,105,135,165,195,225,255,285,315]},source};
const porphyry={snapshot:{...common,houseSystem:'PORPHYRY',
  provenanceStatus:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  cuspsDeg:[10,41.66666666666667,73.33333333333334,105,
    133.33333333333334,161.66666666666666,190,221.66666666666666,
    253.33333333333334,285,313.3333333333333,341.6666666666667]},source};
const positions={
  source,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  points:[{id:'SUN',longitudeDeg:0},{id:'MOON',longitudeDeg:345}],
};
const input=(methods=[whole,equal])=>({birthTimeKnown:true,methods,positions});
const hasCode=code=>error=>error?.name==='AstrologyError'&&error.code===code;

test('private package export map exposes one explicit ESM-only matrix subpath',()=>{
  assert.equal(manifest.private,true);
  assert.equal(manifest.type,'module');
  assert.equal(manifest.exports['.'],'./src/index.mjs');
  assert.deepEqual(manifest.exports['./sourced-house-placement-matrix'],{
    types:'./src/sourced-house-placement-matrix.d.mts',
    import:'./src/sourced-house-placement-matrix.mjs',
  });
  assert.equal(Object.hasOwn(manifest.exports['./sourced-house-placement-matrix'],'require'),false);
  assert.equal(Object.hasOwn(manifest.exports['./sourced-house-placement-matrix'],'default'),false);
});

test('self-referenced ESM import is the actual unchanged internal matrix function',()=>{
  assert.strictEqual(publicMatrix,internalMatrix);
  assert.equal(normalize360(360),0);
});

test('two-method package consumer preserves facts, occupancy and provenance warning',()=>{
  const result=publicMatrix(input());
  assert.deepEqual(result.methodNames,['WHOLE_SIGN','EQUAL_ASCENDANT']);
  assert.deepEqual(result.rows.map(x=>[x.id,...x.placements.map(p=>p.house)]),
    [['SUN',2,1],['MOON',1,1]]);
  assert.deepEqual(result.changedPointIds,['SUN']);
  assert.deepEqual(result.occupancyByMethod[0].houses[0].pointIds,['MOON']);
  assert.deepEqual(result.occupancyByMethod[0].houses[1].pointIds,['SUN']);
  assert.deepEqual(result.occupancyByMethod[1].houses[0].pointIds,['SUN','MOON']);
  assert.equal(result.status,
    'MATCHING_CALLER_ASSERTED_SOURCES_NOT_INDEPENDENTLY_VERIFIED');
  assert.ok(Object.isFrozen(result.occupancyByMethod[0].houses[0].pointIds));
  assert.doesNotThrow(()=>JSON.stringify(result));
});

test('three-method package consumer remains bounded and ordered',()=>{
  const result=publicMatrix(input([porphyry,whole,equal]));
  assert.deepEqual(result.methodNames,['PORPHYRY','WHOLE_SIGN','EQUAL_ASCENDANT']);
  assert.deepEqual(result.occupancyByMethod.map(x=>x.houseSystem),result.methodNames);
  assert.equal(result.pairwiseChanges.length,3);
  assert.ok(result.occupancyByMethod.every(method=>method.houses.length===12));
  assert.ok(result.occupancyByMethod.every(method=>
    method.houses.reduce((sum,house)=>sum+house.count,0)===result.pointCount));
});

test('public package API fails closed for unknown birth times and forged sources',()=>{
  assert.throws(()=>publicMatrix({...input(),birthTimeKnown:false}),
    hasCode('BIRTH_TIME_UNKNOWN'));
  assert.throws(()=>publicMatrix(input([whole,{
    ...equal,source:{...source,kernelSetId:'UNRELATED_KERNEL'},
  }])),hasCode('INCOMPATIBLE_SOURCE_CONTEXT'));
  assert.throws(()=>publicMatrix({...input(),positions:{
    ...positions,source:{...source,observer:{latitudeDeg:45,longitudeDegEast:11}},
  }}),hasCode('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
});

test('CommonJS cannot resolve a fallback for the ESM-only matrix subpath',()=>{
  assert.throws(()=>require.resolve('astrological-functions/sourced-house-placement-matrix'),
    error=>error?.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
});

test('unpublished internal source paths are not exported as package subpaths',()=>{
  assert.throws(()=>require.resolve('astrological-functions/src/sourced-house-placement-matrix.mjs'),
    error=>error?.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
});
