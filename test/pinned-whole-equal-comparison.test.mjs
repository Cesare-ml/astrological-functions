import test from 'node:test';
import assert from 'node:assert/strict';
import { compareWholeSignEqualWithPinnedSources as compare } from '../src/pinned-whole-equal-comparison.mjs';

const datetimeUtc = '2026-11-12T21:15:03Z';
const longitudeBasis = { type: 'TROPICAL' };
const source = {
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  observerType: 'TOPOCENTRIC',
  observer: { latitudeDeg: 44, longitudeDegEast: 11 },
  engineVersion: 'TEST_RUST_1', kernelSetId: 'SYNTHETIC_KERNEL_1',
  timeModel: 'TEST_TDB_1', corrections: 'APPARENT',
  calculationProfileId: 'CANONICAL_V1',
};
const base = {
  ascendantLongitudeDeg: 345, birthTimeKnown: true,
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  wholeSignSource: source, equalAscendantSource: source,
  points: [
    { id: 'SUN', longitudeDeg: 355 },
    { id: 'MOON', longitudeDeg: 340 },
    { id: 'MARS', longitudeDeg: 10 },
  ],
};
const call = (patch = {}) => compare({ ...base, ...patch });
const code = expected => err => err?.name === 'AstrologyError' && err.code === expected;

