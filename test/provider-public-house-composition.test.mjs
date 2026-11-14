import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNatalWithProvider,
  placeNatalBodiesInHouses,
} from 'astrological-functions/ephemeris-provider';

// Contract-only fixture: no real astronomy or substitute Swiss calculation.
const provenance = Object.freeze({
  engineVersion: 'mock-engine-v1',
  kernelSetId: 'mock-kernel-v1',
  timeModel: 'mock-time-v1',
});
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  ...provenance,
});
const cusps = Object.freeze(Array.from({ length: 12 }, (_, i) => i * 30));

async function makeChart(meta = metadata) {
  const requests = [];
  const chart = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T00:00:00Z',
    latitudeDeg: 45, longitudeDegEast: 11,
    bodyNames: ['Sun', 'Moon'],
    provider: {
      async getGeocentricEcliptic(request) {
        requests.push(request);
        return { longitudeDeg: request.bodyName === 'Sun' ? 15 : 345,
          latitudeDeg: 0, metadata: meta };
      },
    },
  });
  return { chart, requests };
}

function makeCuspSet(chart, overrides = {}) {
  return {
    houseSystem: 'PLACIDUS', calculationProfile: 'CANONICAL_V1', cusps,
    metadata: {
      houseSystem: 'PLACIDUS', placementMethod: 'CUSP_INTERVAL',
      datetimeUtc: chart.datetimeUtc, latitudeDeg: chart.latitudeDeg,
      longitudeDegEast: chart.longitudeDegEast,
      ephemerisProvenance: { ...provenance },
      ...overrides,
    },
  };
}

const place = (chart, cuspSet, birthTimeKnown = true) =>
  placeNatalBodiesInHouses({ chart, cuspSet, birthTimeKnown });

test('public provider composes a chart with externally sourced, context-matched cusps', async () => {
  const { chart, requests } = await makeChart();
  assert.deepEqual(requests.map(r => r.bodyName), ['Sun', 'Moon']);
  assert.equal(requests.every(Object.isFrozen), true);
  assert.equal(chart.houses, null);
  const result = place(chart, makeCuspSet(chart));
  assert.equal(result.houseSystem, 'PLACIDUS');
  assert.equal(result.placementMethod, 'CUSP_INTERVAL');
  assert.equal(result.placements.Sun.house, 1);
  assert.equal(result.placements.Moon.house, 12);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.placements), true);
  assert.equal(Object.isFrozen(result.metadata), true);
  assert.equal(chart.houses, null);
  assert.deepEqual(result.metadata.ephemerisProvenance, provenance);
});

test('public assembly fails closed when any provenance key changes', async () => {
  const { chart } = await makeChart();
  for (const key of Object.keys(provenance)) {
    const set = makeCuspSet(chart, {
      ephemerisProvenance: { ...provenance, [key]: `${provenance[key]}-different` },
    });
    assert.throws(() => place(chart, set), { code: 'INCOMPATIBLE_HOUSE_CONTEXT' }, key);
  }
});

test('public assembly refuses UTC and geographical context drift', async () => {
  const { chart } = await makeChart();
  for (const changed of [
    { datetimeUtc: '2026-11-15T00:00:00Z' },
    { latitudeDeg: 46 },
    { longitudeDegEast: 12 },
  ]) {
    assert.throws(() => place(chart, makeCuspSet(chart, changed)),
      { code: 'INCOMPATIBLE_HOUSE_CONTEXT' }, JSON.stringify(changed));
  }
});

test('house policy stays explicit for the public provider adapter', async () => {
  const { chart } = await makeChart();
  assert.throws(() => place(chart, makeCuspSet(chart, { houseSystem: 'VEHLOW' })),
    { code: 'INCOMPATIBLE_HOUSE_SYSTEM' });
  assert.throws(() => place(chart, makeCuspSet(chart, { placementMethod: 'LEGACY_HOUSES_POS' })),
    { code: 'UNSUPPORTED_HOUSE_PLACEMENT' });
});

test('invalid cusp geometry cannot be used for an otherwise valid natal chart', async () => {
  const { chart } = await makeChart();
  const set = { ...makeCuspSet(chart), cusps: Array(12).fill(0) };
  assert.throws(() => place(chart, set), { code: 'INVALID_CUSPS' });
});

test('legacy mock without provenance cannot be silently combined with real cusp metadata', async () => {
  const { chart } = await makeChart({
    center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  });
  assert.deepEqual(chart.ephemerisProvenance,
    { engineVersion: null, kernelSetId: null, timeModel: null });
  assert.throws(() => place(chart, makeCuspSet(chart)), { code: 'INVALID_HOUSE_METADATA' });
});
