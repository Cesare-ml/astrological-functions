import test from 'node:test';
import assert from 'node:assert/strict';
import { compareHousePlacementsWithPinnedSource } from '../src/house-source-consistency.mjs';

const datetimeUtc = '2026-11-12T21:15:03Z';
const longitudeBasis = { type: 'TROPICAL' };
const baseSource = {
  datetimeUtc,
  frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  observerType: 'TOPOCENTRIC', observer: {latitudeDeg: 44, longitudeDegEast: 11},
  engineVersion: 'TEST_RUST_V1', kernelSetId: 'SYNTHETIC_TEST_KERNEL',
  timeModel: 'TEST_TIME_V1', corrections: 'APPARENT', calculationProfileId: 'CANONICAL_V1',
};
const common = {
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
};
const whole = { ...common, houseSystem: 'WHOLE_SIGN',
  cuspsDeg: [330,0,30,60,90,120,150,180,210,240,270,300] };
const equal = { ...common, houseSystem: 'EQUAL_ASCENDANT',
  cuspsDeg: [345,15,45,75,105,135,165,195,225,255,285,315] };
const base = {
  birthTimeKnown: true,
  left: { snapshot: whole, source: baseSource },
  right: { snapshot: equal, source: baseSource },
  points: [{id: 'SUN', longitudeDeg: 0}],
};
const build = (patch = {}) => compareHousePlacementsWithPinnedSource({ ...base, ...patch });
const bad = (code) => (error) => error?.name === 'AstrologyError' && error.code === code;
const changed = (side, patch) => ({...base[side], source: {...baseSource, ...patch}});

test('matching explicit pinned context allows a pure house comparison', () => {
  const result = build();
  assert.equal(result.contract, 'PinnedHouseMethodComparison');
  assert.equal(result.status, 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.comparison.changedCount, 1);
  assert.deepEqual(result.comparison.facts.map(({leftHouse,rightHouse}) => [leftHouse,rightHouse]), [[2,1]]);
  assert.equal(result.source.engineVersion, 'TEST_RUST_V1');
});

test('different engine, kernel, time model, corrections or profile fail closed', () => {
  for (const [field, value] of [
    ['engineVersion', 'TEST_RUST_V2'], ['kernelSetId', 'KERNEL_B'],
    ['timeModel', 'TIME_V2'], ['calculationProfileId', 'VIRGOSTARS_LEGACY_V1'],
  ]) {
    assert.throws(() => build({right: changed('right', {[field]: value})}),
      bad('INCOMPATIBLE_SOURCE_CONTEXT'), field);
  }
  assert.throws(() => build({right: changed('right', {corrections:'GEOMETRIC'})}),
    bad('INVALID_SOURCE_CONTEXT'));
});

