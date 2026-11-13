import test from 'node:test';
import assert from 'node:assert/strict';
import * as adapter from '../src/ephemeris-provider.js';
import * as runtime from '../src/index.mjs';
import * as packageRoot from 'astrological-functions';

test('typed provider adapter has real ESM exports identical to the guarded runtime', () => {
  for (const name of [
    'calculateNatalWithProvider', 'resolveHouseSystem',
    'resolveHousePlacementPolicy', 'locateLongitudeWithHousePolicy',
    'validateHouseCuspSet', 'validateHouseCuspContext',
    'placeNatalBodiesInHouses'
  ]) {
    assert.equal(typeof adapter[name], 'function', name);
    assert.strictEqual(adapter[name], runtime[name], name);
  }
});

test('package root self-import remains the existing runtime, not an astronomy fallback', () => {
  assert.strictEqual(packageRoot.calculateNatalWithProvider, adapter.calculateNatalWithProvider);
  assert.strictEqual(packageRoot.resolveHouseSystem, adapter.resolveHouseSystem);
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
