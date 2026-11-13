import test from 'node:test';
import assert from 'node:assert/strict';
import { compareHousePlacementsWithSourcedPoints } from '../src/sourced-house-points.mjs';

const datetimeUtc = '2026-11-13T15:00:00Z';
const basis = {type:'TROPICAL'};
const source = {
  datetimeUtc, frame:'ECLIPTIC_OF_DATE', longitudeBasis:basis,
  observerType:'TOPOCENTRIC', observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC_RUST_V1',kernelSetId:'SYNTHETIC_KERNEL',
  timeModel:'SYNTHETIC_UTC',corrections:'APPARENT',calculationProfileId:'CANONICAL_V1',
};
const snapshot = {datetimeUtc,frame:'ECLIPTIC_OF_DATE',longitudeBasis:basis,
  provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'};
const left = {snapshot:{...snapshot,houseSystem:'WHOLE_SIGN',
  cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300]},source};
const right = {snapshot:{...snapshot,houseSystem:'EQUAL_ASCENDANT',
  cuspsDeg:[345,15,45,75,105,135,165,195,225,255,285,315]},source};
const positions = {source,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  points:[{id:'SUN',longitudeDeg:0},{id:'MOON',longitudeDeg:345}]};
const base = {birthTimeKnown:true,left,right,positions};
const build = (patch={}) => compareHousePlacementsWithSourcedPoints({...base,...patch});
const error = code => err => err?.name === 'AstrologyError' && err.code === code;
const mutateSource = patch => ({...source,...patch});
const namedPoint = (id,longitudeDeg) => ({id,longitudeDeg});

test('same-source planetary points compare safely with two different house systems',()=>{
  const r=build();
  assert.equal(r.contract,'SourcedHousePointComparison');
  assert.equal(r.pointCount,2);
  assert.equal(r.houseComparison.comparison.changedCount,1);
  assert.deepEqual(r.houseComparison.comparison.facts.map(x=>[x.id,x.leftHouse,x.rightHouse]),
    [['SUN',2,1],['MOON',1,1]]);
  assert.equal(r.status,'MATCHING_CALLER_ASSERTED_HOUSE_AND_POINT_SOURCES_NOT_INDEPENDENTLY_VERIFIED');
});

test('independently allocated but identical source data may match',()=>{
  const own = structuredClone(source);
  const r=build({positions:{...positions,source:own}});
  assert.deepEqual(r.source.observer,{latitudeDeg:44,longitudeDegEast:11});
  assert.notStrictEqual(r.source,own);
});

test('rejects different kernel, engine version, time model, profile or correction',()=>{
  for(const [field,value] of [
    ['kernelSetId','OTHER'],['engineVersion','OTHER'],
    ['timeModel','OTHER'],['calculationProfileId','LEGACY'],
    ['corrections','GEOMETRIC'],
  ]) assert.throws(()=>build({positions:{...positions,source:mutateSource({[field]:value})}}),
      error('INCOMPATIBLE_POINT_SOURCE_CONTEXT'),field);
});

