import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A Rust/WASM adapter must return numeric longitude; no implicit string coercion.
test('second-body longitude string fails closed without querying the third body', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: request.bodyName === 'Moon' ? '12' : 12,
        latitudeDeg: 0,
        longitudeSpeedDegPerDay: 0,
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
