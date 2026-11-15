import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A provider may re-enter caller code while an awaited body lookup is pending.
// The natal request must use its original validated body identifiers throughout.
test('provider cannot change pending natal body selection by mutating caller array', async () => {
  const bodyNames = ['Sun', 'Moon', 'Mars'];
  const calls = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      calls.push(request);
      if (request.bodyName === 'Sun') {
        bodyNames.splice(1, 2, 'Venus', 'Jupiter');
      }
      return {
        longitudeDeg: 15,
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
  const chart = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-15T00:00:00Z',
    latitudeDeg: 45,
    longitudeDegEast: 11,
    bodyNames,
    provider
  });
  assert.deepEqual(bodyNames, ['Sun', 'Venus', 'Jupiter']);
  assert.deepEqual(calls.map(call => call.bodyName), ['Sun', 'Moon', 'Mars']);
  assert.deepEqual(Object.keys(chart.bodies), ['Sun', 'Moon', 'Mars']);
  assert.ok(calls.every(Object.isFrozen));
  assert.ok(calls.every(call =>
    call.frame === 'ECLIPTIC_OF_DATE' && call.corrections === 'APPARENT'
  ));
});
