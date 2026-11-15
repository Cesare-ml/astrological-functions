import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// Provenance must be consistent even when one response omits it entirely.
test('second body cannot silently drop the pinned ephemeris provenance', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: request.bodyName === 'Moon' ? 125 : 12,
        latitudeDeg: 0,
        metadata: {
          center: 'EARTH',
          frame: 'ECLIPTIC_OF_DATE',
          corrections: 'APPARENT',
          ...(request.bodyName === 'Moon' ? {} : {
            engineVersion: 'synthetic-rust-1',
            kernelSetId: 'synthetic-kernel-1',
            timeModel: 'synthetic-time-1'
          })
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
    error => error?.code === 'INCONSISTENT_EPHEMERIS'
  );
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(Object.isFrozen));
  assert.ok(requests.every(request =>
    request.frame === 'ECLIPTIC_OF_DATE' && request.corrections === 'APPARENT'
  ));
});
