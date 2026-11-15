import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A Rust/WASM adapter failure is not a missing astronomical value and must not
// be silently replaced with another source or a partially assembled chart.
test('second-body provider rejection propagates without requesting a third body', async () => {
  const requests = [];
  const failure = new Error('synthetic WASM kernel unavailable');
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      if (request.bodyName === 'Moon') throw failure;
      return {
        longitudeDeg: 12,
        latitudeDeg: 0,
        metadata: {
          center: 'EARTH',
          frame: 'ECLIPTIC_OF_DATE',
          corrections: 'APPARENT',
          engineVersion: 'synthetic-rust',
          kernelSetId: 'synthetic-kernel',
          timeModel: 'synthetic-time'
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
    error => error === failure
  );
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(Object.isFrozen));
  assert.ok(requests.every(request =>
    request.frame === 'ECLIPTIC_OF_DATE' && request.corrections === 'APPARENT'
  ));
});
