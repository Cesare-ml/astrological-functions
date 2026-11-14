import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as adapter from '../src/ephemeris-provider.js';
import * as runtime from '../src/index.mjs';
import * as packageRoot from 'astrological-functions';
import * as packageProvider from 'astrological-functions/ephemeris-provider';

const declaredAdapterExports = [
    'calculateNatalWithProvider', 'resolveHouseSystem',
    'resolveHousePlacementPolicy', 'locateLongitudeWithHousePolicy',
    'validateHouseCuspSet', 'validateHouseCuspContext',
    'placeNatalBodiesInHouses'
];

test('typed provider adapter exposes exactly the declared ESM runtime surface', () => {
  assert.deepEqual(Object.keys(adapter).sort(), [...declaredAdapterExports].sort());
  for (const name of declaredAdapterExports) {
    assert.equal(typeof adapter[name], 'function', name);
    assert.strictEqual(adapter[name], runtime[name], name);
  }
});

test('package root self-import remains the existing runtime, not an astronomy fallback', () => {
  for (const name of declaredAdapterExports) {
    assert.strictEqual(packageRoot[name], adapter[name], name);
  }
});

test('unsupported house placement still fails closed through adapter', () => {
  assert.throws(
    () => adapter.resolveHousePlacementPolicy({
      houseSystem: 'VEHLOW',
      calculationProfile: 'VIRGOSTARS_LEGACY_V1',
      placementMethod: 'LEGACY_HOUSES_POS'
    }),
    { code: 'UNSUPPORTED_HOUSE_PLACEMENT' }
  );
});

test('provider subpath self-import resolves the same guarded runtime exports', () => {
  assert.deepEqual(Object.keys(packageProvider).sort(), [...declaredAdapterExports].sort());
  for (const name of declaredAdapterExports) {
    assert.strictEqual(packageProvider[name], adapter[name], name);
  }
});

test('provider subpath advertises its TypeScript declarations before runtime default', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(pkg.exports['./ephemeris-provider'], {
    types: './src/ephemeris-provider.d.ts',
    import: './src/ephemeris-provider.js'
  });
});

// The experimental adapter is ESM-only; do not silently advertise a CJS fallback.
test('CommonJS resolution cannot reach the provider subpath', () => {
  const require = createRequire(import.meta.url);
  assert.throws(
    () => require.resolve('astrological-functions/ephemeris-provider'),
    { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }
  );
});

// Only the declared package subpath is public; consumers must not bypass
// the guarded adapter by importing its implementation through package exports.
test('ESM consumers cannot bypass the provider export through internal paths', async () => {
  for (const specifier of [
    'astrological-functions/src/ephemeris-provider.js',
    'astrological-functions/src/index.mjs',
    'astrological-functions/ephemeris-provider.js'
  ]) {
    await assert.rejects(import(specifier), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  }
});

test('ESM package provider rejects geometric J2000 metadata without fallback', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return {
        longitudeDeg: 42,
        latitudeDeg: 0,
        metadata: {
          center: 'EARTH',
          frame: 'ECLIPTIC_J2000',
          corrections: 'GEOMETRIC',
          engineVersion: 'synthetic',
          kernelSetId: 'synthetic',
          timeModel: 'synthetic'
        }
      };
    }
  };
  await assert.rejects(
    packageProvider.calculateNatalWithProvider({
      datetimeUtc: '2026-11-14T00:00:00Z',
      latitudeDeg: 45,
      longitudeDegEast: 11,
      bodyNames: ['Sun'],
      provider
    }),
    { code: 'INCOMPATIBLE_EPHEMERIS' }
  );
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    datetimeUtc: '2026-11-14T00:00:00Z',
    bodyName: 'Sun',
    corrections: 'APPARENT',
    frame: 'ECLIPTIC_OF_DATE'
  });
  assert.equal(Object.isFrozen(requests[0]), true);
});


