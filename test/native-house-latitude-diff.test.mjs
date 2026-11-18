import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE} from '../scripts/verify-native-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES} from '../scripts/audit-native-house-latitudes.mjs';
import {diffNativeHouseLatitudes, readNativeLatitudeDiffReceipt} from
  '../scripts/diff-native-house-latitudes.mjs';

const METHODS = ASTRO_COM_HOUSE_SYSTEM_IDS.filter(id => id !== 'SUNSHINE');
const expectedModel = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
const output = (index, count) => Array.from({length: count}, (_, i) =>
  i === 0 && index === 3 ? 359.999 : (i * (360 / count) + 4) % 360);

function receipt(newVersion = false) {
  const scenarios = LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}, index) => {
    const results = [];
    const failures = [];
    for (const houseSystem of METHODS) {
      let code = null;
      if (id === 'S_HIGH_80' && houseSystem === 'PLACIDUS') {
        code = 'POLAR_HOUSES_UNAVAILABLE';
      }
      if (id === 'N_HIGH_80' && houseSystem === 'PLACIDUS' && !newVersion) {
        code = 'DEGENERATE_QUADRANTS';
      }
      if (id === 'N_HIGH_80' && houseSystem === 'POLICH_PAGE') {
        code = newVersion ? 'HOUSE_GEOMETRY_UNAVAILABLE' : 'DEGENERATE_QUADRANTS';
      }
      if (id === 'N_HIGH_80' && houseSystem === 'EQUAL_ASCENDANT' && newVersion) {
        code = 'HOUSE_GEOMETRY_UNAVAILABLE';
      }
      if (code) {
        failures.push({houseSystem, code, message: `${houseSystem} unavailable (${code})`});
      } else {
        const valuesDeg = output(index, houseSystem === 'GAUQUELIN_36' ? 36 : 12);
        if (newVersion && id === 'EQUATOR_0' && houseSystem === 'PLACIDUS') {
          valuesDeg[0] = 0.001;
        }
        results.push({houseSystem, valuesDeg});
      }
    }
    return {id, fixture: {...HOUSE_SMOKE_FIXTURE, id, latitudeDeg},
      sourceAngles: {model: expectedModel, armcDeg: 292.95347186375847,
        ascendantDeg: id === 'N_HIGH_80' ? (newVersion ? 344.5489205114233 :
          164.5489205114233) : 20 + index,
        midheavenDeg: 291.23482098822, trueObliquityDeg: 23.437676823739082},
      attempted: 23, passed: results.length, failed: failures.length,
      results, failures};
  });
  const passed = scenarios.reduce((sum, s) => sum + s.passed, 0);
  const failed = scenarios.reduce((sum, s) => sum + s.failed, 0);
  return {contract: 'VirgoStarsNativeHouseLatitudeAuditV1',
    status: failed === 0 ? 'STRUCTURAL_GRID_COMPLETE_NOT_CERTIFIED'
      : 'METHOD_ERRORS_REQUIRE_MANUAL_REVIEW',
    scientificallyCertified: false, highLatitudeMethodParityVerified: false,
    expectedPolarAvailabilityVerified: false, resultsAreIndependentReferences: false,
    scenarioCount: 7, attempted: 161, passed, failed,
    blocked: [{houseSystem: 'SUNSHINE', reason: 'INDEPENDENT_SUN_MISSING'}],
    scenarios, ephemeris: {upstreamCommitSha: newVersion ? 'c'.repeat(40) : 'a'.repeat(40),
      nativeAddonSha256: newVersion ? 'd'.repeat(64) : 'b'.repeat(64),
      kernelContext: 'HOUSE_ANGLES_NO_KERNEL',
      kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441',
      addonBuiltFromSelectedCommitIndependentlyVerified: false}};
}