test('real Whole Sign/Equal producers pass through existing pinned-source comparator', () => {
  const result = call();
  assert.equal(result.contract, 'PinnedHouseMethodComparison');
  assert.equal(result.status, 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.source.kernelSetId, 'SYNTHETIC_KERNEL_1');
  assert.deepEqual(result.comparison.facts.map(p => [p.id, p.leftHouse, p.rightHouse, p.changed]), [
    ['SUN',1,1,false], ['MOON',1,12,true], ['MARS',2,1,true],
  ]);
  assert.equal(result.comparison.changedCount, 2);
  assert.equal(result.comparison.left.houseSystem, 'WHOLE_SIGN');
  assert.equal(result.comparison.right.houseSystem, 'EQUAL_ASCENDANT');
});
test('exact cusp ownership at zero and at full-turn aliases is preserved', () => {
  const r = call({ points: [
    {id:'ZERO',longitudeDeg:0},{id:'TURN',longitudeDeg:360},{id:'THIRTY',longitudeDeg:30},
  ] });
  assert.deepEqual(r.comparison.facts.map(p => [p.leftHouse,p.rightHouse]), [[2,1],[2,1],[3,2]]);
});
test('all 12 rising signs are handled without any astronomical calculations', () => {
  for(let sign=0; sign<12; sign++){
    const r=call({ascendantLongitudeDeg:sign*30+15,points:[{id:'P',longitudeDeg:sign*30+5}]});
    assert.equal(r.comparison.left.cuspsDeg[0], sign*30);
    assert.equal(r.comparison.facts[0].leftHouse,1);
    assert.equal(r.comparison.facts[0].rightHouse,12);
  }
});
test('same valid sidereal context matches after explicit ayanamsa selection', () => {
  const zodiac = {type:'SIDEREAL',ayanamsaId:'SYNTHETIC_AYANAMSA_V1'};
  const src = {...source,longitudeBasis:zodiac};
  const r = call({longitudeBasis:zodiac,wholeSignSource:src,equalAscendantSource:src});
  assert.equal(r.source.longitudeBasis.ayanamsaId,zodiac.ayanamsaId);
  assert.equal(r.comparison.changedCount,2);
});
test('independently specified observer latitude/longitude mismatches fail closed', () => {
  for(const observer of [
    {latitudeDeg:45,longitudeDegEast:11},
    {latitudeDeg:44,longitudeDegEast:12},
  ]) assert.throws(()=>call({equalAscendantSource:{...source,observer}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'));
});
test('kernel, engine, time model and calculation profile mismatches fail closed', () => {
  for(const [field,value] of [
    ['engineVersion','TEST_RUST_2'],['kernelSetId','SYNTHETIC_KERNEL_2'],
    ['timeModel','TEST_TDB_2'],['calculationProfileId','VIRGOSTARS_LEGACY_V1'],
  ]) assert.throws(()=>call({equalAscendantSource:{...source,[field]:value}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'),field);
});
test('source UTC does not silently differ from the actual cusp UTC', () => {
  assert.throws(()=>call({wholeSignSource:{...source,datetimeUtc:'2026-11-12T21:15:04Z'}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'));
  assert.throws(()=>call({equalAscendantSource:{...source,datetimeUtc:'2026-11-12T21:15:04Z'}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'));
});
test('source zodiac must exactly match the cusp zodiac on BOTH sides', () => {
  const sidereal={type:'SIDEREAL',ayanamsaId:'SYNTHETIC_AYANAMSA_V1'};
  assert.throws(()=>call({wholeSignSource:{...source,longitudeBasis:sidereal}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'));
  assert.throws(()=>call({equalAscendantSource:{...source,longitudeBasis:sidereal}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'));
});
test('malformed metadata and unsupported geometric corrections fail closed', () => {
  for(const value of [undefined,null,{}, {...source,engineVersion:''},
    {...source,corrections:'GEOMETRIC'}, {...source,observerType:'GEOCENTRIC'}])
    assert.throws(()=>call({wholeSignSource:value}),code('INVALID_SOURCE_CONTEXT'));
});
test('source polar latitude and unsupported coordinate bounds reject', () => {
  for(const observer of [{latitudeDeg:90,longitudeDegEast:11},
    {latitudeDeg:-90,longitudeDegEast:11}, {latitudeDeg:44,longitudeDegEast:181}])
    assert.throws(()=>call({equalAscendantSource:{...source,observer}}),
      code('INVALID_SOURCE_CONTEXT'));
});
test('unknown birth time refuses a house result', () => {
  for(const birthTimeKnown of [false,undefined,null,1])
    assert.throws(()=>call({birthTimeKnown}),code('BIRTH_TIME_UNKNOWN'));
});
test('invalid UTC, frame, sidereal and ascendant are refused upstream', () => {
  assert.throws(()=>call({datetimeUtc:'2026-02-30T21:15:03Z'}),code('INVALID_UTC'));
  assert.throws(()=>call({frame:'J2000'}),code('INVALID_FRAME'));
  assert.throws(()=>call({longitudeBasis:{type:'SIDEREAL'}}),code('INVALID_ZODIAC'));
  assert.throws(()=>call({ascendantLongitudeDeg:NaN}),code('INVALID_ANGLE'));
});
test('invalid points and unexpected wrapper keys reject without partial output', () => {
  assert.throws(()=>call({points:[{id:'X',longitudeDeg:NaN}]}),code('INVALID_POINTS'));
  assert.throws(()=>call({points:[{id:'X',longitudeDeg:1},{id:'X',longitudeDeg:2}]}),code('INVALID_POINTS'));
  assert.throws(()=>call({unknown:42}),code('INVALID_HOUSE_COMPARISON'));
  assert.throws(()=>compare(null),code('INVALID_HOUSE_COMPARISON'));
});
test('empty point selection still checks source consistency', () => {
  const r=call({points:[]});
  assert.equal(r.comparison.changedCount,0);
  assert.deepEqual(r.comparison.facts,[]);
  assert.throws(()=>call({points:[],equalAscendantSource:{...source,kernelSetId:'OTHER'}}),
    code('INCOMPATIBLE_SOURCE_CONTEXT'));
});
test('returned status and nested facts are immutable, detached and JSON-safe', () => {
  const observer={latitudeDeg:44,longitudeDegEast:11};
  const points=[{id:'SUN',longitudeDeg:355}];
  const localSource={...source,observer};
  const r=call({wholeSignSource:localSource,equalAscendantSource:localSource,points});
  observer.latitudeDeg=60; points[0].id='CHANGED';
  assert.equal(r.source.observer.latitudeDeg,44);
  assert.equal(r.comparison.facts[0].id,'SUN');
  for(const v of [r,r.source,r.source.observer,r.source.longitudeBasis,r.comparison,
    r.comparison.facts,r.comparison.facts[0],r.comparison.left.cuspsDeg])
    assert.ok(Object.isFrozen(v));
  assert.doesNotThrow(()=>JSON.stringify(r));
  assert.notEqual(r.status,'VERIFIED');
});
