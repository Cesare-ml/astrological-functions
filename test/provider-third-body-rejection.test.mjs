import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A late provider failure must never return a partially assembled natal chart.
test('third-body provider failure propagates without a partial chart', async () => {
  const calls = [];
  const failure = new Error('synthetic Rust bridge failure');
  const provider = {
    async getGeocentricEcliptic(request) {
      calls.push(request);
      if (request.bodyName === 'Mars') throw failure;
      return {
        longitudeDeg: request.bodyName === 'Sun' ? 10 : 20,
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
  assert.deepEqual(calls.map(request => request.bodyName), ['Sun', 'Moon', 'Mars']);
  assert.ok(calls.every(Object.isFrozen));
  assert.ok(calls.every(request =>
    request.frame === 'ECLIPTIC_OF_DATE' && request.corrections === 'APPARENT'
  ));
});
