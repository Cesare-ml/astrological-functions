import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A Symbol must be rejected by the provider boundary, never coerced to a rate.
test('second-body Symbol longitude speed fails closed before requesting Mars', async () => {
  const requested = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requested.push(request);
      return {
        longitudeDeg: 12,
        latitudeDeg: 0,
        longitudeSpeedDegPerDay: request.bodyName === 'Moon' ? Symbol('stationary') : 0,
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
      datetimeUtc: '2026-11-15T00:00:00Z',
      latitudeDeg: 45,
      longitudeDegEast: 11,
      bodyNames: ['Sun', 'Moon', 'Mars'],
      provider
    }),
    { name: 'AstrologyError', code: 'INVALID_EPHEMERIS_RESULT' }
  );
  assert.deepEqual(requested.map(({ bodyName }) => bodyName), ['Sun', 'Moon']);
  assert.ok(requested.every(Object.isFrozen));
});
