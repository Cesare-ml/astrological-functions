import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize360, zodiacSignIndex, signedAngularDistance,
  calculateCrossAspects, calculateNatalWithProvider,
  placeNatalBodiesInHouses,
} from '../src/index.mjs';

// Synthetic F1 precision + F2 provider integration, not a JPL reference test.
const beforeAries = 359.99999999999994;
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic-v1', kernelSetId: 'synthetic-kernel', timeModel: 'synthetic-utc',
});
const request = Object.freeze({
  datetimeUtc: '2026-11-14T12:00:00Z', latitudeDeg: 44.8,
  longitudeDegEast: 11.9, bodyNames: ['Sun', 'Moon'],
});
const cusps = Array.from({ length: 12 }, (_, index) => index * 30);

test('F1 precision survives F2 hardened provider in a natal result', async () => {
  const chart = await calculateNatalWithProvider({ ...request, provider: {
    getGeocentricEcliptic: async ({ bodyName }) => ({
      longitudeDeg: bodyName === 'Sun' ? beforeAries : 0, latitudeDeg: 0, metadata,
    }),
  } });
  assert.equal(normalize360(beforeAries), beforeAries);
  assert.equal(zodiacSignIndex(beforeAries), 11);
  assert.equal(chart.bodies.Sun.longitudeDeg, beforeAries);
  assert.equal(chart.bodies.Sun.zodiacSignIndex, 11);
  assert.equal(chart.bodies.Moon.zodiacSignIndex, 0);
  assert.equal(Object.getPrototypeOf(chart.bodies), null);
  assert.equal(chart.ephemerisProvenance.kernelSetId, 'synthetic-kernel');
  assert.equal(Object.isFrozen(chart.bodies), true);
  assert.equal(chart.houses, null);
});

test('F1 signed residual survives F2 directional aspect calculation', () => {
  const tiny = 360 - beforeAries;
  assert.equal(signedAngularDistance(beforeAries, 0), tiny);
  assert.equal(signedAngularDistance(0, beforeAries), -tiny);
  const [fact] = calculateCrossAspects({
    direction: 'SKY_TO_NATAL',
    sourcePoints: [{ name: 'Sun', longitudeDeg: beforeAries }],
    targetPoints: [{ name: 'Moon', longitudeDeg: 0 }],
    aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 1 }],
  });
  assert.equal(fact.actualAngleDeg, tiny);
  assert.equal(fact.absoluteOrbDeg, tiny);
  assert.equal(fact.direction, 'SKY_TO_NATAL');
});

test('F2 context-matched geometric houses preserve final Pisces ULP', async () => {
  const chart = await calculateNatalWithProvider({ ...request, provider: {
    getGeocentricEcliptic: async ({ bodyName }) => ({
      longitudeDeg: bodyName === 'Sun' ? beforeAries : 0, latitudeDeg: 0, metadata,
    }),
  } });
  const cuspSet = {
    houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1', cusps,
    metadata: {
      houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL',
      datetimeUtc: request.datetimeUtc, latitudeDeg: request.latitudeDeg,
      longitudeDegEast: request.longitudeDegEast,
      ephemerisProvenance: chart.ephemerisProvenance,
    },
  };
  const placed = placeNatalBodiesInHouses({ chart, cuspSet, birthTimeKnown: true });
  assert.equal(placed.placements.Sun.house, 12);
  assert.equal(placed.placements.Moon.house, 1);
  assert.equal(Object.isFrozen(placed.placements), true);
  assert.equal(chart.houses, null);
  assert.throws(() => placeNatalBodiesInHouses({ chart, cuspSet, birthTimeKnown: false }),
    error => error.code === 'BIRTH_TIME_REQUIRED');
});

test('F2 provider rejects geometric J2000 and never downgrades to apparent', async () => {
  await assert.rejects(calculateNatalWithProvider({ ...request, provider: {
    getGeocentricEcliptic: async () => ({
      longitudeDeg: beforeAries, latitudeDeg: 0,
      metadata: { ...metadata, frame: 'J2000', corrections: 'GEOMETRIC' },
    }),
  } }), error => error.code === 'INCOMPATIBLE_EPHEMERIS');
});
