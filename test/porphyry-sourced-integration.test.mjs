import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptPorphyryToPinnedComparison} from '../src/porphyry-sourced-side.mjs';
import {compareHousePlacementsWithPinnedSource} from '../src/house-source-consistency.mjs';

const datetimeUtc='2026-11-12T22:15:00Z';
const source={datetimeUtc,frame:'ECLIPTIC_OF_DATE',longitudeBasis:{type:'TROPICAL'},
  observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'RUST_TEST',kernelSetId:'SYNTHETIC',timeModel:'TEST_UTC',
  corrections:'APPARENT',calculationProfileId:'CANONICAL_V1'};
const produced={contract:'PorphyryHouseCusps',contractVersion:'0.1.0-experimental',
  houseSystem:'PORPHYRY',datetimeUtc,
  angles:{ascendantDeg:10,icDeg:105,descendantDeg:190,midheavenDeg:285},
  cuspsDeg:[10,41.666666666666664,73.33333333333333,105,
    133.33333333333334,161.66666666666666,190,221.66666666666666,
    253.33333333333331,285,313.3333333333333,341.6666666666667],
  source:{engineVersion:'RUST_TEST',kernelSetId:'SYNTHETIC',timeModel:'TEST_UTC',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:44,longitudeDegEast:11}},
  interpretation:'FACTS_ONLY',quadrantSpansDeg:[95,85,95,85],
  validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'};
const whole={houseSystem:'WHOLE_SIGN',datetimeUtc,frame:'ECLIPTIC_OF_DATE',
  longitudeBasis:{type:'TROPICAL'},birthTimeKnown:true,
  cuspsDeg:Array.from({length:12},(_,i)=>i*30),
  provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'};
const right=adaptPorphyryToPinnedComparison({birthTimeKnown:true,produced,declaredSource:source});
const left={snapshot:whole,source};
const run=(extra={})=>compareHousePlacementsWithPinnedSource({birthTimeKnown:true,left,right,
  points:[{id:'P0',longitudeDeg:0},{id:'P35',longitudeDeg:35},{id:'P42',longitudeDeg:42}],...extra});

test('real #43 + #48 modules accept adapted Porphyry snapshot',()=>{
  const r=run();
  assert.equal(r.contract,'PinnedHouseMethodComparison');
  assert.equal(r.status,'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED');
  assert.deepEqual(r.comparison.facts.map(f=>[f.id,f.leftHouse,f.rightHouse,f.changed]),[
    ['P0',1,12,true],['P35',2,1,true],['P42',2,2,false],
  ]);
  assert.equal(r.comparison.changedCount,2);
});

test('real #48 comparator rejects a mismatched independent comparison source',()=>{
  const leftBad={snapshot:whole,source:{...source,kernelSetId:'ANOTHER_KERNEL'}};
  assert.throws(()=>run({left:leftBad}), e=>e.name==='AstrologyError'&&e.code==='INCOMPATIBLE_SOURCE_CONTEXT');
});

test('real comparator rejects malformed points even after successful adaptation',()=>{
  assert.throws(()=>run({points:[{id:'P0',longitudeDeg:1},{id:'P0',longitudeDeg:2}]}),
    e=>e.name==='AstrologyError'&&e.code==='INVALID_POINTS');
});
