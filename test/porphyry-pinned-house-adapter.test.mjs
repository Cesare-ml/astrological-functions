import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptPorphyryForPinnedHouseComparison } from '../src/porphyry-pinned-house-adapter.mjs';
import { compareHousePlacementsWithPinnedSource } from '../src/house-source-consistency.mjs';

const datetimeUtc = '2026-11-13T12:00:00Z';
const observer = {latitudeDeg:44, longitudeDegEast:11};
const axes = [10,105,190,285];
const quadrantSpansDeg = [95,85,95,85];
const cuspsDeg = axes.flatMap((axis,index) =>
  [0,1,2].map(k => (axis + quadrantSpansDeg[index] * k / 3) % 360));
const native = Object.freeze({
  engineVersion:'SYNTHETIC_RUST', kernelSetId:'SYNTHETIC_KERNEL', timeModel:'TEST_TIME',
  frame:'ECLIPTIC_OF_DATE', zodiac:'TROPICAL', observerType:'TOPOCENTRIC', observer,
});
const result = Object.freeze({
  contract:'PorphyryHouseCusps',contractVersion:'0.1.0-experimental',houseSystem:'PORPHYRY',
  datetimeUtc,
  angles:{ascendantDeg:10,icDeg:105,descendantDeg:190,midheavenDeg:285},
  cuspsDeg, quadrantSpansDeg, source:native,
  interpretation:'FACTS_ONLY',
  validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
});
const source = Object.freeze({
  datetimeUtc,frame:'ECLIPTIC_OF_DATE',longitudeBasis:{type:'TROPICAL'},
  observerType:'TOPOCENTRIC',observer,
  engineVersion:'SYNTHETIC_RUST',kernelSetId:'SYNTHETIC_KERNEL',timeModel:'TEST_TIME',
  corrections:'APPARENT',calculationProfileId:'CANONICAL_V1',
});
const base = {porphyry:result,source,birthTimeKnown:true};
const build = (override={}) => adaptPorphyryForPinnedHouseComparison({...base,...override});
const code = wanted => e => e?.name === 'AstrologyError' && e.code === wanted;

test('normalizes real producer-shaped Porphyry facts into pinned comparison slots', () => {
  const out = build();
  assert.equal(out.snapshot.houseSystem,'PORPHYRY');
  assert.equal(out.snapshot.provenanceStatus,'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(out.source.kernelSetId,'SYNTHETIC_KERNEL');
  assert.deepEqual(out.snapshot.cuspsDeg,cuspsDeg);
  assert.deepEqual(out.source.longitudeBasis,{type:'TROPICAL'});
});

test('composes directly with the generic pinned source comparison gate', () => {
  const porphyry = build();
  const whole = {
    snapshot:{
      houseSystem:'WHOLE_SIGN',datetimeUtc,frame:'ECLIPTIC_OF_DATE',
      longitudeBasis:{type:'TROPICAL'},
      provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
      cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300],
    },
    source,
  };
  const compared = compareHousePlacementsWithPinnedSource({
    birthTimeKnown:true,left:whole,right:porphyry,points:[{id:'Sun',longitudeDeg:0}],
  });
  assert.equal(compared.comparison.facts[0].leftHouse,2);
  assert.equal(compared.comparison.facts[0].rightHouse,12);
  assert.equal(compared.comparison.changedCount,1);
  assert.equal(compared.status,'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED');
});

test('no birth-time fallback', () => {
  for (const birthTimeKnown of [undefined,false,null,'true'])
    assert.throws(() => build({birthTimeKnown}),code('BIRTH_TIME_UNKNOWN'));
});

test('rejects unknown or spoofed Porphyry producer contract', () => {
  for (const patch of [
    {contract:'FakeHouseCusps'}, {contractVersion:'0.2.0'}, {houseSystem:'VEHLOW'},
    {interpretation:'PROSE'}, {validation:'SCIENTIFICALLY_VERIFIED'},
    {unexpected:true},
  ]) assert.throws(() => build({porphyry:{...result,...patch}}),code('INVALID_PORPHYRY_RESULT'));
});

test('rejects missing and malformed source metadata, never invents corrections or profile', () => {
  for (const patch of [
    {corrections:undefined}, {calculationProfileId:undefined},
    {calculationProfileId:''}, {calculationProfileId:' LEGACY'},
    {longitudeBasis:undefined}, {longitudeBasis:{type:'SIDEREAL',ayanamsaId:'LAHIRI'}},
    {corrections:'GEOMETRIC'}, {frame:'J2000'},
    {observerType:'GEOCENTRIC'}, {unexpected:true},
  ]) assert.throws(() => build({source:{...source,...patch}}),code('INVALID_SOURCE_CONTEXT'));
});

