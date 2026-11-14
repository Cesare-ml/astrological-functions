import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// Synthetic provenance gate: never combine positions from different Rust kernel sets.
test('second-body kernel mismatch rejects before requesting a third body', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: 12,
        latitudeDeg: 0,
        metadata: {
          center: 'EARTH',
          frame: 'ECLIPTIC_OF_DATE',
          corrections: 'APPARENT',
          engineVersion: 'synthetic-rust-1',
          kernelSetId: request.bodyName === 'Moon' ? 'kernel-B' : 'kernel-A',
          timeModel: 'synthetic-time-1'
        }
      };
    }
  };

  await assert.rejects(
    calculateNatalWithProvider({
      datetimeUtc: '2026-11-14T00:00:00Z',
      latitudeDeg: 45,
      longitudeDegEast: 11,
      bodyNames: ['Sun', 'Moon', 'Mars'],
      provider
    }),
    { name: 'AstrologyError', code: 'INCONSISTENT_EPHEMERIS' }
  );
  assert.deepEqual(requests.map(({ bodyName }) => bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(Object.isFrozen));
  assert.ok(requests.every(request =>
    request.frame === 'ECLIPTIC_OF_DATE' && request.corrections === 'APPARENT'));
});
