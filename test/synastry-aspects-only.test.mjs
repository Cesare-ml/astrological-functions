import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSynastryAspectsOnly } from '../src/synastry-aspects-only.mjs';

const provenance = Object.freeze({engineVersion:'synthetic-v1',kernelSetId:'synthetic-only',timeModel:'UTC-test'});
const chart = (datetimeUtc, bodies) => ({
  contract:'NatalChartResult', contractVersion:'0.1.0-experimental',
  datetimeUtc,ephemerisProvenance:provenance,bodies,
});
const chartA = chart('2026-01-01T12:00:00Z',{
  Sun:{name:'Sun',longitudeDeg:359},
  Moon:{name:'Moon',longitudeDeg:222},
});
const chartB = chart('2026-02-01T12:00:00Z',{
  Mars:{name:'Mars',longitudeDeg:2},
  Venus:{name:'Venus',longitudeDeg:179},
});
const input = {
  chartA, chartB,
  birthTimeKnownA:false,positionBasisA:'REPRESENTATIVE_INSTANT',
  birthTimeKnownB:true,positionBasisB:'KNOWN_BIRTH_INSTANT',
  selectedBodyNamesA:['Sun'],selectedBodyNamesB:['Mars','Venus'],
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3},
    {id:'opposition',angleDeg:180,maxOrbDeg:1}],
};

test('unknown birth time returns provisional aspects and warns for A only',()=>{
  const result=calculateSynastryAspectsOnly(input);
  assert.equal(result.contract,'SynastryAspectsOnlyResult');
  assert.equal(result.houseMode,'UNAVAILABLE');
  assert.equal(result.angles,null);
  assert.equal(result.timeReliability,'PROVISIONAL');
  assert.deepEqual(result.warnings.map(w=>[w.chart,w.code]),[['A','UNKNOWN_BIRTH_TIME']]);
  assert.equal(result.timeBasis.A.positionBasis,'REPRESENTATIVE_INSTANT');
  assert.deepEqual(result.selectedBodyNames.A,['Sun']);
  assert.deepEqual(result.selectedBodyNames.B,['Mars','Venus']);
});

test('directions preserve source ownership with 0/360 conjunction and opposition',()=>{
  const result=calculateSynastryAspectsOnly(input);
  assert.deepEqual(result.aToB.aspects.map(a=>[a.source.name,a.target.name,a.aspectId,a.absoluteOrbDeg]),[
    ['Sun','Mars','conjunction',3],['Sun','Venus','opposition',0],
  ]);
  assert.deepEqual(result.bToA.aspects.map(a=>[a.source.name,a.target.name]),[
    ['Mars','Sun'],['Venus','Sun'],
  ]);
  assert.equal(result.aToB.houseOverlays,null);
  assert.equal(result.bToA.houseOverlays,null);
});

test('both unknown are explicitly provisional; both known have no unknown-time warning',()=>{
  const unknown=calculateSynastryAspectsOnly({...input,
    birthTimeKnownB:false,positionBasisB:'REPRESENTATIVE_INSTANT'});
  assert.deepEqual(unknown.warnings.map(w=>w.chart),['A','B']);
  const known=calculateSynastryAspectsOnly({...input,
    birthTimeKnownA:true,positionBasisA:'KNOWN_BIRTH_INSTANT'});
  assert.equal(known.warnings.length,0);
  assert.equal(known.timeReliability,'SUPPLIED_INSTANTS');
});

test('unresolved birth time and time basis mismatch fail closed',()=>{
  for(const change of [{birthTimeKnownA:undefined},{positionBasisA:undefined},
    {positionBasisA:'KNOWN_BIRTH_INSTANT'},
    {birthTimeKnownA:true}]) {
    assert.throws(()=>calculateSynastryAspectsOnly({...input,...change}),
      e=>e.code==='INVALID_TIME_BASIS');
  }
});

test('house contexts are never accepted or synthesized in aspects-only mode',()=>{
  for(const field of ['cuspSetA','cuspSetB']) {
    assert.throws(()=>calculateSynastryAspectsOnly({...input,[field]:null}),
      e=>e.code==='UNSUPPORTED_HOUSE_PLACEMENT');
  }
});

test('selected bodies are explicit, unique, dense and must exist in the chart',()=>{
  for(const selectedBodyNamesA of [[],undefined,['Sun','Sun'],['Moon','Jupiter'],
    ['__proto__'],new Array(1)]) {
    assert.throws(()=>calculateSynastryAspectsOnly({...input,selectedBodyNamesA}),
      e=>e.code==='INVALID_BODIES');
  }
  const selected=calculateSynastryAspectsOnly({...input,selectedBodyNamesA:['Moon']});
  assert.deepEqual(selected.selectedBodyNames.A,['Moon']);
  assert.equal(selected.aToB.aspects.length,0);
});

test('strict chart timestamps, provenance and body values are required',()=>{
  assert.throws(()=>calculateSynastryAspectsOnly({...input,chartA:{
    ...chartA,datetimeUtc:'2026-02-30T12:00:00Z'}}),
    e=>e.code==='INVALID_UTC');
  assert.throws(()=>calculateSynastryAspectsOnly({...input,chartA:{
    ...chartA,ephemerisProvenance:{engineVersion:'synthetic-v1',kernelSetId:'synthetic-only'}}}),
    e=>e.code==='INVALID_CHART_PROVENANCE');
  assert.throws(()=>calculateSynastryAspectsOnly({...input,chartA:{
    ...chartA,bodies:{Sun:{name:'Sun',longitudeDeg:Infinity}}}}),
    e=>e.code==='INVALID_POINT');
});

test('invalid, sparse and duplicate aspect rules fail without hidden defaults',()=>{
  assert.throws(()=>calculateSynastryAspectsOnly({...input,aspectDefinitions:undefined}),
    e=>e.code==='INVALID_ARGUMENT');
  for(const aspectDefinitions of [new Array(1),
    [{id:'square',angleDeg:90,maxOrbDeg:Infinity}],
    [{id:'c',angleDeg:0,maxOrbDeg:2},{id:'c',angleDeg:180,maxOrbDeg:2}]]) {
    assert.throws(()=>calculateSynastryAspectsOnly({...input,aspectDefinitions}),
      e=>e.code==='INVALID_ASPECT');
  }
  const empty=calculateSynastryAspectsOnly({...input,aspectDefinitions:[]});
  assert.equal(empty.aToB.aspects.length,0);
  assert.equal(empty.bToA.aspects.length,0);
});

test('result and its snapshots are immutable and independent of caller mutation',()=>{
  const names=['Sun'];
  const rules=[{id:'conjunction',angleDeg:0,maxOrbDeg:3}];
  const result=calculateSynastryAspectsOnly({...input,
    selectedBodyNamesA:names,aspectDefinitions:rules});
  names[0]='Moon'; rules[0].maxOrbDeg=90;
  assert.equal(result.selectedBodyNames.A[0],'Sun');
  assert.equal(result.aspectDefinitions[0].maxOrbDeg,3);
  for(const value of [result,result.warnings,result.warnings[0],result.aToB,
    result.aToB.aspects,result.timeBasis,result.timeBasis.A,
    result.selectedBodyNames,result.selectedBodyNames.A,result.aspectDefinitions[0]]) {
    assert.equal(Object.isFrozen(value),true);
  }
});

test('invalid top-level input returns a typed error',()=>{
  for(const invalid of [undefined,null,false,0,[], 'invalid']) {
    assert.throws(()=>calculateSynastryAspectsOnly(invalid),
      e=>e.code==='INVALID_ARGUMENT');
  }
});
