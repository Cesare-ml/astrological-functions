import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider, placeNatalBodiesInHouses } from '../src/index.mjs';

// Synthetic F1/F2/F3 integration. The Rust ephemeris and real cusps remain external.
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModel: 'synthetic',
});
const context = Object.freeze({
  datetimeUtc: '2026-11-14T12:00:00Z', latitudeDeg: 44.8, longitudeDegEast: 11.9,
});
async function chartFrom(longitudes) {
  const requests = [];
  const chart = await calculateNatalWithProvider({
    ...context, bodyNames: Object.keys(longitudes),
    provider: { async getGeocentricEcliptic(request) {
      requests.push(request);
      return {longitudeDeg: longitudes[request.bodyName], latitudeDeg: 0, metadata};
    } },
  });
  assert.equal(requests.length, Object.keys(longitudes).length);
  assert.ok(requests.every(Object.isFrozen));
  return chart;
}
function cuspSet(chart, start) {
  return {
    houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1',
    cusps: Array.from({length: 12}, (_, i) => (start + i * 30) % 360),
    metadata: {houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL',
      ...context, ephemerisProvenance: chart.ephemerisProvenance},
  };
}

test('synthetic provider keeps ULPs before/on/after 30-degree cusp distinct', async () => {
  const chart = await chartFrom({
    Sun: 29.999999999999996, Moon: 30, Mars: 30.000000000000004,
  });
  const houses = placeNatalBodiesInHouses({chart, cuspSet: cuspSet(chart, 30),
    birthTimeKnown: true});
  assert.equal(houses.placements.Sun.house, 12);
  assert.equal(houses.placements.Moon.house, 1);
  assert.equal(houses.placements.Mars.house, 1);
  assert.equal(chart.houses, null);
  assert.ok(Object.isFrozen(houses.placements));
});

test('synthetic provider retains last Pisces longitude before 0 degrees', async () => {
  const near360 = 359.99999999999994;
  const chart = await chartFrom({Sun: near360, Moon: 0});
  const houses = placeNatalBodiesInHouses({chart, cuspSet: cuspSet(chart, 0),
    birthTimeKnown: true});
  assert.equal(chart.bodies.Sun.longitudeDeg, near360);
  assert.equal(chart.bodies.Sun.zodiacSignIndex, 11);
  assert.equal(houses.placements.Sun.house, 12);
  assert.equal(houses.placements.Moon.house, 1);
});

test('birth-time gate remains mandatory with ULP-safe cusp geometry', async () => {
  const chart = await chartFrom({Sun: 29.999999999999996});
  assert.throws(() => placeNatalBodiesInHouses({
    chart, cuspSet: cuspSet(chart, 30), birthTimeKnown: false,
  }), {code: 'BIRTH_TIME_REQUIRED'});
});
