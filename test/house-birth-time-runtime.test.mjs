import test from 'node:test';
import assert from 'node:assert/strict';
import { placeNatalBodiesInHouses } from '../src/index.mjs';

// Synthetic chart and cusps: these tests validate the API gate, not astronomy.
const provenance = Object.freeze({ engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModel: 'synthetic' });
const chart = {
  datetimeUtc: '2026-01-01T00:00:00Z', latitudeDeg: 0, longitudeDegEast: 0,
  ephemerisProvenance: provenance,
  bodies: { Sun: { name: 'Sun', longitudeDeg: 15 } },
};
const cuspSet = {
  houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1',
  cusps: Array.from({ length: 12 }, (_, i) => i * 30),
  metadata: {
    houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL',
    datetimeUtc: chart.datetimeUtc, latitudeDeg: chart.latitudeDeg,
    longitudeDegEast: chart.longitudeDegEast, ephemerisProvenance: provenance,
  },
};

test('house placement rejects unknown or absent birth time before using cusps', () => {
  for (const birthTimeKnown of [false, undefined, null, 0, 'true']) {
    assert.throws(
      () => placeNatalBodiesInHouses({ chart, cuspSet, birthTimeKnown }),
      error => error.code === 'BIRTH_TIME_REQUIRED',
    );
  }
  assert.throws(
    () => placeNatalBodiesInHouses({ chart, cuspSet }),
    error => error.code === 'BIRTH_TIME_REQUIRED',
  );
});

test('explicitly known birth time permits context-matched geometric placement', () => {
  const result = placeNatalBodiesInHouses({ chart, cuspSet, birthTimeKnown: true });
  assert.equal(result.placements.Sun.house, 1);
  assert.equal(result.placementMethod, 'CUSP_INTERVAL');
  assert.equal(Object.isFrozen(result.placements), true);
});

test('matching coordinates cannot override a mismatched ephemeris kernel', () => {
  const wrong = {
    ...cuspSet,
    metadata: {
      ...cuspSet.metadata,
      ephemerisProvenance: { ...provenance, kernelSetId: 'other-kernel' },
    },
  };
  assert.throws(
    () => placeNatalBodiesInHouses({ chart, cuspSet: wrong, birthTimeKnown: true }),
    error => error.code === 'INCOMPATIBLE_HOUSE_CONTEXT',
  );
});
