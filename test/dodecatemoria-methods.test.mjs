import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDodecatemoriaFacts } from '../src/dodecatemoria-methods.mjs';
import { dodecatemoriaLongitude } from '../src/index.mjs';

const facts = (longitudeDeg, method = 'PAULUS_13_V1', zodiac = 'TROPICAL') =>
  calculateDodecatemoriaFacts({ longitudeDeg, method, zodiac });

test('13-fold Paulus method preserves existing experimental function and historical 11 Aries example', () => {
  const result = facts(11);
  assert.equal(result.projectedLongitudeDeg, 143);
  assert.equal(result.projectedSignIndex, 4);
  assert.equal(result.partIndex, null);
  assert.equal(result.projectedLongitudeDeg, dodecatemoriaLongitude(11));
  assert.equal(result.contractVersion, '1');
  assert.equal(Object.isFrozen(result), true);
});

test('twelve equal 2.5 degree parts use sign-origin method, not 13-fold method', () => {
  const equal = facts(11, 'TWELVE_EQUAL_PARTS_V1');
  assert.equal(equal.projectedLongitudeDeg, 132);
  assert.equal(equal.projectedSignIndex, 4);
  assert.equal(equal.partIndex, 4);
  assert.notEqual(equal.projectedLongitudeDeg, facts(11).projectedLongitudeDeg);
});

test('sign start and exact 2.5 degree boundaries belong to the starting next part', () => {
  assert.deepEqual([facts(0, 'TWELVE_EQUAL_PARTS_V1').partIndex,
    facts(2.5, 'TWELVE_EQUAL_PARTS_V1').partIndex,
    facts(5, 'TWELVE_EQUAL_PARTS_V1').partIndex,
    facts(29.999, 'TWELVE_EQUAL_PARTS_V1').partIndex], [0,1,2,11]);
  assert.equal(facts(2.5, 'TWELVE_EQUAL_PARTS_V1').projectedLongitudeDeg, 30);
  assert.equal(facts(30, 'TWELVE_EQUAL_PARTS_V1').partIndex, 0);
  assert.equal(facts(30, 'TWELVE_EQUAL_PARTS_V1').projectedLongitudeDeg, 30);
});

test('Taurus 15 degrees shows different projected longitudes for distinct methods', () => {
  assert.equal(facts(45).projectedLongitudeDeg, 225);
  assert.equal(facts(45, 'TWELVE_EQUAL_PARTS_V1').projectedLongitudeDeg, 210);
});

test('normalization of negative and 360 degree longitudes, preserving zodiac metadata', () => {
  for (const method of ['PAULUS_13_V1','TWELVE_EQUAL_PARTS_V1']) {
    assert.equal(facts(360, method, 'SIDEREAL').projectedLongitudeDeg, 0);
    assert.equal(facts(-360, method).sourceLongitudeDeg, 0);
    assert.equal(facts(-1, method).sourceLongitudeDeg, 359);
    assert.equal(facts(-1, method, 'SIDEREAL').zodiac, 'SIDEREAL');
  }
});

test('finite input validation fails closed', () => {
  for (const longitudeDeg of [undefined, null, '11', NaN, Infinity, -Infinity]) {
    assert.throws(() => facts(longitudeDeg), e => e.code === 'INVALID_ANGLE');
  }
});

test('missing/unsupported conventions and zodiac fail closed', () => {
  assert.throws(() => calculateDodecatemoriaFacts(undefined), e => e.code === 'INVALID_ARGUMENT');
  assert.throws(() => calculateDodecatemoriaFacts([]), e => e.code === 'INVALID_ARGUMENT');
  assert.throws(() => calculateDodecatemoriaFacts({ longitudeDeg: 11, method: 'PAULUS_13_V1' }), e => e.code === 'INVALID_ZODIAC');
  assert.throws(() => calculateDodecatemoriaFacts({ longitudeDeg: 11, zodiac: 'TROPICAL' }), e => e.code === 'INVALID_DODECATEMORIA_METHOD');
  assert.throws(() => facts(11, 'UNKNOWN'), e => e.code === 'INVALID_DODECATEMORIA_METHOD');
});
