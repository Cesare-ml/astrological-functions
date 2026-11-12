import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSynastryFacts } from '../src/synastry-facts.mjs';

const provenance = Object.freeze({engineVersion:'synthetic-v1',kernelSetId:'test-only',timeModel:'test-UTC'});
const natal = (datetimeUtc, bodies) => Object.freeze({
  contract:'NatalChartResult',contractVersion:'0.1.0-experimental',
  datetimeUtc,latitudeDeg:44.8,longitudeDegEast:11.9,
  ephemerisProvenance:provenance,bodies,
});
const chartA = natal('2026-01-01T12:00:00Z',{
  Mars:{name:'Mars',longitudeDeg:359},
});
const chartB = natal('2026-02-01T12:00:00Z',{
  Sun:{name:'Sun',longitudeDeg:2},
  Moon:{name:'Moon',longitudeDeg:179},
});
const cuspSet = (chart, cusps) => ({
  houseSystem:'VEHLOW',calculationProfile:'CANONICAL_V1',cusps,
  metadata:{houseSystem:'VEHLOW',placementMethod:'CUSP_INTERVAL',
    datetimeUtc:chart.datetimeUtc,latitudeDeg:chart.latitudeDeg,
    longitudeDegEast:chart.longitudeDegEast,ephemerisProvenance:provenance},
});
const input = {
  chartA,chartB,birthTimeKnownA:true,birthTimeKnownB:true,
  cuspSetA:cuspSet(chartA,[0,30,60,90,120,150,180,210,240,270,300,330]),
  cuspSetB:cuspSet(chartB,[345,15,45,75,105,135,165,195,225,255,285,315]),
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3},
    {id:'opposition',angleDeg:180,maxOrbDeg:1}],
};

test('composed results retain both directional aspect owners and house contexts',()=>{
  const result=calculateSynastryFacts(input);
  assert.equal(result.contract,'SynastryFactsResult');
  assert.equal(result.houseMode,'FULL_HOUSES');
  assert.equal(result.aToB.direction,'A_TO_B');
  assert.equal(result.bToA.direction,'B_TO_A');
  assert.deepEqual(result.aToB.aspects.map(a=>a.aspectId),['conjunction','opposition']);
  assert.deepEqual(result.aToB.aspects.map(a=>a.source.name),['Mars','Mars']);
  assert.deepEqual(result.bToA.aspects.map(a=>a.source.name),['Sun','Moon']);
  assert.deepEqual(result.aToB.houseOverlays.placements.map(p=>p.house),[1]);
  assert.deepEqual(result.bToA.houseOverlays.placements.map(p=>p.house),[1,6]);
  assert.equal(result.aToB.houseOverlays.targetDatetimeUtc,chartB.datetimeUtc);
  assert.equal(result.bToA.houseOverlays.targetDatetimeUtc,chartA.datetimeUtc);
});

test('wrap-around conjunction is accepted at exact 3 degree orb boundary',()=>{
  const result=calculateSynastryFacts(input);
  assert.equal(result.aToB.aspects[0].actualAngleDeg,3);
  assert.equal(result.aToB.aspects[0].absoluteOrbDeg,3);
  assert.equal(result.aToB.aspects[1].actualAngleDeg,180);
});

test('returns immutable results and detached rule snapshots',()=>{
  const rules=[{id:'conjunction',angleDeg:0,maxOrbDeg:3}];
  const result=calculateSynastryFacts({...input,aspectDefinitions:rules});
  for (const value of [result,result.aToB,result.bToA,result.aspectDefinitions,
    result.aspectDefinitions[0],result.aToB.aspects,result.bToA.aspects]) {
    assert.equal(Object.isFrozen(value),true);
  }
  rules[0].maxOrbDeg=180;
  assert.equal(result.aspectDefinitions[0].maxOrbDeg,3);
});

test('empty configured aspect set gives explicit zero aspects but retains houses',()=>{
  const result=calculateSynastryFacts({...input,aspectDefinitions:[]});
  assert.equal(result.aToB.aspects.length,0);
  assert.equal(result.bToA.aspects.length,0);
  assert.equal(result.aToB.houseOverlays.placements.length,1);
});

test('missing birth time fails closed, no invented house result',()=>{
  for(const changes of [{birthTimeKnownA:false},{birthTimeKnownB:false},
    {birthTimeKnownA:undefined}]) {
    assert.throws(()=>calculateSynastryFacts({...input,...changes}),
      e=>e.code==='BIRTH_TIME_REQUIRED');
  }
});

test('cusp contexts mismatch and legacy houses_pos never silently fall back',()=>{
  assert.throws(()=>calculateSynastryFacts({...input,cuspSetA:{
    ...input.cuspSetA,metadata:{...input.cuspSetA.metadata,datetimeUtc:chartB.datetimeUtc},
  }}),e=>e.code==='INCOMPATIBLE_HOUSE_CONTEXT');
  assert.throws(()=>calculateSynastryFacts({...input,cuspSetB:{
    ...input.cuspSetB,metadata:{...input.cuspSetB.metadata,placementMethod:'LEGACY_HOUSES_POS'},
  }}),e=>e.code==='UNSUPPORTED_HOUSE_PLACEMENT');
});

test('invalid aspect definitions fail with typed errors, including duplicate IDs',()=>{
  assert.throws(()=>calculateSynastryFacts({...input,aspectDefinitions:undefined}),
    e=>e.code==='INVALID_ARGUMENT');
  assert.throws(()=>calculateSynastryFacts({...input,aspectDefinitions:[{
    id:'conjunction',angleDeg:0,maxOrbDeg:Infinity,
  }]}),e=>e.code==='INVALID_ASPECT');
  assert.throws(()=>calculateSynastryFacts({...input,aspectDefinitions:new Array(1)}),
    e=>e.code==='INVALID_ASPECT');
  assert.throws(()=>calculateSynastryFacts({...input,aspectDefinitions:[
    {id:'same',angleDeg:0,maxOrbDeg:1},{id:'same',angleDeg:90,maxOrbDeg:1},
  ]}),e=>e.code==='INVALID_ASPECT');
});

test('invalid chart body and top-level input are rejected',()=>{
  assert.throws(()=>calculateSynastryFacts(null),e=>e.code==='INVALID_ARGUMENT');
  assert.throws(()=>calculateSynastryFacts({...input,chartA:{
    ...chartA,bodies:{Mars:{name:'Mars',longitudeDeg:Infinity}},
  }}),e=>e.code==='INVALID_POINT');
});
