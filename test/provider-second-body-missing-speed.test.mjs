import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// A missing rate is not a zero rate: it must remain explicitly unavailable.
test('missing Moon longitude speed remains null without changing other body rates', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: request.bodyName === 'Moon' ? 125 : 12,
        latitudeDeg: 0,
        ...(request.bodyName === 'Moon' ? {} : { longitudeSpeedDegPerDay: 0.75 }),
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
  const chart = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-15T00:00:00Z',
    latitudeDeg: 45,
    longitudeDegEast: 11,
    bodyNames: ['Sun', 'Moon', 'Mars'],
    provider
  });
  assert.equal(chart.bodies.Moon.longitudeSpeedDegPerDay, null);
  assert.equal(chart.bodies.Sun.longitudeSpeedDegPerDay, 0.75);
  assert.equal(chart.bodies.Mars.longitudeSpeedDegPerDay, 0.75);
  assert.deepEqual(requests.map(({ bodyName }) => bodyName), ['Sun', 'Moon', 'Mars']);
  assert.ok(requests.every(Object.isFrozen));
});
