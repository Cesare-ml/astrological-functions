import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize360} from '../src/index.mjs';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {bindVirgoStarsNodeHouseAngles} from '../src/virgostars-node-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES,
  evaluateNativeHouseLatitudeGrid} from '../scripts/audit-native-house-latitudes.mjs';

const R = Math.PI / 180;
const D = 180 / Math.PI;
const theta = 61.66688244516181;
const epsilon = 23.437859777570328;
const expected = {upstreamCommitSha: 'a'.repeat(40),
  nativeAddonSha256: 'b'.repeat(64), kernelSetId: 'SYNTHETIC_NO_KERNEL'};

function mockNativeAngles(input) {
  return {...input, model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
    armcDeg: theta, trueObliquityDeg: epsilon,
    ascendantDeg: normalize360(Math.atan2(-Math.cos(theta * R),
      Math.sin(epsilon * R) * Math.tan(input.latitudeDeg * R) +
      Math.cos(epsilon * R) * Math.sin(theta * R)) * D + 180),
    midheavenDeg: normalize360(Math.atan2(Math.sin(theta * R),
      Math.cos(theta * R) * Math.cos(epsilon * R)) * D),
  };
}

test('latitude grid records 7 observers and 23 methods each, without inventing polar parity', async () => {
  const calls = [];
  const bridge = bindVirgoStarsNodeHouseAngles({calculateHouseAngles(input) {
    calls.push(input);
    return mockNativeAngles(input);
  }}, expected);
  const report = await evaluateNativeHouseLatitudeGrid(bridge);
  assert.equal(report.contract, 'VirgoStarsNativeHouseLatitudeAuditV1');
  assert.equal(report.scenarioCount, 7);
  assert.equal(report.attempted, 7 * 23);
  assert.equal(report.passed + report.failed, report.attempted);
  assert.equal(calls.length, report.attempted);
  assert.ok(calls.every(call => !Object.hasOwn(call, 'id')));
  assert.equal(report.scientificallyCertified, false);
  assert.equal(report.expectedPolarAvailabilityVerified, false);
  assert.equal(report.highLatitudeMethodParityVerified, false);
  assert.equal(report.resultsAreIndependentReferences, false);
  assert.deepEqual(LATITUDE_AUDIT_CASES.map(row => row.latitudeDeg),
    [-80, -66.55, -45, 0, 45, 66.55, 80]);
  assert.deepEqual(report.scenarios.map(s => s.fixture.latitudeDeg),
    LATITUDE_AUDIT_CASES.map(s => s.latitudeDeg));
  assert.equal(report.blocked[0].houseSystem, 'SUNSHINE');
  assert.equal(ASTRO_COM_HOUSE_SYSTEM_IDS.length, 24);
  for (const row of report.scenarios) {
    assert.equal(row.attempted, 23);
    assert.equal(row.passed + row.failed, 23);
    assert.ok(row.sourceAngles && Number.isFinite(row.sourceAngles.ascendantDeg));
    assert.equal(row.sourceAngles.model, 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME');
    assert.equal(row.fixture.datetimeUtc, '2000-01-01T12:00:00Z');
    assert.ok(row.results.some(r => r.houseSystem === 'WHOLE_ARIES'));
    assert.ok(row.failures.every(f => typeof f.code === 'string' &&
      f.houseSystem !== 'SUNSHINE'));
    for (const entry of row.results) {
      assert.equal(entry.valuesDeg.length, entry.houseSystem === 'GAUQUELIN_36' ? 36 : 12);
      assert.ok(entry.valuesDeg.every(n => n >= 0 && n < 360));
    }
  }
});

test('broken source/model is recorded for every attempted method, never silently accepted', async () => {
  const bridge = bindVirgoStarsNodeHouseAngles({calculateHouseAngles(input) {
    return {...mockNativeAngles(input), model: 'GEOMETRIC_J2000'};
  }}, expected);
  const report = await evaluateNativeHouseLatitudeGrid(bridge);
  assert.equal(report.status, 'METHOD_ERRORS_REQUIRE_MANUAL_REVIEW');
  assert.equal(report.passed, 0);
  assert.equal(report.failed, 161);
  assert.ok(report.scenarios.every(s => s.sourceAngles === null && s.results.length === 0));
  assert.ok(report.scenarios.every(s => s.failures.every(f =>
    f.code === 'INCOMPATIBLE_ANGLE_SOURCE')));
});

test('latitude audit requires a pinned provider and explicit real-addon CLI options', async () => {
  await assert.rejects(evaluateNativeHouseLatitudeGrid(null), /E_NATIVE_LATITUDE_PROVIDER/);
  const script = fileURLToPath(new URL('../scripts/audit-native-house-latitudes.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
  assert.equal(help.status, 0);
  assert.match(help.stdout, /not.*certif|Neither result certifies/i);
  const missing = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /E_NATIVE_SMOKE_OPTIONS/);
  assert.match(path.basename(script), /latitude/);
});
