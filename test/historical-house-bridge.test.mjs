import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { calculateHistoricalHouse } from '../src/historical-house-bridge.mjs';

const modulePath = process.env.VIRGOSTARS_HISTORICAL_NODE_MODULE;
const require = createRequire(import.meta.url);
const systems = ['PORPHYRY', 'PLACIDUS', 'REGIOMONTANUS', 'KOCH'];

test('historical cusps use real Rust angles without claiming UTC or DE441', {skip: !modulePath}, async () => {
  const native = require(modulePath);
  const provider = native.createExperimentalHistoricalHouseAngleProvider();
  for (const year of [-12999, 0, 2000, 3999]) {
    const ut1JulianDay = native.julday(year, 3, 20, 0, true);
    const request = {ut1JulianDay, ttJulianDay: ut1JulianDay + 69 / 86400,
      latitudeDeg: 41.9, longitudeDegEast: 12.5, engineVersion: 'local-test', birthTimeKnown: true, houseSystem: ''};
    for (const houseSystem of systems) {
      const out = await calculateHistoricalHouse({...request, houseSystem}, provider);
      assert.equal(out.houseSystem, houseSystem);
      assert.equal(out.result.cuspsDeg.length, 12);
      assert.equal(out.result.epochUt1JulianDay, ut1JulianDay);
      assert.equal(Object.hasOwn(out.result, 'datetimeUtc'), false);
      assert.equal(out.result.source.kernelSetId, 'NOT_USED_FOR_HOUSE_ANGLES');
      assert.ok(out.result.cuspsDeg.every(x => Number.isFinite(x) && x >= 0 && x < 360));
    }
  }
});

test('refuses mismatched models, epochs, invalid observers and unsupported systems', async () => {
  const base = {ut1JulianDay: 2451545, ttJulianDay: 2451545.001, latitudeDeg: 40,
    longitudeDegEast: 10, engineVersion: 'local-test', birthTimeKnown: true, houseSystem: 'PLACIDUS'};
  const provider = {calculateHouseAngles: input => ({...input, model: 'WRONG',
    armcDeg: 10, ascendantDeg: 20, midheavenDeg: 30, trueObliquityDeg: 23})};
  await assert.rejects(calculateHistoricalHouse(base, provider), {code: 'INCOMPATIBLE_ANGLE_SOURCE'});
  await assert.rejects(calculateHistoricalHouse({...base, latitudeDeg: 90}, provider), {code: 'INVALID_INPUT'});
  await assert.rejects(calculateHistoricalHouse({...base, houseSystem: 'UNKNOWN'}, provider), {code: 'UNSUPPORTED_HOUSE_SYSTEM'});
  await assert.rejects(calculateHistoricalHouse({...base, birthTimeKnown: false}, provider), {code: 'BIRTH_TIME_REQUIRED'});
});
