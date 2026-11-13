import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize360 } from '../src/index.mjs';
import { adaptPorphyryToPinnedComparison } from '../src/porphyry-sourced-side.mjs';

// Synthetic producer-shaped fixtures. The real #40 producer is a separate
// draft dependency and is validated independently in the integration notes.
const datetimeUtc = '2026-11-13T16:00:00.000Z';
const observer = { latitudeDeg: 44, longitudeDegEast: 11 };
const producerSource = {
  engineVersion: 'SYNTHETIC_TEST', kernelSetId: 'SYNTHETIC_KERNEL',
  timeModel: 'SYNTHETIC_TIME', frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL',
  observerType: 'TOPOCENTRIC', observer,
};
const declaredSource = {
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis: {type:'TROPICAL'},
  observerType: 'TOPOCENTRIC', observer,
  engineVersion: 'SYNTHETIC_TEST', kernelSetId: 'SYNTHETIC_KERNEL',
  timeModel: 'SYNTHETIC_TIME', corrections: 'APPARENT',
  calculationProfileId: 'SYNTHETIC_PROFILE',
};

function syntheticResult(ascendantDeg = 10, midheavenDeg = 285) {
  const asc = normalize360(ascendantDeg);
  const mc = normalize360(midheavenDeg);
  const anchors = [asc, normalize360(mc + 180), normalize360(asc + 180), mc];
  const spans = anchors.map((start,i) =>
    normalize360(anchors[(i + 1) % 4] - start));
  const cuspsDeg = anchors.flatMap((start,i) =>
    [0,1,2].map(third => normalize360(start + spans[i] * third / 3)));
  return {
    contract: 'PorphyryHouseCusps', contractVersion:'0.1.0-experimental',
    houseSystem:'PORPHYRY', datetimeUtc,
    angles: {ascendantDeg:anchors[0],icDeg:anchors[1],
      descendantDeg:anchors[2],midheavenDeg:anchors[3]},
    cuspsDeg, quadrantSpansDeg:spans, source:producerSource,
    interpretation:'FACTS_ONLY',
    validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  };
}
const adapt = produced => adaptPorphyryToPinnedComparison({
  birthTimeKnown: true, produced, declaredSource,
});
const badGeometry = e => e?.name === 'AstrologyError' &&
  e.code === 'INVALID_PORPHYRY_GEOMETRY';
const interiorIndices = [1,2,4,5,7,8,10,11];

test('all eight authentic synthetic trisection interiors are accepted and frozen',()=>{
  const result = adapt(syntheticResult());
  assert.equal(result.snapshot.houseSystem,'PORPHYRY');
  assert.equal(result.snapshot.cuspsDeg.length,12);
  assert.equal(result.snapshot.provenanceStatus,
    'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.snapshot.cuspsDeg));
});

test('forged interior cusps fail while the four main anchors and spans remain intact',()=>{
  for(const i of interiorIndices){
    const original = syntheticResult();
    const forged = {...original, cuspsDeg:[...original.cuspsDeg]};
    forged.cuspsDeg[i] = normalize360(forged.cuspsDeg[i] + 0.01);
    assert.throws(()=>adapt(forged),badGeometry,`cusp ${i+1}`);
  }
});

test('wrapped zodiac quadrants cannot conceal forged internal Porphyry cusps',()=>{
  const wrapped=syntheticResult(350,250);
  assert.equal(adapt(wrapped).snapshot.cuspsDeg[0],350);
  assert.ok(wrapped.cuspsDeg[1] < wrapped.cuspsDeg[0]);
  for(const i of interiorIndices){
    const cuspsDeg=[...wrapped.cuspsDeg];
    cuspsDeg[i]=normalize360(cuspsDeg[i]-0.01);
    assert.throws(()=>adapt({...wrapped,cuspsDeg}),badGeometry);
  }
});

test('sub-tolerance floating point noise is permitted without accepting real distortions',()=>{
  const original=syntheticResult();
  for (const delta of [1e-8,-1e-8]){
    const cuspsDeg=[...original.cuspsDeg];
    cuspsDeg[1]+=delta;
    assert.doesNotThrow(()=>adapt({...original,cuspsDeg}));
  }
  for(const delta of [2e-7,-2e-7]){
    const cuspsDeg=[...original.cuspsDeg];
    cuspsDeg[1]+=delta;
    assert.throws(()=>adapt({...original,cuspsDeg}),badGeometry);
  }
});

test('even an empty downstream point comparison must not admit forged geometry',()=>{
  const original=syntheticResult();
  const cuspsDeg=[...original.cuspsDeg];
  cuspsDeg[11]+=0.25;
  assert.throws(()=>adapt({...original,cuspsDeg}),badGeometry);
});
