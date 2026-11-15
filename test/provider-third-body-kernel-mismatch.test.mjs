import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A late kernel switch must fail closed even when earlier bodies were valid.
test('third-body kernel mismatch rejects the whole natal chart', async () => {
  const calls = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      calls.push(request);
      return {
        longitudeDeg: request.bodyName === 'Sun' ? 10 : request.bodyName === 'Moon' ? 20 : 30,
        latitudeDeg: 0,
        metadata: {
          center: 'EARTH',
          frame: 'ECLIPTIC_OF_DATE',
          corrections: 'APPARENT',
          engineVersion: 'synthetic-rust',
          kernelSetId: request.bodyName === 'Mars' ? 'other-kernel' : 'pinned-kernel',
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
    error => error?.code === 'INCONSISTENT_EPHEMERIS'
  );
  assert.deepEqual(calls.map(request => request.bodyName), ['Sun', 'Moon', 'Mars']);
  assert.ok(calls.every(Object.isFrozen));
  assert.ok(calls.every(request =>
    request.frame === 'ECLIPTIC_OF_DATE' && request.corrections === 'APPARENT'
  ));
});
