import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

const base = { datetimeUtc: '2026-11-10T12:00:00Z', latitudeDeg: 44,
  longitudeDegEast: 12, bodyNames: ['Sun', 'Moon'] };
const required = { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' };

test('natal result exposes immutable consistent provenance without astronomy', async () => {
  const meta = { ...required, engineVersion: 'rust-test', kernelSetId: 'mock-kernel',
    timeModel: 'TDB-test' };
  const provider = { async getGeocentricEcliptic() {
    return { longitudeDeg: 45, latitudeDeg: 0, metadata: { ...meta } };
  }};
  const result = await calculateNatalWithProvider({ ...base, provider });
  assert.deepEqual(result.ephemerisProvenance,
    { engineVersion: 'rust-test', kernelSetId: 'mock-kernel', timeModel: 'TDB-test' });
  assert.equal(Object.isFrozen(result.ephemerisProvenance), true);
  assert.throws(() => { result.ephemerisProvenance.kernelSetId = 'changed'; }, TypeError);
  assert.equal(result.bodies.Moon.ephemerisMetadata.kernelSetId, 'mock-kernel');
  assert.equal(result.houses, null);
});

test('unavailable provider provenance is represented by explicit nulls', async () => {
  const provider = { async getGeocentricEcliptic() {
    return { longitudeDeg: 0, latitudeDeg: 0, metadata: { ...required } };
  }};
  const result = await calculateNatalWithProvider({ ...base, provider });
  assert.deepEqual(result.ephemerisProvenance,
    { engineVersion: null, kernelSetId: null, timeModel: null });
});