test('ESM package provider assembles a synthetic natal chart without inventing houses', async () => {
  const seen = [];
  const chart = await packageProvider.calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T00:00:00Z',
    latitudeDeg: 45,
    longitudeDegEast: 11,
    bodyNames: ['Sun', 'Moon'],
    provider: {
      async getGeocentricEcliptic(request) {
        seen.push(request);
        return {
          longitudeDeg: request.bodyName === 'Sun' ? 361 : -1,
          latitudeDeg: 0,
          metadata: {
            center: 'EARTH',
            frame: 'ECLIPTIC_OF_DATE',
            corrections: 'APPARENT',
            engineVersion: 'synthetic',
            kernelSetId: 'synthetic',
            timeModel: 'synthetic'
          }
        };
      }
    }
  });
  assert.deepEqual(seen.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.equal(seen.every(Object.isFrozen), true);
  assert.equal(chart.bodies.Sun.longitudeDeg, 1);
  assert.equal(chart.bodies.Moon.longitudeDeg, 359);
  assert.equal(chart.bodies.Sun.zodiacSignIndex, 0);
  assert.equal(chart.bodies.Moon.zodiacSignIndex, 11);
  assert.deepEqual(chart.ephemerisProvenance, {
    engineVersion: 'synthetic',
    kernelSetId: 'synthetic',
    timeModel: 'synthetic'
  });
  assert.equal(chart.houses, null);
  assert.equal(chart.angles, null);
  assert.equal(chart.warnings[0].code, 'houses_unavailable');
  assert.equal(Object.isFrozen(chart), true);
  assert.equal(Object.isFrozen(chart.bodies), true);
});

test('public ESM provider rejects mixed provenance across synthetic bodies', async () => {
  const requests = [];
  await assert.rejects(
    packageProvider.calculateNatalWithProvider({
      datetimeUtc: '2026-11-14T00:00:00Z',
      latitudeDeg: 45,
      longitudeDegEast: 11,
      bodyNames: ['Sun', 'Moon'],
      provider: {
        async getGeocentricEcliptic(request) {
          requests.push(request);
          return {
            longitudeDeg: request.bodyName === 'Sun' ? 1 : 31,
            latitudeDeg: 0,
            metadata: {
              center: 'EARTH',
              frame: 'ECLIPTIC_OF_DATE',
              corrections: 'APPARENT',
              engineVersion: 'synthetic',
              kernelSetId: request.bodyName === 'Sun' ? 'kernel-A' : 'kernel-B',
              timeModel: 'synthetic'
            }
          };
        }
      }
    }),
    { code: 'INCONSISTENT_EPHEMERIS' }
  );
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.equal(requests.every(Object.isFrozen), true);
});


test('public ESM provider rejects engine-version and time-model drift independently', async () => {
  for (const changedField of ['engineVersion', 'timeModel']) {
    const requests = [];
    await assert.rejects(
      packageProvider.calculateNatalWithProvider({
        datetimeUtc: '2026-11-14T00:00:00Z',
        latitudeDeg: 45,
        longitudeDegEast: 11,
        bodyNames: ['Sun', 'Moon'],
        provider: {
          async getGeocentricEcliptic(request) {
            requests.push(request);
            return {
              longitudeDeg: request.bodyName === 'Sun' ? 1 : 31,
              latitudeDeg: 0,
              metadata: {
                center: 'EARTH',
                frame: 'ECLIPTIC_OF_DATE',
                corrections: 'APPARENT',
                engineVersion: changedField === 'engineVersion' && request.bodyName === 'Moon' ? 'engine-B' : 'engine-A',
                kernelSetId: 'kernel-A',
                timeModel: changedField === 'timeModel' && request.bodyName === 'Moon' ? 'time-B' : 'time-A'
              }
            };
          }
        }
      }),
      { code: 'INCONSISTENT_EPHEMERIS' },
      changedField
    );
    assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon'], changedField);
    assert.equal(requests.every(Object.isFrozen), true, changedField);
  }
});

test('public ESM house placement refuses unknown birth time before reading cusp data', () => {
  for (const birthTimeKnown of [false, undefined, null, 0, 'true']) {
    assert.throws(
      () => packageProvider.placeNatalBodiesInHouses({
        birthTimeKnown,
        chart: null,
        cuspSet: null
      }),
      { code: 'BIRTH_TIME_REQUIRED' },
      String(birthTimeKnown)
    );
  }
});

