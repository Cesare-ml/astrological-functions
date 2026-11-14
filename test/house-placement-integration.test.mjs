import test from 'node:test';
import assert from 'node:assert/strict';
import { locateLongitudeWithHousePolicy } from '../src/index.mjs';

const cusps = Object.freeze([345,15,45,75,105,135,165,195,225,255,285,315]);
const base = { houseSystem:'VEHLOW', calculationProfile:'CANONICAL_V1', placementMethod:'CUSP_INTERVAL', cusps };

test('explicit cusp placement resolves exact cusp and wrap-around', () => {
  const atCusp = locateLongitudeWithHousePolicy({...base, longitudeDeg:15});
  assert.equal(atCusp.house, 2);
  assert.equal(atCusp.distanceFromCuspDeg, 0);
  assert.equal(atCusp.houseSystem, 'VEHLOW');
  assert.equal(atCusp.placementMethod, 'CUSP_INTERVAL');
  assert.equal(Object.isFrozen(atCusp), true);
  assert.equal(locateLongitudeWithHousePolicy({...base, longitudeDeg:0}).house, 1);
  assert.equal(locateLongitudeWithHousePolicy({...base, longitudeDeg:344.99}).house, 12);
});

test('legacy alias requires explicit profile and still uses geometric cusp placement', () => {
  const result = locateLongitudeWithHousePolicy({...base,
    houseSystem:'egizia', calculationProfile:'VIRGOSTARS_LEGACY_V1', longitudeDeg:345});
  assert.equal(result.houseSystem, 'VEHLOW');
  assert.equal(result.house, 1);
  assert.deepEqual(cusps, [345,15,45,75,105,135,165,195,225,255,285,315]);
});

test('legacy houses_pos fails closed before interpreting supplied cusps', () => {
  assert.throws(() => locateLongitudeWithHousePolicy({...base,
    houseSystem:'egizia', calculationProfile:'VIRGOSTARS_LEGACY_V1',
    placementMethod:'LEGACY_HOUSES_POS', longitudeDeg:15, cusps:[]}),
    error => error.code === 'UNSUPPORTED_HOUSE_PLACEMENT');
});

test('invalid inputs and cusp order fail with typed errors', () => {
  assert.throws(() => locateLongitudeWithHousePolicy(null), error => error.code === 'INVALID_ARGUMENT');
  assert.throws(() => locateLongitudeWithHousePolicy({...base, longitudeDeg:0, cusps:Array(12).fill(0)}),
    error => error.code === 'INVALID_CUSPS');
  assert.throws(() => locateLongitudeWithHousePolicy({...base, longitudeDeg:0, houseSystem:'egizia'}),
    error => error.code === 'INVALID_HOUSE_SYSTEM');
});
