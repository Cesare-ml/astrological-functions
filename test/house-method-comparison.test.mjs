import test from 'node:test';
import assert from 'node:assert/strict';
import { compareHouseMethodPlacements } from '../src/house-method-comparison.mjs';

const context = {
  datetimeUtc: '2026-11-12T21:15:03Z', frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
};
const sign = Object.freeze({ ...context, houseSystem: 'WHOLE_SIGN',
  cuspsDeg: [330,0,30,60,90,120,150,180,210,240,270,300] });
const equal = Object.freeze({ ...context, houseSystem: 'EQUAL_ASCENDANT',
  cuspsDeg: [345,15,45,75,105,135,165,195,225,255,285,315] });
const base = { birthTimeKnown: true, left: sign, right: equal,
  points: [{ id: 'Sun', longitudeDeg: 0 }, { id: 'Moon', longitudeDeg: 345 }] };
const build = (patch = {}) => compareHouseMethodPlacements({ ...base, ...patch });
const code = wanted => err => err?.name === 'AstrologyError' && err.code === wanted;

test('compares cusp placement across 0° without recomputing systems', () => {
  const r = build();
  assert.equal(r.contract, 'HouseMethodPlacementComparison');
  assert.equal(r.status, 'CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED');
  assert.deepEqual(r.facts.map(({ id, leftHouse, rightHouse, changed }) =>
    [id,leftHouse,rightHouse,changed]), [['Sun',2,1,true],['Moon',1,1,false]]);
  assert.equal(r.changedCount,1);
});
test('exact cusps and whole-turn aliases behave deterministically', () => {
  const r = build({ points: [
    { id: 'a', longitudeDeg: 330 }, { id: 'b', longitudeDeg: 360 },
    { id: 'c', longitudeDeg: -15 }, { id: 'd', longitudeDeg: 15 },
  ] });
  assert.deepEqual(r.facts.map(x => [x.id,x.longitudeDeg,x.leftHouse,x.rightHouse]),
    [['a',330,1,12],['b',0,2,1],['c',345,1,1],['d',15,2,2]]);
});
test('supports no points while still validating both cusp sets', () => {
  assert.deepEqual(build({ points: [] }).facts, []);
  assert.equal(build({ points: [] }).changedCount, 0);
  assert.throws(() => build({ points: [], right: { ...equal, cuspsDeg: Array(12).fill(0) } }), code('INVALID_CUSPS'));
});
test('supports explicit Porphyry snapshots through the same comparison contract', () => {
  const porphyry = { ...equal, houseSystem: 'PORPHYRY',
    provenanceStatus: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED' };
  const r = build({ right: porphyry });
  assert.equal(r.right.houseSystem, 'PORPHYRY');
  assert.equal(r.right.provenanceStatus, 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
});
test('defensively copies input context, cusp arrays and points', () => {
  const cusps = [...equal.cuspsDeg];
  const right = { ...equal, longitudeBasis: { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' }, cuspsDeg: cusps };
  const left = { ...sign, longitudeBasis: { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' } };
  const points = [{ id: '__proto__', longitudeDeg: 0 }];
  const r = build({ left, right, points });
  cusps[0] = 99;
  right.longitudeBasis.ayanamsaId = 'CHANGED';
  points[0].longitudeDeg = 45;
  assert.equal(r.right.cuspsDeg[0], 345);
  assert.equal(r.longitudeBasis.ayanamsaId, 'TEST_V1');
  assert.equal(r.facts[0].longitudeDeg, 0);
  for (const value of [r,r.left,r.right,r.facts,r.facts[0],r.left.cuspsDeg,r.longitudeBasis])
    assert.ok(Object.isFrozen(value));
});
test('birth time must be explicitly known', () => {
  for (const birthTimeKnown of [undefined,false,'true',null])
    assert.throws(() => build({ birthTimeKnown }), code('BIRTH_TIME_UNKNOWN'));
  assert.throws(() => build({ left: { ...sign, birthTimeKnown:false } }), code('BIRTH_TIME_UNKNOWN'));
});
test('rejects incompatible clock instants and zodiac bases', () => {
  assert.throws(() => build({ right: { ...equal, datetimeUtc:'2026-11-12T21:15:04Z' } }), code('INCOMPATIBLE_HOUSE_CONTEXT'));
  assert.throws(() => build({ right: { ...equal, longitudeBasis: {type:'SIDEREAL',ayanamsaId:'TEST'} } }), code('INCOMPATIBLE_HOUSE_CONTEXT'));
  assert.throws(() => build({ right: { ...equal, datetimeUtc: '2026-02-30T21:15:03Z' } }), code('INVALID_UTC'));
});
test('rejects same method and unsupported methods', () => {
  assert.throws(() => build({ right: { ...equal, houseSystem: 'WHOLE_SIGN' } }), code('INVALID_HOUSE_COMPARISON'));
  assert.throws(() => build({ right: { ...equal, houseSystem: 'VEHLOW' } }), code('INVALID_HOUSE_SNAPSHOT'));
});
test('rejects invalid frame, provenance or zodiac without fallback', () => {
  assert.throws(() => build({ right: { ...equal, frame:'J2000' } }), code('INVALID_FRAME'));
  assert.throws(() => build({ right: { ...equal, provenanceStatus:'VALIDATED' } }), code('INVALID_HOUSE_SNAPSHOT'));
  assert.throws(() => build({ right: { ...equal, longitudeBasis:{type:'TROPICAL',ayanamsaId:'X'} } }), code('INVALID_ZODIAC'));
  assert.throws(() => build({ right: { ...equal, longitudeBasis:{type:'SIDEREAL'} } }), code('INVALID_ZODIAC'));
});
test('rejects malformed, duplicate, sparse and excessive point inputs', () => {
  for (const points of [null, {}, Array(129).fill({id:'x',longitudeDeg:0}),
    [{id:'same',longitudeDeg:1},{id:'same',longitudeDeg:2}],
    [{id:'',longitudeDeg:0}], [{id:'p',longitudeDeg:NaN}],
    [{id:'p',longitudeDeg:'1'}], Array(1)]) {
    assert.throws(() => build({points}), code('INVALID_POINTS'));
  }
});
test('rejects malformed sparse, nonfinite or unordered house cusps', () => {
  for (const cuspsDeg of [[],Array(12),[...equal.cuspsDeg].fill(0),
    [345,15,45,75,105,135,165,195,225,255,285,NaN],
    [345,15,45,75,105,135,165,195,225,255,285,280]]) {
    assert.throws(() => build({ right: { ...equal, cuspsDeg } }), code('INVALID_CUSPS'));
  }
});
test('rejects malformed top-level and both sides', () => {
  for (const v of [null, undefined, [], { ...base, unexpected:true }])
    assert.throws(() => compareHouseMethodPlacements(v), code('INVALID_HOUSE_COMPARISON'));
  assert.throws(() => build({right:null}), code('INVALID_HOUSE_SNAPSHOT'));
});

test('never calls custom cusp map or iterator while creating trusted snapshot',()=>{
  let used=0;
  const cusps=[...equal.cuspsDeg];
  cusps.map=()=>{used++;throw Error('untrusted map');};
  cusps[Symbol.iterator]=()=>{used++;throw Error('untrusted iterator');};
  const out=build({right:{...equal,cuspsDeg:cusps}});
  assert.equal(out.changedCount,1);assert.equal(used,0);
});
test('reads each indexed cusp getter once and uses that value',()=>{
  const cusps=[...equal.cuspsDeg];let reads=0;
  Object.defineProperty(cusps,0,{get(){return ++reads===1?345:NaN;}});
  const out=build({right:{...equal,cuspsDeg:cusps}});
  assert.equal(out.right.cuspsDeg[0],345);assert.equal(reads,1);
});
test('captures caller cusp array property only once',()=>{
  const right={...equal};let reads=0;
  Object.defineProperty(right,'cuspsDeg',{get(){return ++reads===1?[...equal.cuspsDeg]:Array(12).fill(0);}});
  const out=build({right});
  assert.equal(out.changedCount,1);assert.equal(reads,1);
});
test('rejects sparse cusps despite forged iterator and snapshots point fields once',()=>{
  const cusps=new Array(12);
  cusps[Symbol.iterator]=function*(){yield* equal.cuspsDeg;};
  assert.throws(()=>build({right:{...equal,cuspsDeg:cusps}}),code('INVALID_CUSPS'));
  const point={id:'getter'};let reads=0;
  Object.defineProperty(point,'longitudeDeg',{get(){return ++reads===1?0:NaN;}});
  const out=build({points:[point]});
  assert.equal(out.facts[0].longitudeDeg,0);assert.equal(reads,1);
});
