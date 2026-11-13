import test from 'node:test';
import assert from 'node:assert/strict';
import { locateLongitudeInHouses, validateHouseCuspSet } from '../src/index.mjs';

// Synthetic, unequal forward spans: [350, 20, 50, 90, ...] wraps exactly once.
const cusps = [350, 20, 50, 90, 110, 140, 170, 200, 230, 260, 290, 320];

test('unequal wrapped house intervals retain exact boundary ownership', () => {
  for (const [longitude, expectedHouse] of [
    [349.999, 12], [350, 1], [359.999, 1], [0, 1],
    [19.999, 1], [20, 2], [49.999, 2], [50, 3],
    [89.999, 3], [90, 4], [320, 12],
  ]) {
    assert.equal(locateLongitudeInHouses(longitude, cusps).house, expectedHouse);
  }
});

test('equivalent longitudes outside one turn preserve house and cusp distance', () => {
  for (const longitude of [0, 20, 350, 359.5]) {
    const expected = locateLongitudeInHouses(longitude, cusps);
    for (const shifted of [longitude - 720, longitude - 360, longitude + 360, longitude + 720]) {
      const actual = locateLongitudeInHouses(shifted, cusps);
      assert.equal(actual.house, expected.house);
      assert.ok(Math.abs(actual.distanceFromCuspDeg - expected.distanceFromCuspDeg) < 1e-9);
    }
  }
});

test('nonfinite and sparse cusp arrays fail closed', () => {
  const sparse = [...cusps];
  delete sparse[4];
  for (const malformed of [sparse, cusps.map((x, i) => i === 4 ? NaN : x),
    cusps.map((x, i) => i === 4 ? Infinity : x)]) {
    assert.throws(() => locateLongitudeInHouses(0, malformed), e => e.code === 'INVALID_CUSPS');
    assert.throws(() => validateHouseCuspSet({
      houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1',
      cusps: malformed,
      metadata: { houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL' },
    }), e => e.code === 'INVALID_CUSPS');
  }
});

test('cusp aliases outside one revolution normalize without mutating caller input', () => {
  const aliases = cusps.map((value, index) => value + (index % 2 === 0 ? 720 : -360));
  const before = [...aliases];
  const validated = validateHouseCuspSet({
    houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1',
    cusps: aliases,
    metadata: { houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL' },
  });
  assert.deepEqual(aliases, before);
  assert.deepEqual(validated.cusps, cusps);
  assert.ok(Object.isFrozen(validated.cusps));
  for (const longitude of [0, 19.999, 20, 349.999, 350, 359.999]) {
    assert.deepEqual(locateLongitudeInHouses(longitude, validated.cusps),
      locateLongitudeInHouses(longitude, cusps));
  }
});

test('a cusp sequence completing two turns is rejected, not silently reinterpreted', () => {
  const twoTurns = Array.from({ length: 12 }, (_, index) => index * 60);
  assert.throws(() => locateLongitudeInHouses(0, twoTurns), error => error.code === 'INVALID_CUSPS');
  assert.throws(() => validateHouseCuspSet({
    houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1',
    cusps: twoTurns,
    metadata: { houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL' },
  }), error => error.code === 'INVALID_CUSPS');
});


test('invalid body longitude fails closed before assigning a house', () => {
  for (const longitude of [NaN, Infinity, -Infinity, null, undefined, '350']) {
    assert.throws(() => locateLongitudeInHouses(longitude, cusps),
      error => error.code === 'INVALID_ANGLE');
  }
});

test('returned placement is frozen and does not expose mutable cusp input', () => {
  const mutable = [...cusps];
  const placement = locateLongitudeInHouses(0, mutable);
  assert.ok(Object.isFrozen(placement));
  assert.deepEqual(placement, {
    house: 1, startDeg: 350, endDeg: 20, distanceFromCuspDeg: 10,
  });
  mutable[0] = 10;
  assert.equal(placement.startDeg, 350);
  assert.equal(placement.endDeg, 20);
});


test('zero and full-turn aliases belong to the same wrapped first house', () => {
  const baseline = locateLongitudeInHouses(0, cusps);
  for (const longitude of [-0, -360, 360, 720]) {
    assert.deepEqual(locateLongitudeInHouses(longitude, cusps), baseline);
  }
  assert.equal(locateLongitudeInHouses(350, cusps).distanceFromCuspDeg, 0);
  assert.equal(locateLongitudeInHouses(20, cusps).distanceFromCuspDeg, 0);
});
