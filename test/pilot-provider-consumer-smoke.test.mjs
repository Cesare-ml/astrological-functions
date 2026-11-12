import test from 'node:test';
import assert from 'node:assert/strict';

import * as adapter from '../src/ephemeris-provider.js';
import * as runtime from '../src/index.mjs';

// These are the runtime declarations in src/ephemeris-provider.d.ts.
// Import and identity checks intentionally use Node's native ESM resolver.
const declaredExports = [
  'calculateNatalWithProvider',
  'resolveHouseSystem',
  'resolveHousePlacementPolicy',
  'locateLongitudeWithHousePolicy',
  'validateHouseCuspSet',
  'validateHouseCuspContext',
  'placeNatalBodiesInHouses',
];

test('the declaration companion resolves as native ESM with the expected named exports', async () => {
  const resolved = await import('../src/ephemeris-provider.js');
  assert.deepEqual(Object.keys(resolved).sort(), [...declaredExports].sort());
  for (const name of declaredExports) {
    assert.equal(typeof resolved[name], 'function', name);
    assert.strictEqual(resolved[name], runtime[name], name);
    assert.strictEqual(adapter[name], runtime[name], name);
  }
});

test('package self-import keeps the root runtime identities without changing exports', async () => {
  // package.json exports "." to src/index.mjs (not this unexported subpath).
  const packageRoot = await import('astrological-functions');
  for (const name of declaredExports) {
    assert.strictEqual(packageRoot[name], adapter[name], name);
  }
});

test('ESM consumer uses the injected apparent-of-date provider unchanged', async () => {
  const requests = [];
  const result = await adapter.calculateNatalWithProvider({
    datetimeUtc: '2026-11-12T12:00:00Z',
    latitudeDeg: 43.75,
    longitudeDegEast: 11.25,
    bodyNames: Object.freeze(['Sun']),
    provider: {
      async getGeocentricEcliptic(request) {
        requests.push(request);
        assert.equal(Object.isFrozen(request), true);
        return {
          longitudeDeg: 370,
          latitudeDeg: 0.5,
          longitudeSpeedDegPerDay: -0.1,
          metadata: {
            center: 'EARTH',
            frame: 'ECLIPTIC_OF_DATE',
            corrections: 'APPARENT',
            engineVersion: 'synthetic-test',
            kernelSetId: 'synthetic-test',
            timeModel: 'synthetic-test',
          },
        };
      },
    },
  });
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    datetimeUtc: '2026-11-12T12:00:00Z',
    bodyName: 'Sun',
    corrections: 'APPARENT',
    frame: 'ECLIPTIC_OF_DATE',
  });
  assert.equal(result.contract, 'NatalChartResult');
  assert.equal(result.bodies.Sun.longitudeDeg, 10);
  assert.equal(result.bodies.Sun.longitudeSpeedDegPerDay, -0.1);
  assert.equal(result.bodies.Sun.zodiacSignIndex, 0);
  assert.deepEqual(result.ephemerisProvenance, {
    engineVersion: 'synthetic-test',
    kernelSetId: 'synthetic-test',
    timeModel: 'synthetic-test',
  });
  assert.equal(result.houses, null);
});

test('ESM consumer cannot silently fall back without a valid provider', async () => {
  const input = {
    datetimeUtc: '2026-11-12T12:00:00Z',
    latitudeDeg: 43.75,
    longitudeDegEast: 11.25,
    bodyNames: ['Sun'],
  };
  await assert.rejects(
    adapter.calculateNatalWithProvider(input),
    { name: 'AstrologyError', code: 'MISSING_PROVIDER' },
  );
  let calls = 0;
  await assert.rejects(
    adapter.calculateNatalWithProvider({
      ...input,
      provider: {
        async getGeocentricEcliptic() {
          calls += 1;
          return {
            longitudeDeg: 10,
            latitudeDeg: 0,
            metadata: {
              center: 'EARTH',
              frame: 'GEOMETRIC_J2000',
              corrections: 'GEOMETRIC',
            },
          };
        },
      },
    }),
    { name: 'AstrologyError', code: 'INCOMPATIBLE_EPHEMERIS' },
  );
  assert.equal(calls, 1);
});