test('provider reentrancy cannot alter the validated body sequence', async () => {
  const bodyNames = ['Sun', 'Moon'];
  const requested = [];
  const chart = await packageProvider.calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T00:00:00Z',
    latitudeDeg: 45,
    longitudeDegEast: 11,
    bodyNames,
    provider: {
      async getGeocentricEcliptic(request) {
        requested.push(request.bodyName);
        if (request.bodyName === 'Sun') {
          bodyNames[1] = 'Mars';
          bodyNames.push('Venus');
        }
        return {
          longitudeDeg: request.bodyName === 'Sun' ? 1 : 31,
          latitudeDeg: 0,
          metadata: {
            center: 'EARTH',
            frame: 'ECLIPTIC_OF_DATE',
            corrections: 'APPARENT',
            engineVersion: 'synthetic',
            kernelSetId: 'synthetic',
            timeModel: 'synthetic'
          }
        };
      }
    }
  });
  assert.deepEqual(requested, ['Sun', 'Moon']);
  assert.deepEqual(Object.keys(chart.bodies), ['Sun', 'Moon']);
  assert.equal(chart.bodies.Mars, undefined);
  assert.equal(chart.bodies.Venus, undefined);
});

test('public ESM natal body map safely preserves prototype-like body identifiers', async () => {
  const names = ['__proto__', 'constructor', 'toString'];
  const requests = [];
  const chart = await packageProvider.calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T00:00:00Z',
    latitudeDeg: 45,
    longitudeDegEast: 11,
    bodyNames: names,
    provider: {
      async getGeocentricEcliptic(request) {
        requests.push(request);
        return {
          longitudeDeg: 15,
          latitudeDeg: 0,
          metadata: {
            center: 'EARTH',
            frame: 'ECLIPTIC_OF_DATE',
            corrections: 'APPARENT',
            engineVersion: 'synthetic',
            kernelSetId: 'synthetic',
            timeModel: 'synthetic'
          }
        };
      }
    }
  });
  assert.equal(Object.getPrototypeOf(chart.bodies), null);
  assert.deepEqual(Object.keys(chart.bodies), names);
  for (const name of names) {
    assert.equal(Object.hasOwn(chart.bodies, name), true);
    assert.equal(chart.bodies[name].name, name);
    assert.equal(Object.isFrozen(chart.bodies[name]), true);
  }
  assert.deepEqual(requests.map(request => request.bodyName), names);
  assert.equal(requests.every(Object.isFrozen), true);
  assert.equal(Object.prototype.polluted, undefined);
});


test('provider failures propagate without retry or astronomical fallback', async () => {
  const failure = new Error('synthetic Rust/WASM adapter unavailable');
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      throw failure;
    }
  };
  await assert.rejects(
    packageProvider.calculateNatalWithProvider({
      datetimeUtc: '2026-11-14T00:00:00Z',
      latitudeDeg: 45,
      longitudeDegEast: 11,
      bodyNames: ['Sun', 'Moon'],
      provider
    }),
    error => error === failure
  );
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun']);
  assert.equal(Object.isFrozen(requests[0]), true);
});


test('second-body provider failure preserves identity and stops without fallback', async () => {
  const failure = new Error('synthetic second-body Rust adapter failure');
  const requested = [];
  await assert.rejects(
    packageProvider.calculateNatalWithProvider({
      datetimeUtc: '2026-11-14T00:00:00Z',
      latitudeDeg: 45,
      longitudeDegEast: 11,
      bodyNames: ['Sun', 'Moon', 'Mars'],
      provider: {
        async getGeocentricEcliptic(request) {
          requested.push(request);
          if (request.bodyName === 'Moon') throw failure;
          return {
            longitudeDeg: 15,
            latitudeDeg: 0,
            metadata: {
              center: 'EARTH',
              frame: 'ECLIPTIC_OF_DATE',
              corrections: 'APPARENT',
              engineVersion: 'synthetic',
              kernelSetId: 'synthetic',
              timeModel: 'synthetic'
            }
          };
        }
      }
    }),
    error => error === failure
  );
  assert.deepEqual(requested.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.equal(requested.every(Object.isFrozen), true);
});
