import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateNatalWithProvider } from '../src/index.mjs';

const base = {
  datetimeUtc: '2026-11-11T12:00:00Z',
  latitudeDeg: 43.77,
  longitudeDegEast: 11.25,
  bodyNames: ['SUN']
};
const metadata = { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' };

for (const [field, value] of [
  ['longitudeDeg', NaN], ['longitudeDeg', Infinity],
  ['longitudeDeg', '12'], ['latitudeDeg', undefined],
  ['latitudeDeg', -Infinity], ['latitudeDeg', null]
]) {
  test(`malformed provider ${field}=${String(value)} is INVALID_EPHEMERIS_RESULT`, async () => {
    const state = { longitudeDeg: 12, latitudeDeg: 0, metadata, [field]: value };
    await assert.rejects(
      calculateNatalWithProvider({
        ...base,
        provider: { async getGeocentricEcliptic() { return state; } }
      }),
      error => error instanceof AstrologyError && error.code === 'INVALID_EPHEMERIS_RESULT'
    );
  });
}

test('valid finite provider coordinates still produce a synthetic natal body', async () => {
  const chart = await calculateNatalWithProvider({
    ...base,
    provider: { async getGeocentricEcliptic() {
      return { longitudeDeg: -5, latitudeDeg: 2, metadata };
    } }
  });
  assert.equal(chart.bodies.SUN.longitudeDeg, 355);
  assert.equal(chart.bodies.SUN.latitudeDeg, 2);
});
