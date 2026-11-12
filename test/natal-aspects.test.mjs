import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalAspects } from '../src/natal-aspects.mjs';

const conjunction = { id: 'conjunction', angleDeg: 0, maxOrbDeg: 3 };
const opposition = { id: 'opposition', angleDeg: 180, maxOrbDeg: 2 };
const compute = (points, aspectDefinitions = [conjunction, opposition]) =>
  calculateNatalAspects({ points, aspectDefinitions });

const failsWith = (call, code) => assert.throws(call, (error) => error.name === 'AstrologyError' && error.code === code);

test('one unique unordered pair across 0/360, inclusive orb boundary', () => {
  const result = compute([{ name: 'Sun', longitudeDeg: 359 }, { name: 'Moon', longitudeDeg: 2 }]);
  assert.equal(result.pairsConsidered, 1);
  assert.equal(result.aspects.length, 1);
  assert.equal(result.aspects[0].aspectId, 'conjunction');
  assert.equal(result.aspects[0].actualAngleDeg, 3);
  assert.equal(result.aspects[0].signedOrbDeg, 3);
  assert.deepEqual([result.aspects[0].pointA.name, result.aspects[0].pointB.name], ['Moon', 'Sun']);
});

test('order independence and deterministic definition order', () => {
  const points = [{ name: 'Sun', longitudeDeg: -1 }, { name: 'Moon', longitudeDeg: 362 }, { name: 'Mars', longitudeDeg: 179 }];
  const a = compute(points);
  const b = compute([...points].reverse(), [opposition, conjunction]);
  assert.deepEqual(a, b);
  assert.equal(a.pairsConsidered, 3);
  assert.equal(a.aspects.length, 2);
  assert.deepEqual(a.aspects.map(m => m.aspectId), ['opposition', 'conjunction']);
});

test('exact opposition, zero orb and 360 normalization', () => {
  const value = compute([{name:'A',longitudeDeg:360}, {name:'B',longitudeDeg:180}], [{id:'opp',angleDeg:180,maxOrbDeg:0}]);
  assert.equal(value.aspects[0].actualAngleDeg, 180);
  assert.equal(value.aspects[0].absoluteOrbDeg, 0);
  assert.equal(value.aspects[0].pointA.longitudeDeg, 0);
});

test('just beyond orb boundary is excluded with no epsilon expansion', () => {
  assert.equal(compute([{name:'A',longitudeDeg:0}, {name:'B',longitudeDeg:3.000001}]).aspects.length, 0);
  assert.equal(compute([{name:'A',longitudeDeg:0}, {name:'B',longitudeDeg:3}]).aspects.length, 1);
});

test('never creates self-pairs; explicitly empty aspect sets are valid', () => {
  assert.deepEqual(compute([{name:'Sun',longitudeDeg:25}]).aspects, []);
  assert.equal(compute([{name:'Sun',longitudeDeg:25}]).pairsConsidered, 0);
  assert.deepEqual(compute([{name:'Sun',longitudeDeg:25}, {name:'Moon',longitudeDeg:25}], []).aspects, []);
});

test('overlapping named aspects are preserved, not arbitrarily chosen', () => {
  const result = compute([{name:'A',longitudeDeg:0},{name:'B',longitudeDeg:0}], [
    {id:'wide',angleDeg:0,maxOrbDeg:5}, {id:'exact',angleDeg:0,maxOrbDeg:0}]);
  assert.deepEqual(result.aspects.map(a=>a.aspectId), ['exact','wide']);
});

test('snapshots are frozen and independent of original mutable objects', () => {
  const point = {name:'Sun',longitudeDeg:359};
  const definition = {id:'conjunction',angleDeg:0,maxOrbDeg:3};
  const result = compute([point, {name:'Moon',longitudeDeg:2}], [definition]);
  point.longitudeDeg = 90;
  definition.maxOrbDeg = 0;
  assert.equal(result.aspects[0].pointB.longitudeDeg,359);
  assert.equal(result.aspects[0].configuredMaxOrbDeg,3);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.aspects));
  assert.ok(Object.isFrozen(result.aspects[0]));
  assert.ok(Object.isFrozen(result.aspects[0].pointA));
  assert.throws(()=>result.aspects.push({}), TypeError);
});

test('rejects missing, oversized and sparse point arrays', () => {
  failsWith(()=>calculateNatalAspects(), 'INVALID_POINTS');
  failsWith(()=>calculateNatalAspects({points:[],aspectDefinitions:[]}), 'INVALID_POINTS');
  failsWith(()=>compute(Array.from({length:33},(_,i)=>({name:`P${i}`,longitudeDeg:i}))), 'INVALID_POINTS');
  failsWith(()=>compute(new Array(2)), 'INVALID_POINT');
});

test('rejects malformed or duplicated named points', () => {
  failsWith(()=>compute([{name:'Sun',longitudeDeg:0},{name:'Sun',longitudeDeg:1}]), 'DUPLICATE_POINT');
  for(const name of ['', ' Sun ', 42]) failsWith(()=>compute([{name,longitudeDeg:0}]), 'INVALID_POINT');
  for(const longitudeDeg of [NaN,Infinity,'10',undefined]) failsWith(()=>compute([{name:'Sun',longitudeDeg}]), 'INVALID_POINT');
});

test('requires explicit valid definition array', () => {
  failsWith(()=>calculateNatalAspects({points:[{name:'Sun',longitudeDeg:0}]}), 'INVALID_ASPECTS');
  failsWith(()=>compute([{name:'Sun',longitudeDeg:0}], new Array(33).fill(conjunction)), 'INVALID_ASPECTS');
  failsWith(()=>compute([{name:'Sun',longitudeDeg:0}], new Array(1)), 'INVALID_ASPECT');
  failsWith(()=>compute([{name:'Sun',longitudeDeg:0}], [conjunction,conjunction]), 'DUPLICATE_ASPECT');
});

test('rejects nonfinite, negative or out-of-range geometry', () => {
  const point = [{name:'Sun',longitudeDeg:0}];
  const invalid = [
    {id:'x', angleDeg:181, maxOrbDeg:1},
    {id:'x', angleDeg:-1, maxOrbDeg:1},
    {id:'x', angleDeg:0, maxOrbDeg:-1},
    {id:'x', angleDeg:0, maxOrbDeg:181},
    {id:'x', angleDeg:NaN, maxOrbDeg:1},
    {id:'x', angleDeg:0, maxOrbDeg:Infinity},
    {id:' x ',angleDeg:0,maxOrbDeg:1},
  ];
  for (const a of invalid) failsWith(()=>compute(point,[a]), 'INVALID_ASPECT');
});

test('returns facts-only status, not velocity, interpretation, or scientific verification', () => {
  const result = compute([{name:'Sun',longitudeDeg:0},{name:'Moon',longitudeDeg:5}]);
  assert.equal(result.contract,'NatalAspectFacts');
  assert.equal(result.validationStatus,'SOURCE_POSITIONS_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal('applying' in (result.aspects[0]??{}), false);
  assert.equal('interpretation' in result, false);
});
