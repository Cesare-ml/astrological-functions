import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHouseCuspSet, placeNatalBodiesInHouses } from '../src/index.mjs';

// Synthetic geometry only; no astronomical cusp generation or Swiss dependency.
const provenance = Object.freeze({
  engineVersion: 'fixture', kernelSetId: 'fixture', timeModel: 'fixture',
});
const datetimeUtc = '2026-01-01T00:00:00Z';
const cusps = Array.from({ length: 12 }, (_, i) => (345 + i * 30) % 360);
const cuspSet = {
  houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1', cusps,
  metadata: {
    houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL',
    datetimeUtc, latitudeDeg: 0, longitudeDegEast: 0,
    ephemerisProvenance: provenance,
  },
};

test('wrapped cusp boundaries assign exact cusp to the house beginning there', () => {
  const chart = {
    datetimeUtc, latitudeDeg: 0, longitudeDegEast: 0,
    ephemerisProvenance: provenance,
    bodies: {
      BeforeWrap: { name: 'BeforeWrap', longitudeDeg: 359.999 },
      AtZero: { name: 'AtZero', longitudeDeg: 0 },
      AtSecondCusp: { name: 'AtSecondCusp', longitudeDeg: 15 },
      AtFirstCusp: { name: 'AtFirstCusp', longitudeDeg: 345 },
    },
  };
  const result = placeNatalBodiesInHouses({ chart, cuspSet, birthTimeKnown: true });
  assert.equal(result.placements.BeforeWrap.house, 1);
  assert.equal(result.placements.AtZero.house, 1);
  assert.equal(result.placements.AtSecondCusp.house, 2);
  assert.equal(result.placements.AtSecondCusp.distanceFromCuspDeg, 0);
  assert.equal(result.placements.AtFirstCusp.house, 1);
  assert.equal(result.placements.AtFirstCusp.distanceFromCuspDeg, 0);
});

test('cusp normalization snapshots external mutable input without modifying it', () => {
  const original = [...cusps];
  const validated = validateHouseCuspSet(cuspSet);
  assert.deepEqual(cusps, original);
  assert.notStrictEqual(validated.cusps, cusps);
  assert.equal(Object.isFrozen(validated.cusps), true);
  cusps[0] = 300;
  assert.equal(validated.cusps[0], 345);
  cusps[0] = original[0];
});

test('duplicate and reverse cusp sequences fail closed', () => {
  for (const malformed of [
    [cusps[0], cusps[0], ...cusps.slice(2)],
    [...cusps].reverse(),
  ]) {
    assert.throws(
      () => validateHouseCuspSet({ ...cuspSet, cusps: malformed }),
      error => error.code === 'INVALID_CUSPS',
    );
  }
});
