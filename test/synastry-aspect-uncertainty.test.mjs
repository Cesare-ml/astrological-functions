import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSynastryAspectUncertainty} from '../src/synastry-aspect-uncertainty.mjs';

const provenance=Object.freeze({engineVersion:'test-only',kernelSetId:'synthetic-kernel',timeModel:'test-UTC'});
const result={
  contract:'SynastryAspectsOnlyResult',
  contractVersion:'0.1.0-experimental',
  houseMode:'UNAVAILABLE', angles:null,
  timeBasis:{
    A:{birthTimeKnown:false,positionBasis:'REPRESENTATIVE_INSTANT',datetimeUtc:'2026-01-01T12:00:00Z'},
    B:{birthTimeKnown:true,positionBasis:'KNOWN_BIRTH_INSTANT',datetimeUtc:'2026-02-01T12:00:00Z'},
  },
  provenance:{A:provenance,B:provenance},
  selectedBodyNames:{A:['Sun'],B:['Mars']},
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:5}],
  aToB:{houseOverlays:null},bToA:{houseOverlays:null},
};
const enclosureA=(startDeg=358,spanDeg=3)=>({
  intervalStartUtc:'2026-01-01T00:00:00Z',intervalEndUtc:'2026-01-01T23:59:59Z',
  coverage:'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE',
  ephemerisProvenance:provenance,bodies:{Sun:{startDeg,spanDeg}},
});
const enclosureB=(startDeg=1,spanDeg=0)=>({
  intervalStartUtc:'2026-02-01T12:00:00Z',intervalEndUtc:'2026-02-01T12:00:00Z',
  coverage:'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE',
  ephemerisProvenance:provenance,bodies:{Mars:{startDeg,spanDeg}},
});
const input={aspectsOnlyResult:result,enclosureA:enclosureA(),enclosureB:enclosureB()};
const analyze=(a,b,extras={})=>analyzeSynastryAspectUncertainty({
  ...input,enclosureA:enclosureA(...a),enclosureB:enclosureB(...b),...extras,
});

test('wrap-around enclosed conjunction is always within a 5 degree orb',()=>{
  const facts=analyzeSynastryAspectUncertainty(input);
  assert.equal(facts.contract,'SynastryAspectUncertaintyResult');
  assert.equal(facts.interpretation,'CONDITIONAL_ON_CALLER_ENCLOSURES');
  assert.equal(facts.aToB.facts[0].status,'ALWAYS_WITHIN_BOUNDS');
  assert.equal(facts.bToA.facts[0].status,'ALWAYS_WITHIN_BOUNDS');
  assert.deepEqual(facts.aToB.facts[0].separationBoundsDeg,{minDeg:0,maxDeg:3});
  assert.equal(facts.aToB.counts.ALWAYS_WITHIN_BOUNDS,1);
  assert.equal(facts.warning.code,'ENCLOSURE_COVERAGE_NOT_VERIFIED');
});

test('never within orb when entire arc is separated',()=>{
  const facts=analyze([100,2],[300,0]);
  assert.equal(facts.aToB.facts[0].status,'NEVER_WITHIN_BOUNDS');
  assert.equal(facts.aToB.counts.NEVER_WITHIN_BOUNDS,1);
});

test('maybe within orb for arc that crosses configured orb boundary',()=>{
  const facts=analyze([354,7],[1,0]);
  assert.equal(facts.aToB.facts[0].status,'MAYBE_WITHIN_BOUNDS');
  assert.equal(facts.aToB.counts.MAYBE_WITHIN_BOUNDS,1);
});

test('full-circle enclosure has exact 0..180 angular separation bounds',()=>{
  const facts=analyze([0,360],[90,0]);
  assert.deepEqual(facts.aToB.facts[0].separationBoundsDeg,{minDeg:0,maxDeg:180});
  assert.equal(facts.aToB.facts[0].status,'MAYBE_WITHIN_BOUNDS');
});

test('two arcs with combined span 360 cover every separation',()=>{
  const facts=analyze([350,180],[180,180]);
  assert.deepEqual(facts.aToB.facts[0].separationBoundsDeg,{minDeg:0,maxDeg:180});
});

test('opposition extrema and edge detection across 180 degrees',()=>{
  const withOpposite={...result,aspectDefinitions:[{id:'opposition',angleDeg:180,maxOrbDeg:5}]};
  const a=analyze([175,10],[0,0],{aspectsOnlyResult:withOpposite});
  assert.deepEqual(a.aToB.facts[0].separationBoundsDeg,{minDeg:175,maxDeg:180});
  assert.equal(a.aToB.facts[0].status,'ALWAYS_WITHIN_BOUNDS');
  const b=analyze([165,20],[0,0],{aspectsOnlyResult:withOpposite});
  assert.equal(b.aToB.facts[0].status,'MAYBE_WITHIN_BOUNDS');
});

