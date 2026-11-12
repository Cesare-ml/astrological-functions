import test from 'node:test';
import assert from 'node:assert/strict';
import { compareWholeSignAndEqualFromAscendant as compare } from '../src/whole-equal-house-comparison.mjs';

const base = {
  ascendantLongitudeDeg: 345,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  points: [
    { id: 'SUN', longitudeDeg: 355 },
    { id: 'MOON', longitudeDeg: 340 },
    { id: 'MARS', longitudeDeg: 10 },
    { id: 'VENUS', longitudeDeg: 15 },
  ],
};
const call = (patch = {}) => compare({ ...base, ...patch });
const errorCode = code => err => err?.name === 'AstrologyError' && err.code === code;

test('actual F3 producers compose into the generic comparison without adapters', () => {
  const result = call();
  assert.equal(result.contract, 'HouseMethodPlacementComparison');
  assert.equal(result.left.houseSystem, 'WHOLE_SIGN');
  assert.equal(result.right.houseSystem, 'EQUAL_ASCENDANT');
  assert.equal(result.status, 'CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.left.provenanceStatus, 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.deepEqual(result.left.cuspsDeg, [330,0,30,60,90,120,150,180,210,240,270,300]);
  assert.deepEqual(result.right.cuspsDeg, [345,15,45,75,105,135,165,195,225,255,285,315]);
  assert.deepEqual(result.facts.map(f => [f.id, f.leftHouse, f.rightHouse, f.changed]), [
    ['SUN',1,1,false], ['MOON',1,12,true], ['MARS',2,1,true], ['VENUS',2,2,false],
  ]);
  assert.equal(result.changedCount, 2);
});

test('exact 0, 360 and 30 cusp ownership is preserved end-to-end', () => {
  const result = call({ points: [
    { id: 'ZERO', longitudeDeg: 0 },
    { id: 'TURN', longitudeDeg: 360 },
    { id: 'THIRTY', longitudeDeg: 30 },
  ] });
  assert.deepEqual(result.facts.map(f => [f.leftHouse, f.rightHouse]), [[2,1],[2,1],[3,2]]);
});

test('Ascendant exactly at sign boundary creates identical houses', () => {
  const result = call({ ascendantLongitudeDeg: 0 });
  assert.deepEqual(result.left.cuspsDeg, result.right.cuspsDeg);
  assert.equal(result.changedCount, 0);
});

test('all twelve signs compose without invented methods or rollovers', () => {
  for (let sign = 0; sign < 12; sign++) {
    const ascendant = sign * 30 + 17.5;
    const result = call({ ascendantLongitudeDeg: ascendant,
      points: [{ id: 'POINT', longitudeDeg: sign * 30 + 5 }] });
    assert.equal(result.left.cuspsDeg[0], sign * 30);
    assert.equal(result.left.houseSystem, 'WHOLE_SIGN');
    assert.equal(result.right.cuspsDeg[0], ascendant);
    assert.equal(result.facts[0].leftHouse, 1);
    assert.equal(result.facts[0].rightHouse, 12);
  }
});

test('named sidereal basis passes unchanged through both F3 methods', () => {
  const sidereal = { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' };
  const result = call({ longitudeBasis: sidereal });
  assert.deepEqual(result.longitudeBasis, sidereal);
  assert.equal(result.changedCount, 2);
  assert.equal(result.status, 'CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED');
});

test('known birth-time gate fails before generating either method', () => {
  for (const birthTimeKnown of [false, null, undefined, 'yes']) {
    assert.throws(() => call({ birthTimeKnown }), errorCode('BIRTH_TIME_UNKNOWN'));
  }
});

test('provider-like J2000 frame, malformed UTC and missing ayanamsa fail closed', () => {
  assert.throws(() => call({ frame: 'J2000' }), errorCode('INVALID_FRAME'));
  assert.throws(() => call({ datetimeUtc: '2026-02-30T21:15:03Z' }), errorCode('INVALID_UTC'));
  assert.throws(() => call({ longitudeBasis: { type: 'SIDEREAL' } }), errorCode('INVALID_ZODIAC'));
});

test('invalid points do not yield partial or made-up comparison', () => {
  assert.throws(() => call({ points: [{ id: 'X', longitudeDeg: NaN }] }), errorCode('INVALID_POINTS'));
  assert.throws(() => call({ points: [{ id: 'X', longitudeDeg: 0 }, { id: 'X', longitudeDeg: 5 }] }), errorCode('INVALID_POINTS'));
});

test('detached output is frozen and caller data can be mutated safely afterward', () => {
  const basis = { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' };
  const points = [{ id: 'SUN', longitudeDeg: 355 }];
  const result = call({ longitudeBasis: basis, points });
  basis.ayanamsaId = 'MUTATED';
  points[0].id = 'MUTATED';
  assert.equal(result.longitudeBasis.ayanamsaId, 'TEST_V1');
  assert.equal(result.facts[0].id, 'SUN');
  for (const value of [result, result.left, result.right, result.facts,
      result.facts[0], result.left.cuspsDeg, result.right.cuspsDeg]) {
    assert.ok(Object.isFrozen(value));
  }
});

test('strict wrapper rejects unknown fields and invalid object shapes', () => {
  assert.throws(() => compare(null), errorCode('INVALID_HOUSE_COMPARISON'));
  assert.throws(() => call({ houseSystem: 'AUTO' }), errorCode('INVALID_HOUSE_COMPARISON'));
  assert.throws(() => compare([]), errorCode('INVALID_HOUSE_COMPARISON'));
});

test('an explicit zero-point comparison still validates both producers', () => {
  const result = call({ points: [] });
  assert.deepEqual(result.facts, []);
  assert.equal(result.changedCount, 0);
  assert.equal(result.left.cuspsDeg.length, 12);
  assert.equal(result.right.cuspsDeg.length, 12);
});
