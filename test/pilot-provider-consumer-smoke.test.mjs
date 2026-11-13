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
