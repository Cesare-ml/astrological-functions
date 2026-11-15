import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// Synthetic inputs only. Astronomy belongs to VirgoStars Ephemeris (Rust).
// A provider may expose accessors or mutate objects: charts must contain
// exactly the fields that passed validation, not a second unvetted read.
const baseMetadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'mock-engine', kernelSetId: 'mock-kernel', timeModel: 'mock-time',
});

function calculate(provider, bodyNames = ['Sun']) {
  return calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T00:00:00Z',
    latitudeDeg: 45, longitudeDegEast: 11, bodyNames, provider,
  });
}

test('provider metadata center getter is read once before publication', async () => {
  let reads = 0;
  const metadata = {
    ...baseMetadata,
    get center() { return ++reads === 1 ? 'EARTH' : 'SUN'; },
  };
  const chart = await calculate({
    async getGeocentricEcliptic() {
      return { longitudeDeg: 25, latitudeDeg: 0, metadata };
    },
  });
  assert.equal(reads, 1);
  assert.equal(chart.bodies.Sun.ephemerisMetadata.center, 'EARTH');
  assert.equal(Object.isFrozen(chart.bodies.Sun.ephemerisMetadata), true);
});

test('engine/kernel/time provenance agrees with the single frozen metadata snapshot', async () => {
  for (const key of ['engineVersion', 'kernelSetId', 'timeModel']) {
    let reads = 0;
    const metadata = {
      ...baseMetadata,
      get [key]() { return ++reads === 1 ? 'approved' : 'unapproved'; },
    };
    const chart = await calculate({
      async getGeocentricEcliptic() {
        return { longitudeDeg: 25, latitudeDeg: 0, metadata };
      },
    });
    assert.equal(reads, 1, key);
    assert.equal(chart.bodies.Sun.ephemerisMetadata[key], 'approved', key);
    assert.equal(chart.ephemerisProvenance[key], 'approved', key);
  }
});

test('longitude, latitude, and longitude speed are read only once each', async () => {
  const counts = { longitude: 0, latitude: 0, speed: 0 };
  const state = {
    metadata: baseMetadata,
    get longitudeDeg() { return ++counts.longitude === 1 ? 370 : Number.NaN; },
    get latitudeDeg() { return ++counts.latitude === 1 ? 15 : Infinity; },
    get longitudeSpeedDegPerDay() { return ++counts.speed === 1 ? -0.5 : Infinity; },
  };
  const chart = await calculate({
    async getGeocentricEcliptic() { return state; },
  });
  assert.deepEqual(counts, { longitude: 1, latitude: 1, speed: 1 });
  assert.equal(chart.bodies.Sun.longitudeDeg, 10);
  assert.equal(chart.bodies.Sun.latitudeDeg, 15);
  assert.equal(chart.bodies.Sun.longitudeSpeedDegPerDay, -0.5);
});

test('invalid first metadata read is rejected, even if a second read would be valid', async () => {
  let reads = 0;
  const metadata = {
    ...baseMetadata,
    get frame() { return ++reads === 1 ? 'ECLIPTIC_J2000' : 'ECLIPTIC_OF_DATE'; },
  };
  const requests = [];
  await assert.rejects(calculate({
    async getGeocentricEcliptic(request) {
      requests.push(request.bodyName);
      return { longitudeDeg: 25, latitudeDeg: 0, metadata };
    },
  }, ['Sun', 'Moon']), { code: 'INCOMPATIBLE_EPHEMERIS' });
  assert.equal(reads, 1);
  assert.deepEqual(requests, ['Sun']);
});

test('state metadata object reference is read once', async () => {
  let reads = 0;
  const state = {
    longitudeDeg: 25, latitudeDeg: 0,
    get metadata() {
      return ++reads === 1 ? baseMetadata : { ...baseMetadata, center: 'SUN' };
    },
  };
  const chart = await calculate({
    async getGeocentricEcliptic() { return state; },
  });
  assert.equal(reads, 1);
  assert.equal(chart.bodies.Sun.ephemerisMetadata.center, 'EARTH');
});

test('shared provider metadata changing across bodies is rejected deterministically', async () => {
  let reads = 0;
  const metadata = {
    ...baseMetadata,
    get kernelSetId() { return ++reads === 1 ? 'kernel-A' : 'kernel-B'; },
  };
  const requests = [];
  await assert.rejects(calculate({
    async getGeocentricEcliptic(request) {
      requests.push(request.bodyName);
      return { longitudeDeg: 25, latitudeDeg: 0, metadata };
    },
  }, ['Sun', 'Moon']), { code: 'INCONSISTENT_EPHEMERIS' });
  assert.equal(reads, 2);
  assert.deepEqual(requests, ['Sun', 'Moon']);
});

test('inherited-only metadata fields cannot bypass snapshot validation', async () => {
  const inherited = Object.create(baseMetadata);
  await assert.rejects(calculate({
    async getGeocentricEcliptic() {
      return { longitudeDeg: 25, latitudeDeg: 0, metadata: inherited };
    },
  }), { code: 'INCOMPATIBLE_EPHEMERIS' });
});
