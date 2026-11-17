import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {HOUSE_SMOKE_FIXTURE} from '../scripts/verify-native-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES} from '../scripts/audit-native-house-latitudes.mjs';
import {auditNativeHouseAngleOrientation, classifyNativeAscendantBranch} from
  '../scripts/audit-native-house-angle-orientation.mjs';

// Only synthetic J2000 angle outputs from the owner's receipt, not the full
// private receipt. Values represent an analytic branch regression, not parity.
const ascendants = [7.16881630295217, 12.481452337837476,
  17.42420249955754, 24.778143295766903, 41.09682061519927,
  100.47525199627685, 164.5489205114233];
const armcDeg = 292.95347186375847;
const trueObliquityDeg = 23.437676823739082;
const model = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
const report = () => ({contract: 'VirgoStarsNativeHouseLatitudeAuditV1',
  scenarios: LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}, i) => ({
    id, fixture: {...HOUSE_SMOKE_FIXTURE, id, latitudeDeg},
    sourceAngles: {model, armcDeg, trueObliquityDeg,
      midheavenDeg: 291.23482098822, ascendantDeg: ascendants[i]},
  }))});

test('north-polar native Ascendant is on the setting branch, opposite candidate rising', () => {
  const input = {latitudeDeg: 80, armcDeg, trueObliquityDeg,
    ascendantDeg: ascendants[6]};
  const output = classifyNativeAscendantBranch(input);
  assert.equal(output.status, 'SETTING_BRANCH');
  assert.ok(Math.abs(output.sinAltitude) < 1e-12);
  assert.ok(Math.abs(output.crossingDerivative + 0.13756692873472948) < 1e-12);
  assert.ok(Math.abs(output.oppositeLongitudeDeg - 344.5489205114233) < 1e-10);
  const rising = classifyNativeAscendantBranch({...input,
    ascendantDeg: output.oppositeLongitudeDeg});
  assert.equal(rising.status, 'RISING_BRANCH');
  assert.ok(rising.crossingDerivative > 0);
});

test('exact seven-latitude fixture flags only the polar north branch', () => {
  const output = auditNativeHouseAngleOrientation(report());
  assert.equal(output.status, 'NATIVE_ASCENDANT_BRANCH_REVIEW_REQUIRED');
  assert.equal(output.checked, 7);
  assert.equal(output.flagged, 1);
  assert.deepEqual(output.scenarios.map(row => row.status), [
    'RISING_BRANCH', 'RISING_BRANCH', 'RISING_BRANCH', 'RISING_BRANCH',
    'RISING_BRANCH', 'RISING_BRANCH', 'SETTING_BRANCH']);
  assert.equal(output.scientificallyCertified, false);
  assert.equal(output.nativeBinaryProvenanceVerified, false);
  const repaired = report();
  repaired.scenarios[6].sourceAngles.ascendantDeg += 180;
  assert.equal(auditNativeHouseAngleOrientation(repaired).status,
    'ANALYTIC_BRANCH_CHECK_PASSED_NOT_CERTIFIED');
});

test('missing angles and inconsistent input never become a false clean result', () => {
  const missing = report();
  missing.scenarios[3].sourceAngles = null;
  const output = auditNativeHouseAngleOrientation(missing);
  assert.equal(output.scenarios[3].status, 'SOURCE_ANGLES_MISSING');
  assert.equal(output.flagged, 2);
  const poisoned = report();
  poisoned.scenarios[0].fixture.latitudeDeg = 40;
  assert.throws(() => auditNativeHouseAngleOrientation(poisoned),
    /E_NATIVE_ANGLE_ORIENTATION_FIXTURE/);
  const wrongModel = report();
  wrongModel.scenarios[0].sourceAngles.model = 'J2000_GEOMETRIC';
  assert.throws(() => auditNativeHouseAngleOrientation(wrongModel),
    /E_NATIVE_ANGLE_ORIENTATION_MODEL/);
  assert.throws(() => classifyNativeAscendantBranch({latitudeDeg: 90,
    ascendantDeg: 2, armcDeg: 30, trueObliquityDeg: 23}),
  /E_NATIVE_ANGLE_ORIENTATION_INPUT/);
});

test('CLI accepts Windows UTF-16LE/BOM, returns 2 for review and 1 for bad JSON', () => {
  const script = fileURLToPath(new URL(
    '../scripts/audit-native-house-angle-orientation.mjs', import.meta.url));
  const folder = mkdtempSync(path.join(tmpdir(), 'vs-angle-orientation-'));
  try {
    const receiptPath = path.join(folder, 'latitude.json');
    writeFileSync(receiptPath, `\uFEFF${JSON.stringify(report())}`, 'utf16le');
    const run = spawnSync(process.execPath, [script, '--receipt', receiptPath],
      {encoding: 'utf8'});
    assert.equal(run.status, 2, run.stderr);
    assert.match(run.stdout, /N_HIGH_80: SETTING_BRANCH/);
    assert.match(run.stdout, /DIAGNOSTIC|diagnostic/);
    const json = spawnSync(process.execPath, [script, '--receipt', receiptPath, '--json'],
      {encoding: 'utf8'});
    assert.equal(json.status, 2);
    assert.equal(JSON.parse(json.stdout).flagged, 1);
    writeFileSync(receiptPath, '{broken');
    const malformed = spawnSync(process.execPath, [script, '--receipt', receiptPath],
      {encoding: 'utf8'});
    assert.equal(malformed.status, 1);
    const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
    assert.equal(help.status, 0);
    assert.match(help.stdout, /does NOT certify/);
  } finally {
    rmSync(folder, {recursive: true, force: true});
  }
});