test('native metadata cannot be silently overridden by pinned metadata', () => {
  for (const [field, value] of [
    ['engineVersion','RUST_DIFFERENT'],['kernelSetId','OTHER_KERNEL'],['timeModel','OTHER_MODEL'],
  ]) assert.throws(() => build({source:{...source,[field]:value}}),code('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('latitude and longitude must match the native producer exactly', () => {
  for (const other of [
    {latitudeDeg:45,longitudeDegEast:11}, {latitudeDeg:44,longitudeDegEast:12},
  ]) assert.throws(() => build({source:{...source,observer:other}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('nonpolar validated observer bounds reject NaN, infinities and poles', () => {
  for (const other of [
    {latitudeDeg:90,longitudeDegEast:11},{latitudeDeg:-90,longitudeDegEast:11},
    {latitudeDeg:NaN,longitudeDegEast:11},
    {latitudeDeg:44,longitudeDegEast:Infinity},
    {latitudeDeg:44,longitudeDegEast:181},
  ]) assert.throws(() => build({source:{...source,observer:other}}),
    code('INVALID_SOURCE_CONTEXT'));
});

test('invalid timestamp, calendar leap and UTC mismatch fail closed', () => {
  for (const datetimeUtc of [
    '2026-11-13T12:00:00+01:00','2026-02-30T00:00:00Z','2026-11-13T12:00Z',
  ]) assert.throws(() => build({porphyry:{...result,datetimeUtc}}),
    code('INVALID_PORPHYRY_RESULT'));
  assert.throws(() => build({source:{...source,datetimeUtc:'2026-11-13T12:00:01Z'}}),
    code('INVALID_SOURCE_CONTEXT'));
});

test('sparse, nonfinite, duplicate and reversed cusp arrays reject', () => {
  for (const cusps of [
    Array(12),[...cuspsDeg].fill(10),[...cuspsDeg.slice(0,11),NaN],
    [10,41.67,73.33,105,133.33,161.67,190,221.67,253.33,285,313.33,300],
  ]) assert.throws(() => build({porphyry:{...result,cuspsDeg:cusps}}),
    code('INVALID_CUSPS'));
});

test('axis/cusp disagreement cannot masquerade as an intact Porphyry snapshot', () => {
  assert.throws(() => build({porphyry:{...result,angles:{...result.angles,icDeg:106}}}),
    code('INCOMPATIBLE_PORPHYRY_GEOMETRY'));
});

test('four real bounded quadrant spans and axes are mandatory', () => {
  for (const spans of [undefined,[],[95,85,95],Array(4).fill(0),
    [95,85,Infinity,85],Array(4),[95,85,185,85]]) {
    assert.throws(() => build({porphyry:{...result,quadrantSpansDeg:spans}}),
      code('INVALID_PORPHYRY_RESULT'));
  }
  assert.throws(() => build({porphyry:{...result,angles:{...result.angles,icDeg:NaN}}}),
    code('INVALID_PORPHYRY_RESULT'));
});

test('native source cannot claim sidereal, geocentric or unsupported frame', () => {
  for (const patch of [
    {zodiac:'SIDEREAL'},{observerType:'GEOCENTRIC'},{frame:'J2000'},
    {kernelSetId:'  KERNEL'}, {surprise:'extra'},
  ]) assert.throws(() => build({porphyry:{...result,source:{...native,...patch}}}),
    code('INVALID_PORPHYRY_RESULT'));
});

test('source output is detached and immutable, including nested arrays and observer', () => {
  const mutableSource = {...source,observer:{...observer},longitudeBasis:{type:'TROPICAL'}};
  const mutableResult = {...result,cuspsDeg:[...cuspsDeg]};
  const adapted = build({source:mutableSource,porphyry:mutableResult});
  mutableSource.observer.latitudeDeg=55;
  mutableResult.cuspsDeg[0]=250;
  assert.equal(adapted.source.observer.latitudeDeg,44);
  assert.equal(adapted.snapshot.cuspsDeg[0],10);
  for (const value of [adapted,adapted.snapshot,adapted.source,adapted.snapshot.cuspsDeg,
    adapted.snapshot.longitudeBasis,adapted.source.observer])
    assert.ok(Object.isFrozen(value));
  assert.throws(() => { adapted.snapshot.cuspsDeg[0]=42; }, TypeError);
  assert.doesNotThrow(() => JSON.stringify(adapted));
});

test('malformed wrapper and results reject rather than being guessed', () => {
  for (const input of [undefined,null,[],{...base,extra:1}])
    assert.throws(() => adaptPorphyryForPinnedHouseComparison(input),
      code('INVALID_PORPHYRY_RESULT'));
  for (const porphyry of [undefined,null,[],{}])
    assert.throws(() => build({porphyry}),code('INVALID_PORPHYRY_RESULT'));
});
