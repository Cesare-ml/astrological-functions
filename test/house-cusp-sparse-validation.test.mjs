import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, locateLongitudeInHouses, validateHouseCuspSet } from '../src/index.mjs';

const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
const context = {
  houseSystem: 'VEHLOW',
  calculationProfile: 'CANONICAL_V1',
  metadata: { houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL' }
};

for (const [label, badCusps] of [
  ['sparse hole', Object.assign([...cusps], { 3: undefined })],
  ['nonfinite number', cusps.map((x, i) => i === 3 ? NaN : x)],
  ['string', cusps.map((x, i) => i === 3 ? '90' : x)],
  ['infinity', cusps.map((x, i) => i === 3 ? Infinity : x)]
]) {
  test(`rejects ${label} with INVALID_CUSPS in both entry points`, () => {
    for (const call of [
      () => locateLongitudeInHouses(15, badCusps),
      () => validateHouseCuspSet({ ...context, cusps: badCusps })
    ]) {
      assert.throws(call, error => error instanceof AstrologyError && error.code === 'INVALID_CUSPS');
    }
  });
}

test('actual sparse holes are rejected rather than skipped', () => {
  const sparse = [...cusps];
  delete sparse[3];
  assert.throws(() => locateLongitudeInHouses(15, sparse), e => e.code === 'INVALID_CUSPS');
  assert.throws(() => validateHouseCuspSet({ ...context, cusps: sparse }), e => e.code === 'INVALID_CUSPS');
});

test('dense forward cusp sets still place exact boundaries correctly', () => {
  const validated = validateHouseCuspSet({ ...context, cusps });
  assert.equal(validated.cusps.length, 12);
  assert.equal(locateLongitudeInHouses(30, validated.cusps).house, 2);
  assert.equal(locateLongitudeInHouses(359, validated.cusps).house, 12);
});