test('different observer latitudes and longitudes are never treated as the same chart', () => {
  for (const observer of [
    {latitudeDeg: 45, longitudeDegEast: 11},
    {latitudeDeg: 44, longitudeDegEast: 12},
  ]) assert.throws(() => build({right: changed('right', {observer})}),
    bad('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('a source must agree with its own cusp UTC', () => {
  assert.throws(() => build({left: changed('left', {datetimeUtc:'2026-11-12T21:15:04Z'})}),
    bad('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('a source must agree with its own declared zodiac basis', () => {
  const sidereal = {type:'SIDEREAL', ayanamsaId:'SAMPLE_V1'};
  assert.throws(() => build({left: changed('left', {longitudeBasis:sidereal})}),
    bad('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('two consistent sidereal contexts pass only with an identical named ayanamsa', () => {
  const basis = {type:'SIDEREAL', ayanamsaId:'SAMPLE_TEST_V1'};
  const left = {snapshot:{...whole,longitudeBasis:basis},source:{...baseSource,longitudeBasis:basis}};
  const right = {snapshot:{...equal,longitudeBasis:basis},source:{...baseSource,longitudeBasis:basis}};
  assert.equal(build({left,right}).source.longitudeBasis.ayanamsaId,'SAMPLE_TEST_V1');
  assert.throws(() => build({left,right:{...right,source:{...right.source,
    longitudeBasis:{type:'SIDEREAL',ayanamsaId:'OTHER_V1'}}}}),
    bad('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('missing, untrimmed, oversized and control-character version IDs reject', () => {
  for (const value of [undefined,'',' ENGINE', 'ENGINE ', 'A'.repeat(129), 'K\nID']) {
    assert.throws(() => build({left: changed('left', {engineVersion:value})}),
      bad('INVALID_SOURCE_CONTEXT'));
  }
});

test('unknown and malformed metadata fields reject instead of being ignored', () => {
  for (const source of [null, {}, {...baseSource, extra:42},
    {...baseSource, observer: {...baseSource.observer, elevationM:100}},
    {...baseSource, longitudeBasis: {type:'TROPICAL', ayanamsaId:'ANY'}},
    {...baseSource, longitudeBasis: {type:'SIDEREAL'}},
    {...baseSource, observerType: 'GEOCENTRIC'},
    {...baseSource, frame:'J2000'}]) {
    assert.throws(() => build({left:{snapshot:whole,source}}),
      bad('INVALID_SOURCE_CONTEXT'));
  }
});

test('invalid coordinate bounds and polar observers reject', () => {
  for (const observer of [
    {latitudeDeg:90,longitudeDegEast:11}, {latitudeDeg:-90,longitudeDegEast:11},
    {latitudeDeg:NaN,longitudeDegEast:11}, {latitudeDeg:44,longitudeDegEast:Infinity},
    {latitudeDeg:44,longitudeDegEast:181},
  ]) assert.throws(() => build({right:changed('right', {observer})}),
    bad('INVALID_SOURCE_CONTEXT'));
});

test('source, nested context, cusp facts and output are detached and immutable', () => {
  const original = structuredClone(baseSource);
  const r = build({left:{snapshot:whole,source:original}});
  original.observer.latitudeDeg = 8;
  original.engineVersion = 'CHANGED';
  assert.equal(r.source.observer.latitudeDeg,44);
  assert.equal(r.source.engineVersion,'TEST_RUST_V1');
  for (const value of [r,r.source,r.source.observer,r.source.longitudeBasis,
    r.comparison,r.comparison.facts,r.comparison.left.cuspsDeg]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { r.source.observer.latitudeDeg = 0; }, TypeError);
  assert.doesNotThrow(() => JSON.stringify(r));
});

test('unknown birth time and malformed wrappers reject before comparison', () => {
  for (const birthTimeKnown of [false,undefined,null,1])
    assert.throws(() => build({birthTimeKnown}),bad('BIRTH_TIME_UNKNOWN'));
  for (const invalid of [null, [], {...base,unknown:true}])
    assert.throws(() => compareHousePlacementsWithPinnedSource(invalid),
      bad('INVALID_SOURCE_CONTEXT'));
  assert.throws(() => build({left:{source:baseSource}}),bad('INVALID_SOURCE_CONTEXT'));
});

test('the existing comparator remains the authority for malformed cusp or point facts', () => {
  assert.throws(() => build({right:{source:baseSource,snapshot:{...equal,cuspsDeg:[0]}}}),
    bad('INVALID_CUSPS'));
  assert.throws(() => build({points:[{id:'A',longitudeDeg:1},{id:'A',longitudeDeg:2}]}),
    bad('INVALID_POINTS'));
  assert.throws(() => build({right:{source:baseSource,snapshot:{...whole}}}),
    bad('INVALID_HOUSE_COMPARISON'));
});

test('Porphyry snapshots can be compared after explicit consumer-side normalization', () => {
  const porphyry = {...equal,houseSystem:'PORPHYRY',
    provenanceStatus:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'};
  const result = build({right:{snapshot:porphyry,source:baseSource}});
  assert.equal(result.comparison.right.houseSystem,'PORPHYRY');
  assert.equal(result.status,'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED');
});
