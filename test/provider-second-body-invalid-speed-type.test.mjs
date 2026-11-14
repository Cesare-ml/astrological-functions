import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// The Rust/WASM adapter must never coerce a second body's velocity string.
test('invalid second-body longitude speed type fails closed before third request', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: 12,
        latitudeDeg: 0,
        longitudeSpeedDegPerDay: request.bodyName === 'Moon' ? '0' : 0,
        metadata: {
          center: 'EARTH',
          frame: 'ECLIPTIC_OF_DATE',
          corrections: 'APPARENT',
          engineVersion: 'synthetic-rust-1',
          kernelSetId: 'synthetic-kernel-1',
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
    { name: 'AstrologyError', code: 'INVALID_EPHEMERIS_RESULT' }
  );
  assert.deepEqual(requests.map(({ bodyName }) => bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(Object.isFrozen));
});
