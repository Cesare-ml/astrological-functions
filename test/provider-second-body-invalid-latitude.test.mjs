import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A malformed second response must fail closed before the third body is requested.
// This is a synthetic provider contract test, not an astronomical accuracy test.
test('invalid second-body latitude stops the public ESM natal assembly', async () => {
  const requests = [];
  await assert.rejects(
    calculateNatalWithProvider({
      datetimeUtc: '2026-11-14T00:00:00Z',
      latitudeDeg: 45,
      longitudeDegEast: 11,
      bodyNames: ['Sun', 'Moon', 'Mars'],
      provider: {
        async getGeocentricEcliptic(request) {
          requests.push(request);
          return {
            longitudeDeg: 15,
            latitudeDeg: request.bodyName === 'Moon' ? 91 : 0,
            metadata: {
              center: 'EARTH',
              frame: 'ECLIPTIC_OF_DATE',
              corrections: 'APPARENT',
              engineVersion: 'synthetic',
              kernelSetId: 'synthetic',
              timeModel: 'synthetic'
            }
          };
        }
      }
    }),
    { code: 'INVALID_EPHEMERIS_RESULT' }
  );
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.equal(requests.every(Object.isFrozen), true);
  assert.deepEqual(requests.map(request => request.corrections), ['APPARENT', 'APPARENT']);
  assert.deepEqual(requests.map(request => request.frame), ['ECLIPTIC_OF_DATE', 'ECLIPTIC_OF_DATE']);
});
