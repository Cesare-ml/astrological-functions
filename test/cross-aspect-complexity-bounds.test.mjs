import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const points = (count, label) => Array.from({ length: count }, (_, i) => ({
  name: `${label}${i}`, longitudeDeg: 0,
}));
const rules = count => Array.from({ length: count }, (_, i) => ({
  id: `rule-${i}`, angleDeg: 0, maxOrbDeg: 0,
}));
const makeInput = (source = points(1, 'A'), target = points(1, 'B'), defs = rules(1)) => ({
  direction: 'A_TO_B', sourcePoints: source, targetPoints: target, aspectDefinitions: defs,
});
const rejectsTooLarge = input => assert.throws(
  () => calculateCrossAspects(input),
  error => error instanceof AstrologyError && error.code === 'INVALID_ARGUMENT',
);

test('rejects oversized source array before indexing or parsing any points', () => {
  let reads = 0;
  const source = Array(257);
  Object.defineProperty(source, 0, {get() { reads++; return {name:'Sun',longitudeDeg:0}; }});
  rejectsTooLarge(makeInput(source));
  assert.equal(reads, 0);
});

test('rejects oversized target array before indexing any points', () => {
  let reads = 0;
  const target = Array(257);
  Object.defineProperty(target, 0, {get() { reads++; return {name:'Moon',longitudeDeg:0}; }});
  rejectsTooLarge(makeInput(points(1,'A'), target));
  assert.equal(reads, 0);
});

test('rejects oversized rule array before invoking rule accessors', () => {
  let reads = 0;
  const defs = Array(33);
  Object.defineProperty(defs, 0, {get() { reads++; return {id:'one',angleDeg:0,maxOrbDeg:0}; }});
  rejectsTooLarge(makeInput(points(1,'A'), points(1,'B'), defs));
  assert.equal(reads, 0);
});

test('rejects excess Cartesian combinations before reading any caller properties', () => {
  let reads = 0;
  const source = points(64,'A');
  Object.defineProperty(source[0], 'name', {get() { reads++; return 'A0'; }});
  rejectsTooLarge(makeInput(source,points(64,'B'),rules(17)));
  assert.equal(reads, 0);
});

test('accepts exact 65536-comparison budget and freezes all facts', () => {
  const result = calculateCrossAspects(makeInput(points(64,'A'),points(64,'B'),rules(16)));
  assert.equal(result.length, 65536);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result[0]));
  assert.equal(result[0].aspectId, 'rule-0');
  assert.equal(result.at(-1).aspectId, 'rule-15');
});

test('accepts exact individual point and rule limits with small evaluation count', () => {
  const result = calculateCrossAspects(makeInput(points(256,'A'),points(1,'B'),rules(32)));
  assert.equal(result.length, 8192);
});

test('source accessor cannot expand target array or rule set beyond captured budget', () => {
  const target = points(1,'B'), defs = rules(1);
  let reads = 0;
  const source = [{
    get name() { reads++; target.push({name:'INJECTED',longitudeDeg:0}); defs.push({id:'extra',angleDeg:0,maxOrbDeg:0}); return 'A'; },
    longitudeDeg: 0,
  }];
  const result = calculateCrossAspects(makeInput(source,target,defs));
  assert.equal(reads, 1);
  assert.equal(target.length, 2);
  assert.equal(defs.length, 2);
  assert.equal(result.length, 1);
  assert.equal(result[0].target.name, 'B0');
  assert.equal(result[0].aspectId, 'rule-0');
});

test('preserves empty inputs and produces an immutable empty result', () => {
  const result = calculateCrossAspects(makeInput([], [], []));
  assert.deepEqual(result, []);
  assert.ok(Object.isFrozen(result));
});
