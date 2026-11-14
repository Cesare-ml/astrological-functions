import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateNatalWithProvider } from '../src/index.mjs';

const input = {
  datetimeUtc: '2026-11-11T12:00:00Z',
  latitudeDeg: 44.8,
  longitudeDegEast: 11.6,
  bodyNames: ['SUN']
};

function provider(speed) {
  return {
    getGeocentricEcliptic: async () => ({
      longitudeDeg: 12,
      latitudeDeg: 0,
      longitudeSpeedDegPerDay: speed,
      metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
    })
  };
}

test('malformed optional provider speed has the ephemeris-result error code', async () => {
  for (const speed of ['1.2', NaN, Infinity, -Infinity, {}, []]) {
    await assert.rejects(
      calculateNatalWithProvider({ ...input, provider: provider(speed) }),
      error => error instanceof AstrologyError && error.code === 'INVALID_EPHEMERIS_RESULT'
    );
  }
});

test('valid, null and absent speed retain their existing semantics', async () => {
  for (const [speed, expected] of [[0, 0], [-0.25, -0.25], [null, null], [undefined, null]]) {
    const chart = await calculateNatalWithProvider({ ...input, provider: provider(speed) });
    assert.equal(chart.bodies.SUN.longitudeSpeedDegPerDay, expected);
  }
});
