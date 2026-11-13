/**
 * Consumer-facing ESM self-reference smoke. Execute with Node 20+:
 * node --test test/lunar-consumer-esm.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLunarElongationSectors } from 'astrological-functions/lunar-elongation';
import { calculateLunarElongationWithProvider } from 'astrological-functions/lunar-provider';

const expected = Object.freeze({
  engineVersion: 'mock-1',
  kernelSetId: 'synthetic-only',
  timeModelId: 'synthetic-time-v1',
});
const utc = '2026-11-13T12:30:00Z';

test('both installed-package-style ESM subpaths resolve independently', () => {
  const geometryUrl = import.meta.resolve('astrological-functions/lunar-elongation');
  const providerUrl = import.meta.resolve('astrological-functions/lunar-provider');
  assert.match(geometryUrl, /\/src\/lunar-elongation\.mjs$/);
  assert.match(providerUrl, /\/src\/lunar-elongation-provider\.mjs$/);
  assert.notEqual(geometryUrl, providerUrl);
  assert.equal(typeof calculateLunarElongationSectors, 'function');
  assert.equal(typeof calculateLunarElongationWithProvider, 'function');
});

test('injected provider agrees with public standalone geometry subpath', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: request.bodyName === 'Sun' ? 350 : 80,
        latitudeDeg: request.bodyName === 'Sun' ? 0 : 4.5,
        metadata: {
          bodyName: request.bodyName,
          datetimeUtc: request.datetimeUtc,
          center: 'EARTH',
          frame: 'ECLIPTIC_OF_DATE',
          corrections: 'APPARENT',
          ...expected,
        },
      };
    },
  };
  const result = await calculateLunarElongationWithProvider({
    datetimeUtc: utc,
    zodiac: 'TROPICAL',
    expectedEphemeris: expected,
    provider,
  });
  const directlyCalculated = calculateLunarElongationSectors({
    sunLongitudeDeg: result.positions.Sun.longitudeDeg,
    moonLongitudeDeg: result.positions.Moon.longitudeDeg,
    context: result.sectors.context,
  });
  assert.deepEqual(result.sectors, directlyCalculated);
  assert.equal(result.sectors.sectorId, 'FIRST_QUARTER');
  assert.deepEqual(requests.map(({ bodyName }) => bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(request => request.kernelSetId === expected.kernelSetId));
  assert.ok(requests.every(request => request.timeModelId === expected.timeModelId));
});
