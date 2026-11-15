import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateNatalWithProvider } from '../src/index.mjs';

const base = {
  datetimeUtc: '2026-11-11T12:00:00Z',
  latitudeDeg: 44.8,
  longitudeDegEast: 11.6
};

test('sparse body identifier arrays are rejected before invoking ephemeris', async () => {
  let calls = 0;
  const provider = { getGeocentricEcliptic: async () => { calls++; throw Error('unexpected call'); } };
  for (const bodyNames of [new Array(1), ['SUN', , 'MOON']]) {
    await assert.rejects(
      calculateNatalWithProvider({ ...base, bodyNames, provider }),
      error => error instanceof AstrologyError && error.code === 'INVALID_BODIES'
    );
  }
  assert.equal(calls, 0);
});

test('dense identifiers still reach the injected provider', async () => {
  const requested = [];
  const provider = { getGeocentricEcliptic: async request => {
    requested.push(request.bodyName);
    return { longitudeDeg: 10, latitudeDeg: 0, metadata: {
      center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT'
    } };
  } };
  const chart = await calculateNatalWithProvider({
    ...base, bodyNames: ['SUN', 'MOON'], provider
  });
  assert.deepEqual(requested, ['SUN', 'MOON']);
  assert.deepEqual(Object.keys(chart.bodies), ['SUN', 'MOON']);
});
