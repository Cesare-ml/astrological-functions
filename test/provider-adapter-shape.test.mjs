import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider, AstrologyError } from '../src/index.mjs';

const input = {
  datetimeUtc: '2026-11-11T12:00:00Z',
  latitudeDeg: 43.77,
  longitudeDegEast: 11.25,
  bodyNames: ['SUN']
};

test('array-shaped provider with a forged method is rejected before invocation', async () => {
  const provider = [];
  let called = false;
  provider.getGeocentricEcliptic = async () => {
    called = true;
    return {};
  };
  await assert.rejects(
    calculateNatalWithProvider({ ...input, provider }),
    error => error instanceof AstrologyError && error.code === 'MISSING_PROVIDER'
  );
  assert.equal(called, false);
});

test('ordinary object provider remains supported', async () => {
  const provider = {
    async getGeocentricEcliptic() {
      return {
        longitudeDeg: 10,
        latitudeDeg: 0,
        metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
      };
    }
  };
  const chart = await calculateNatalWithProvider({ ...input, provider });
  assert.equal(chart.bodies.SUN.longitudeDeg, 10);
  assert.equal(chart.houses, null);
});
