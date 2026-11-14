import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNatalWithProvider, placeNatalBodiesInHouses,
} from 'astrological-functions/ephemeris-provider';
import { signedAngularDistance, normalize360, calculateCrossAspects } from 'astrological-functions';

const boundary = 359.99999999999994; // last representable binary64 longitude before 360
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic-engine', kernelSetId: 'synthetic-kernel',
  timeModel: 'synthetic-time',
});
const chartInput = Object.freeze({
  datetimeUtc: '2026-11-14T12:00:00Z',
  latitudeDeg: 44.8, longitudeDegEast: 11.9, bodyNames: ['Sun', 'Moon'],
});
const cusps = Object.freeze(Array.from({ length: 12 }, (_unused, index) => index * 30));

test('public ESM adapter preserves F1 binary64 seam and F2 validated provenance', async () => {
  const requests = [];
  let metadataReads = 0;
  const chart = await calculateNatalWithProvider({
    ...chartInput,
    provider: { async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: request.bodyName === 'Sun' ? boundary : 0,
        latitudeDeg: 0,
        metadata: { ...metadata, get kernelSetId() {
          metadataReads++;
          return 'synthetic-kernel';
        } },
      };
    } },
  });
  assert.equal(normalize360(boundary), boundary);
  assert.equal(chart.bodies.Sun.zodiacSignIndex, 11);
  assert.equal(chart.bodies.Sun.longitudeDeg, boundary);
  assert.equal(chart.bodies.Moon.zodiacSignIndex, 0);
  assert.equal(signedAngularDistance(boundary, 0), 360 - boundary);
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(Object.isFrozen));
  assert.equal(metadataReads, 2);
  assert.equal(chart.ephemerisProvenance.kernelSetId, 'synthetic-kernel');
  assert.equal(Object.isFrozen(chart.bodies.Sun.ephemerisMetadata), true);
  assert.equal(chart.houses, null);
  const placement = placeNatalBodiesInHouses({
    chart, birthTimeKnown: true,
    cuspSet: {
      houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1', cusps,
      metadata: {
        houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL',
        datetimeUtc: chartInput.datetimeUtc,
        latitudeDeg: chartInput.latitudeDeg,
        longitudeDegEast: chartInput.longitudeDegEast,
        ephemerisProvenance: chart.ephemerisProvenance,
      },
    },
  });
  assert.equal(placement.placements.Sun.house, 12);
  assert.equal(placement.placements.Moon.house, 1);
  const [aspect] = calculateCrossAspects({
    direction: 'SKY_TO_NATAL',
    sourcePoints: [{ name: 'Sun', longitudeDeg: boundary }],
    targetPoints: [{ name: 'Moon', longitudeDeg: 0 }],
    aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 1 }],
  });
  assert.equal(aspect.actualAngleDeg, 360 - boundary);
});

test('public ESM adapter fails closed on geometric J2000, even at zodiac seam', async () => {
  const requests = [];
  await assert.rejects(calculateNatalWithProvider({
    ...chartInput,
    provider: { async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: boundary, latitudeDeg: 0,
        metadata: { ...metadata, frame: 'J2000', corrections: 'GEOMETRIC' },
      };
    } },
  }), { code: 'INCOMPATIBLE_EPHEMERIS' });
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun']);
  assert.equal(Object.isFrozen(requests[0]), true);
});
