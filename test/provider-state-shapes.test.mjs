import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateNatalWithProvider } from '../src/index.mjs';

const base = {
  datetimeUtc: '2026-11-11T12:00:00Z',
  latitudeDeg: 44.8,
  longitudeDegEast: 11.6,
  bodyNames: ['SUN']
};

test('provider rejects array-shaped state and metadata before reading astronomy fields', async () => {
  const arrayState = [];
  arrayState.metadata = { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' };
  arrayState.longitudeDeg = 10;
  arrayState.latitudeDeg = 0;

  const arrayMetadata = [];
  Object.assign(arrayMetadata, { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' });

  for (const state of [
    arrayState,
    { longitudeDeg: 10, latitudeDeg: 0, metadata: arrayMetadata }
  ]) {
    await assert.rejects(
      calculateNatalWithProvider({
        ...base, provider: { getGeocentricEcliptic: async () => state }
      }),
      error => error instanceof AstrologyError && error.code === 'INCOMPATIBLE_EPHEMERIS'
    );
  }
});

test('ordinary object state with apparent-of-date metadata remains accepted', async () => {
  const chart = await calculateNatalWithProvider({
    ...base,
    provider: {
      getGeocentricEcliptic: async () => ({
        longitudeDeg: 10, latitudeDeg: 0,
        metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
      })
    }
  });
  assert.equal(chart.bodies.SUN.longitudeDeg, 10);
});
