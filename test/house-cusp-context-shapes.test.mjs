import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHouseCuspContext, AstrologyError } from '../src/index.mjs';

const provenance = { engineVersion: 'mock-1', kernelSetId: 'synthetic', timeModel: 'mock-utc' };
const chart = {
  datetimeUtc: '2026-11-11T10:00:00Z',
  latitudeDeg: 44, longitudeDegEast: 11,
  ephemerisProvenance: provenance
};
const cuspSet = {
  houseSystem: 'PLACIDUS', calculationProfile: 'CANONICAL_V1',
  cusps: Array.from({ length: 12 }, (_, i) => i * 30),
  metadata: {
    houseSystem: 'PLACIDUS', placementMethod: 'CUSP_INTERVAL',
    datetimeUtc: chart.datetimeUtc,
    latitudeDeg: chart.latitudeDeg, longitudeDegEast: chart.longitudeDegEast,
    ephemerisProvenance: provenance
  }
};

test('house context rejects array-shaped chart and cusp set', () => {
  for (const input of [{ chart: [], cuspSet }, { chart, cuspSet: [] }]) {
    assert.throws(() => validateHouseCuspContext(input),
      e => e instanceof AstrologyError && e.code === 'INVALID_ARGUMENT');
  }
});

test('house context rejects array-shaped provenance with typed metadata error', () => {
  for (const input of [
    { chart: { ...chart, ephemerisProvenance: [] }, cuspSet },
    { chart, cuspSet: { ...cuspSet, metadata: { ...cuspSet.metadata, ephemerisProvenance: [] } } }
  ]) {
    assert.throws(() => validateHouseCuspContext(input),
      e => e instanceof AstrologyError && e.code === 'INVALID_HOUSE_METADATA');
  }
});

test('matching synthetic house context still passes', () => {
  const result = validateHouseCuspContext({ chart, cuspSet });
  assert.equal(result.houseSystem, 'PLACIDUS');
  assert.equal(result.cusps.length, 12);
});
