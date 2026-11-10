import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHouseSystem } from '../src/index.mjs';

test('canonical systems require explicit profile and preserve names', () => {
  for (const name of ['VEHLOW', 'PLACIDUS', 'KOCH', 'REGIOMONTANUS', 'PORPHYRY']) {
    const resolved = resolveHouseSystem({houseSystem:name, calculationProfile:'CANONICAL_V1'});
    assert.deepEqual(resolved, {houseSystem:name, calculationProfile:'CANONICAL_V1'});
    assert.equal(Object.isFrozen(resolved), true);
  }
});

test('historical Italian labels are mapped only under legacy profile', () => {
  const pairs = {
    egizia:'VEHLOW', placido:'PLACIDUS', koch:'KOCH',
    'regio-montano':'REGIOMONTANUS', porfirio:'PORPHYRY'
  };
  for (const [alias, expected] of Object.entries(pairs)) {
    assert.equal(resolveHouseSystem({
      houseSystem:alias, calculationProfile:'VIRGOSTARS_LEGACY_V1'
    }).houseSystem, expected);
    assert.throws(() => resolveHouseSystem({
      houseSystem:alias, calculationProfile:'CANONICAL_V1'
    }), error => error.code === 'INVALID_HOUSE_SYSTEM');
  }
});

test('unknown, inherited and malformed names are rejected', () => {
  for (const name of ['__proto__', 'constructor', 'toString', '', 'EGIZIA', 'P']) {
    assert.throws(() => resolveHouseSystem({
      houseSystem:name, calculationProfile:'VIRGOSTARS_LEGACY_V1'
    }), error => error.code === 'INVALID_HOUSE_SYSTEM');
  }
  assert.throws(() => resolveHouseSystem({
    houseSystem:'VEHLOW'
  }), error => error.code === 'INVALID_PROFILE');
  assert.throws(() => resolveHouseSystem({
    houseSystem:'VEHLOW', calculationProfile:'UNKNOWN'
  }), error => error.code === 'INVALID_PROFILE');
});
