import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHousePlacementPolicy } from '../src/index.mjs';

test('explicit cusp placement preserves normalized system and immutable policy', () => {
  const canonical = resolveHousePlacementPolicy({
    houseSystem:'VEHLOW', calculationProfile:'CANONICAL_V1',
    placementMethod:'CUSP_INTERVAL'
  });
  assert.deepEqual(canonical, {houseSystem:'VEHLOW', calculationProfile:'CANONICAL_V1', placementMethod:'CUSP_INTERVAL'});
  assert.equal(Object.isFrozen(canonical), true);
  const legacy = resolveHousePlacementPolicy({
    houseSystem:'egizia', calculationProfile:'VIRGOSTARS_LEGACY_V1',
    placementMethod:'CUSP_INTERVAL'
  });
  assert.equal(legacy.houseSystem, 'VEHLOW');
  assert.equal(legacy.placementMethod, 'CUSP_INTERVAL');
});

test('historical houses_pos never silently falls back to cusp intervals', () => {
  assert.throws(() => resolveHousePlacementPolicy({
    houseSystem:'egizia', calculationProfile:'VIRGOSTARS_LEGACY_V1',
    placementMethod:'LEGACY_HOUSES_POS'
  }), e => e.code === 'UNSUPPORTED_HOUSE_PLACEMENT');
  assert.throws(() => resolveHousePlacementPolicy({
    houseSystem:'VEHLOW', calculationProfile:'CANONICAL_V1',
    placementMethod:'LEGACY_HOUSES_POS'
  }), e => e.code === 'INVALID_HOUSE_PLACEMENT');
});

test('missing, unknown or invalid placement policy fails with typed error', () => {
  for (const input of [undefined, null, 'CUSP_INTERVAL', [], 42]) {
    assert.throws(() => resolveHousePlacementPolicy(input), e => e.code === 'INVALID_ARGUMENT');
  }
  for (const method of [undefined, 'HOUSES_POS', '']) {
    assert.throws(() => resolveHousePlacementPolicy({
      houseSystem:'VEHLOW', calculationProfile:'CANONICAL_V1', placementMethod:method
    }), e => e.code === 'INVALID_HOUSE_PLACEMENT');
  }
  assert.throws(() => resolveHousePlacementPolicy({
    houseSystem:'egizia', calculationProfile:'CANONICAL_V1', placementMethod:'CUSP_INTERVAL'
  }), e => e.code === 'INVALID_HOUSE_SYSTEM');
});