test('diff records exact 161-method transitions, changed errors and 180° polar ASC', () => {
  const result = diffNativeHouseLatitudes(receipt(), receipt(true));
  assert.equal(result.contract, 'VirgoStarsNativeHouseLatitudeDiffV1');
  assert.equal(result.attempted, 161);
  assert.equal(result.scenarioCount, 7);
  assert.equal(result.bothSucceeded + result.bothErrored +
    result.errorToSuccess + result.successToError, 161);
  assert.equal(result.errorToSuccess, 1);
  assert.equal(result.successToError, 1);
  assert.equal(result.errorCodesChanged, 1);
  assert.equal(result.successValuesChanged, 1);
  assert.equal(result.sameAddonDigest, false);
  assert.equal(result.scientificallyCertified, false);
  assert.equal(result.comparisonToIndependentReference, false);
  assert.equal(result.methodAvailabilityIndependentlyVerified, false);
  assert.equal(result.nativeBuildOriginIndependentlyVerified, false);

  const north = result.scenarios[6];
  assert.equal(north.id, 'N_HIGH_80');
  assert.ok(Math.abs(north.angleDeltaArcsec.ascendantDeg - 180 * 3600) < 1e-6);
  assert.equal(north.angleDeltaArcsec.armcDeg, 0);
  assert.deepEqual(north.methods.find(m => m.houseSystem === 'PLACIDUS'), {
    houseSystem: 'PLACIDUS', transition: 'ERROR_TO_SUCCESS',
    previousErrorCode: 'DEGENERATE_QUADRANTS'});
  assert.deepEqual(north.methods.find(m => m.houseSystem === 'EQUAL_ASCENDANT'), {
    houseSystem: 'EQUAL_ASCENDANT', transition: 'SUCCESS_TO_ERROR',
    newErrorCode: 'HOUSE_GEOMETRY_UNAVAILABLE'});
  const polich = north.methods.find(m => m.houseSystem === 'POLICH_PAGE');
  assert.equal(polich.transition, 'BOTH_ERRORED');
  assert.equal(polich.previousErrorCode, 'DEGENERATE_QUADRANTS');
  assert.equal(polich.newErrorCode, 'HOUSE_GEOMETRY_UNAVAILABLE');
  assert.equal(polich.errorMessageChanged, true);
  const seam = result.scenarios[3].methods.find(m => m.houseSystem === 'PLACIDUS');
  assert.equal(seam.transition, 'BOTH_SUCCEEDED');
  assert.equal(seam.changedCusps, 1);
  assert.equal(seam.worstCusp, 1);
  assert.ok(Math.abs(seam.maxCuspDeltaArcsec - 7.2) < 1e-9);
});

test('diff rejects incomplete, duplicated, altered observer and wrong provenance context', () => {
  const old = receipt();
  const changed = receipt(true);
  changed.scenarios[0].fixture.ttJulianDay += 1;
  assert.throws(() => diffNativeHouseLatitudes(old, changed), /E_LATITUDE_COMPARE_FIXTURE/);
  changed.scenarios[0].fixture.ttJulianDay -= 1;
  changed.scenarios[0].results.push(changed.scenarios[0].results[0]);
  changed.scenarios[0].passed++;
  changed.passed++;
  assert.throws(() => diffNativeHouseLatitudes(old, changed), /E_LATITUDE_COMPARE_AUDIT/);
  const wrong = receipt(true);
  wrong.ephemeris.kernelContext = 'ANOTHER_DECLARED_CONTEXT';
  assert.throws(() => diffNativeHouseLatitudes(old, wrong), /E_LATITUDE_DIFF_KERNEL_CONTEXT/);
  const poisoned = receipt(true);
  poisoned.scenarios[2].results[0].valuesDeg[0] = Number.NaN;
  assert.throws(() => diffNativeHouseLatitudes(old, poisoned), /E_LATITUDE_COMPARE_VALUES/);
  const omitted = receipt(true);
  omitted.scenarios.pop();
  assert.throws(() => diffNativeHouseLatitudes(old, omitted), /E_LATITUDE_COMPARE_AUDIT/);
});

test('CLI reads mixed UTF-16LE/BOM and UTF-8, prints text/JSON and fails closed', () => {
  const script = fileURLToPath(new URL('../scripts/diff-native-house-latitudes.mjs', import.meta.url));
  const folder = mkdtempSync(path.join(tmpdir(), 'vs-latitude-diff-'));
  try {
    const a = path.join(folder, 'before.json');
    const b = path.join(folder, 'after.json');
    writeFileSync(a, `\uFEFF${JSON.stringify(receipt())}`, 'utf16le');
    writeFileSync(b, JSON.stringify(receipt(true)), 'utf8');
    assert.equal(readNativeLatitudeDiffReceipt(a).attempted, 161);
    const human = spawnSync(process.execPath, [script, '--before', a, '--after', b],
      {encoding: 'utf8'});
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /161 cases/);
    assert.match(human.stdout, /N_HIGH_80/);
    assert.match(human.stdout, /scientific and method parity NOT certified/i);
    const json = spawnSync(process.execPath, [script, '--before', a, '--after', b, '--json'],
      {encoding: 'utf8'});
    assert.equal(json.status, 0, json.stderr);
    assert.equal(JSON.parse(json.stdout).errorToSuccess, 1);
    writeFileSync(b, '{bad');
    const invalid = spawnSync(process.execPath, [script, '--before', a, '--after', b],
      {encoding: 'utf8'});
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /E_LATITUDE_DIFF_JSON/);
    const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
    assert.equal(help.status, 0);
    assert.match(help.stdout, /scientific parity/);
  } finally {
    rmSync(folder, {recursive: true, force: true});
  }
});