test('unknown time requires a nonempty interval containing representative timestamp',()=>{
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureA:{
    ...enclosureA(),intervalStartUtc:'2026-01-01T13:00:00Z'}}),
    error=>error.code==='INCOMPATIBLE_ENCLOSURE_INTERVAL');
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureA:{
    ...enclosureA(),intervalEndUtc:'2026-01-01T00:00:00Z'}}),
    error=>error.code==='INCOMPATIBLE_ENCLOSURE_INTERVAL');
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureA:{
    ...enclosureA(),intervalStartUtc:'2026-02-30T00:00:00Z'}}),
    error=>error.code==='INVALID_ENCLOSURE_INTERVAL');
});

test('known birth instant requires point interval and zero-span arcs',()=>{
  assert.throws(()=>analyze([358,3],[1,1]),
    error=>error.code==='INVALID_ENCLOSURE');
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureB:{
    ...enclosureB(),intervalEndUtc:'2026-02-01T20:00:00Z'}}),
    error=>error.code==='INCOMPATIBLE_ENCLOSURE_INTERVAL');
});

test('caller must assert continuous coverage and matching engine/kernel/time model',()=>{
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureA:{
    ...enclosureA(),coverage:'SAMPLES_ONLY'}}),
    error=>error.code==='INVALID_ENCLOSURE');
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureB:{
    ...enclosureB(),ephemerisProvenance:{...provenance,kernelSetId:'other'}}}),
    error=>error.code==='INCOMPATIBLE_ENCLOSURE_PROVENANCE');
});

test('enclosure bodies must exactly match explicit selected list',()=>{
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureA:{
    ...enclosureA(),bodies:{Sun:{startDeg:358,spanDeg:3},Moon:{startDeg:10,spanDeg:4}}}}),
    error=>error.code==='INVALID_ENCLOSURE');
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureA:{
    ...enclosureA(),bodies:{Moon:{startDeg:10,spanDeg:4}}}}),
    error=>error.code==='INVALID_ENCLOSURE');
});

test('longitude arcs reject negative, noncanonical, missing and infinite bounds',()=>{
  for(const arc of [
    {startDeg:-1,spanDeg:2},{startDeg:360,spanDeg:2},
    {startDeg:10,spanDeg:-1},{startDeg:0,spanDeg:361},
    {startDeg:NaN,spanDeg:1},{startDeg:0,spanDeg:Infinity},null,
  ]) {
    assert.throws(()=>analyzeSynastryAspectUncertainty({...input,enclosureA:{
      ...enclosureA(),bodies:{Sun:arc}}}),error=>error.code==='INVALID_ENCLOSURE');
  }
});

test('rejects aspects result claiming houses/angles or invalid aspect rules',()=>{
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,aspectsOnlyResult:{
    ...result,houseMode:'FULL_HOUSES'}}),error=>error.code==='INVALID_UNCERTAINTY_RESULT');
  assert.throws(()=>analyzeSynastryAspectUncertainty({...input,aspectsOnlyResult:{
    ...result,aspectDefinitions:[{id:'x',angleDeg:0,maxOrbDeg:1},{id:'x',angleDeg:180,maxOrbDeg:1}]}}),
    error=>error.code==='INVALID_ASPECT');
  assert.throws(()=>analyzeSynastryAspectUncertainty(null),error=>error.code==='INVALID_ARGUMENT');
});

test('empty rules produce zero facts without inventing defaults',()=>{
  const out=analyzeSynastryAspectUncertainty({...input,aspectsOnlyResult:{
    ...result,aspectDefinitions:[]}});
  assert.deepEqual(out.aToB.facts,[]);
  assert.deepEqual(out.bToA.facts,[]);
  assert.equal(out.aToB.counts.MAYBE_WITHIN_BOUNDS,0);
});

test('all outputs are deeply snapshotted at used levels and source inputs unchanged',()=>{
  const out=analyzeSynastryAspectUncertainty(input);
  for(const item of [out,out.aToB,out.bToA,out.aToB.facts,out.aToB.facts[0],
    out.aToB.facts[0].separationBoundsDeg,out.aToB.counts,out.enclosures,
    out.enclosures.A,out.enclosures.A.points,out.enclosures.A.points[0],
    out.enclosures.B.ephemerisProvenance,out.warning,out.aspectDefinitions[0]]) {
    assert.equal(Object.isFrozen(item),true);
  }
  assert.equal(input.enclosureA.bodies.Sun.startDeg,358);
  assert.equal(out.angles,null);
  assert.equal(out.houseMode,'UNAVAILABLE');
});