test('rejects observer latitude and longitude mismatches',()=>{
  for(const observer of [
    {latitudeDeg:45,longitudeDegEast:11},
    {latitudeDeg:44,longitudeDegEast:12},
  ]) assert.throws(()=>build({positions:{...positions,source:mutateSource({observer})}}),
    error('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
});

test('rejects mismatched UTC date and coordinate frame',()=>{
  for(const patch of [
    {datetimeUtc:'2026-11-13T15:00:01Z'},
    {frame:'MEAN_ECLIPTIC_OF_DATE'},
  ]) assert.throws(()=>build({positions:{...positions,source:mutateSource(patch)}}),
    error('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
});

test('rejects mismatched tropical/sidereal coordinate basis, including different ayanamsas',()=>{
  const sid = {type:'SIDEREAL',ayanamsaId:'SYNTHETIC_AYANAMSA_V1'};
  assert.throws(()=>build({positions:{...positions,source:mutateSource({longitudeBasis:sid})}}),
    error('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
  const sidSource={...source,longitudeBasis:sid};
  const leftSid={...left,source:sidSource,snapshot:{...left.snapshot,longitudeBasis:sid}};
  const rightSid={...right,source:sidSource,snapshot:{...right.snapshot,longitudeBasis:sid}};
  assert.equal(build({left:leftSid,right:rightSid,positions:{...positions,source:sidSource}})
    .source.longitudeBasis.ayanamsaId,'SYNTHETIC_AYANAMSA_V1');
  assert.throws(()=>build({left:leftSid,right:rightSid,positions:{...positions,
    source:{...sidSource,longitudeBasis:{type:'SIDEREAL',ayanamsaId:'OTHER'}}}}),
    error('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
});

test('empty-point comparisons still require and validate matching point-source metadata',()=>{
  assert.equal(build({positions:{...positions,points:[]}}).pointCount,0);
  assert.throws(()=>build({positions:{...positions,points:[],source:mutateSource({kernelSetId:'OTHER'})}}),
    error('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
});

test('unknown birth time fails closed, even if matching source data is supplied',()=>{
  for(const birthTimeKnown of [false,undefined,null,'true'])
    assert.throws(()=>build({birthTimeKnown}),error('BIRTH_TIME_UNKNOWN'));
});

test('missing, false or overstated point provenance is forbidden',()=>{
  for(const status of [undefined,null,'VERIFIED','SCIENTIFICALLY_VALIDATED',false])
    assert.throws(()=>build({positions:{...positions,provenanceStatus:status}}),
      error('INVALID_SOURCED_HOUSE_POINTS'));
});

test('rejects malformed or unexpected point snapshot data',()=>{
  for(const positionsValue of [undefined,null,[],{},
    {...positions,unexpected:true},
    {source,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'},
    {points:positions.points,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'}])
    assert.throws(()=>build({positions:positionsValue}),error('INVALID_SOURCED_HOUSE_POINTS'));
});

test('rejects incomplete, extra or non-object source envelopes',()=>{
  const incomplete={...source};delete incomplete.engineVersion;
  for(const candidate of [
    undefined,null,[],{},incomplete,{...source,unrecognized:true},
    {...source,observer:{...source.observer,elevationM:100}},
    {...source,longitudeBasis:{type:'TROPICAL',ayanamsaId:'Lahiri'}},
  ]) assert.throws(()=>build({positions:{...positions,source:candidate}}),
    error('INVALID_POINT_SOURCE_CONTEXT'));
});

test('the existing comparator remains authoritative for invalid or duplicate point longitudes',()=>{
  for(const points of [
    [namedPoint('x',NaN)],
    [namedPoint('x',Infinity)],
    [namedPoint('x','4')],
    [namedPoint('x',0),namedPoint('x',1)],
    Array(1),
    Array(129).fill(namedPoint('same',0)),
  ]) assert.throws(()=>build({positions:{...positions,points}}),error('INVALID_POINTS'));
});

test('a mismatching house-side source also fails before reporting source agreement',()=>{
  const badRight={...right,source:mutateSource({kernelSetId:'OTHER'})};
  assert.throws(()=>build({right:badRight}),error('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('result, comparison and nested source/point facts are immutable and detached',()=>{
  const pointSource=structuredClone(source);
  const points=[namedPoint('SUN',0)];
  const r=build({positions:{...positions,source:pointSource,points}});
  pointSource.engineVersion='MUTATED';
  pointSource.observer.latitudeDeg=10;
  points[0].longitudeDeg=30;
  assert.equal(r.source.engineVersion,'SYNTHETIC_RUST_V1');
  assert.equal(r.source.observer.latitudeDeg,44);
  assert.equal(r.houseComparison.comparison.facts[0].longitudeDeg,0);
  for(const x of [r,r.source,r.source.longitudeBasis,r.source.observer,r.houseComparison,
    r.houseComparison.comparison,r.houseComparison.comparison.facts,
    r.houseComparison.comparison.facts[0]])assert.ok(Object.isFrozen(x));
  assert.throws(()=>{r.source.kernelSetId='MUTATED';},TypeError);
  assert.doesNotThrow(()=>JSON.stringify(r));
});

test('malformed and unknown top-level keys are rejected explicitly',()=>{
  for(const invalid of [undefined,null,[],{...base,secret:'extra'}])
    assert.throws(()=>compareHousePlacementsWithSourcedPoints(invalid),
      error('INVALID_SOURCED_HOUSE_POINTS'));
});

test('point longitudes exactly at house cusps use the existing ownership rule',()=>{
  const r=build({positions:{...positions,points:[
    namedPoint('a',0),namedPoint('b',15),namedPoint('c',330),namedPoint('d',360),
  ]}});
  assert.deepEqual(r.houseComparison.comparison.facts.map(x=>[x.leftHouse,x.rightHouse]),
    [[2,1],[2,2],[1,12],[2,1]]);
  assert.equal(r.pointCount,4);
});
