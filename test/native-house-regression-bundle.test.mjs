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
import {auditNativeHouseAngleOrientation} from '../scripts/audit-native-house-angle-orientation.mjs';
import {diffNativeHouseLatitudes} from '../scripts/diff-native-house-latitudes.mjs';
import {canonicalReportSha256, NATIVE_HOUSE_BUNDLE_FILES,
  verifyNativeHouseRegressionBundle} from
  '../scripts/verify-native-house-regression-bundle.mjs';

const methods = ASTRO_COM_HOUSE_SYSTEM_IDS.filter(id => id !== 'SUNSHINE');
const oldAsc = [7.16881630295217, 12.481452337837476,
  17.42420249955754, 24.778143295766903, 41.09682061519927,
  100.47525199627685, 164.5489205114233];
const addonSha = fresh => fresh ? 'd'.repeat(64) : 'b'.repeat(64);
const commitSha = fresh => fresh ? 'c'.repeat(40) : 'a'.repeat(40);
const model = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';

function makeGrid(fresh) {
  const scenarios = LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}, i) => ({
    id, fixture: {...HOUSE_SMOKE_FIXTURE, id, latitudeDeg},
    sourceAngles: {model, armcDeg: 292.95347186375847,
      ascendantDeg: fresh && i === 6 ? 344.5489205114233 : oldAsc[i],
      midheavenDeg: 291.23482098822, trueObliquityDeg: 23.437676823739082},
    attempted: 23, passed: 23, failed: 0, failures: [],
    results: methods.map(houseSystem => ({houseSystem,
      valuesDeg: Array.from({length: houseSystem === 'GAUQUELIN_36' ? 36 : 12},
        (_, j) => j * (houseSystem === 'GAUQUELIN_36' ? 10 : 30))})),
  }));
  return {contract: 'VirgoStarsNativeHouseLatitudeAuditV1',
    status: 'STRUCTURAL_GRID_COMPLETE_NOT_CERTIFIED',
    scientificallyCertified: false, highLatitudeMethodParityVerified: false,
    expectedPolarAvailabilityVerified: false, resultsAreIndependentReferences: false,
    scenarioCount: 7, attempted: 161, passed: 161, failed: 0,
    blocked: [{houseSystem: 'SUNSHINE', reason: 'MISSING_APPARENT_SUN'}],
    scenarios, ephemeris: {upstreamCommitSha: commitSha(fresh),
      nativeAddonSha256: addonSha(fresh), kernelContext: 'HOUSE_ANGLES_NO_KERNEL',
      kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441',
      addonBuiltFromSelectedCommitIndependentlyVerified: false}};
}

function makeBundle() {
  const baseline = makeGrid(false);
  const nativeGrid = makeGrid(true);
  const smoke = {contract: 'VirgoStarsNativeHouseSmokeV1',
    status: 'NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY',
    validatedScientificParity: false,
    addonBuiltFromSelectedCommitIndependentlyVerified: false,
    ephemeris: {upstreamCommitSha: commitSha(true),
      nativeAddonSha256: addonSha(true), kernelContext: 'HOUSE_ANGLES_NO_KERNEL'},
    fixture: HOUSE_SMOKE_FIXTURE,
    attempted: 23, passed: 23, failed: 0, failures: [],
    blocked: [{houseSystem: 'SUNSHINE', reason: 'MISSING_APPARENT_SUN'}],
    results: methods.map(houseSystem => ({houseSystem,
      valuesDeg: Array.from({length: houseSystem === 'GAUQUELIN_36' ? 36 : 12},
        (_, j) => j * (houseSystem === 'GAUQUELIN_36' ? 10 : 30))})),
  };
  const orientation = auditNativeHouseAngleOrientation(nativeGrid);
  const versionDiff = diffNativeHouseLatitudes(baseline, nativeGrid);
  const review = orientation.flagged > 0;
  const summary = {contract: 'VirgoStarsNativeHouseRegressionBundleV1',
    status: review ? 'MANUAL_METHOD_REVIEW_REQUIRED' : 'STRUCTURAL_CHECKS_COMPLETE_NOT_CERTIFIED',
    scientificallyCertified: false,
    nativeBuildOriginIndependentlyVerified: false,
    independentMethodParityVerified: false,
    expectedSourceCommitSha: commitSha(true), nativeAddonSha256: addonSha(true),
    baselineReceiptSha256: 'a'.repeat(64),
    baselinePassed: baseline.passed, baselineFailed: baseline.failed,
    currentPassed: nativeGrid.passed, currentFailed: nativeGrid.failed,
    attempted: 161, smokePassed: smoke.passed, smokeFailed: smoke.failed,
    ascendantBranchesFlagged: orientation.flagged,
    errorToSuccess: versionDiff.errorToSuccess,
    successToError: versionDiff.successToError,
    errorCodesChanged: versionDiff.errorCodesChanged,
    successValuesChanged: versionDiff.successValuesChanged,
    sameAddonDigest: versionDiff.sameAddonDigest,
    files: [...Object.values(NATIVE_HOUSE_BUNDLE_FILES), 'house-regression-bundle.json']};
  const reports = {baseline, nativeGrid, smoke, orientation, versionDiff, summary};
  const reportSha256 = Object.fromEntries(Object.keys(NATIVE_HOUSE_BUNDLE_FILES).map(
    key => [key, canonicalReportSha256(reports[key])]));
  return {contract: 'VirgoStarsNativeHouseRegressionEvidenceV1',
    scientificallyCertified: false, independentlyVerifiedBuildProvenance: false,
    comparisonToIndependentReferences: false, reports, reportSha256};
}

test('portable bundle checks hashes and recomputes 161-method diff and polar rising', () => {
  const bundle = makeBundle();
  const output = verifyNativeHouseRegressionBundle(bundle);
  assert.equal(output.contract, 'VirgoStarsNativeHouseBundleVerificationV1');
  assert.equal(output.status, 'INTERNAL_CONSISTENCY_VERIFIED_NOT_CERTIFIED');
  assert.equal(output.attempted, 161);
  assert.equal(output.reportHashesChecked, 5);
  assert.equal(output.flaggedAscendants, 0);
  assert.equal(output.scientificallyCertified, false);
  assert.equal(output.nativeBuildOriginIndependentlyVerified, false);
  assert.equal(output.independentMethodParityVerified, false);
  assert.equal(bundle.reports.orientation.scenarios[6].status, 'RISING_BRANCH');
  assert.ok(Math.abs(bundle.reports.versionDiff.scenarios[6]
    .angleDeltaArcsec.ascendantDeg - 648000) < 1e-6);
});

test('hash mismatch fails before accepting an altered cusp or error code', () => {
  const data = makeBundle();
  data.reports.nativeGrid.scenarios[0].results[0].valuesDeg[0] = 45;
  assert.throws(() => verifyNativeHouseRegressionBundle(data),
    /E_NATIVE_BUNDLE_CALCULATIONS|E_NATIVE_BUNDLE_HASH/);
  const forgedHash = makeBundle();
  forgedHash.reportSha256.smoke = 'a'.repeat(64);
  assert.throws(() => verifyNativeHouseRegressionBundle(forgedHash), /E_NATIVE_BUNDLE_HASH/);
  const wrongSummary = makeBundle();
  wrongSummary.reports.summary.successToError++;
  wrongSummary.reportSha256.summary = canonicalReportSha256(wrongSummary.reports.summary);
  assert.throws(() => verifyNativeHouseRegressionBundle(wrongSummary), /E_NATIVE_BUNDLE_SUMMARY/);
});

test('even re-hashed fabricated orientation or method report is rejected', () => {
  const data = structuredClone(makeBundle());
  data.reports.orientation.scenarios[6].status = 'SETTING_BRANCH';
  data.reportSha256.orientation = canonicalReportSha256(data.reports.orientation);
  assert.throws(() => verifyNativeHouseRegressionBundle(data), /E_NATIVE_BUNDLE_CALCULATIONS/);
  const duplicate = makeBundle();
  duplicate.reports.smoke.results[1].houseSystem = duplicate.reports.smoke.results[0].houseSystem;
  duplicate.reportSha256.smoke = canonicalReportSha256(duplicate.reports.smoke);
  assert.throws(() => verifyNativeHouseRegressionBundle(duplicate), /E_NATIVE_BUNDLE_SMOKE/);
  const wrongFixture = makeBundle();
  wrongFixture.reports.baseline.scenarios[3].fixture.ttJulianDay += 1;
  assert.throws(() => verifyNativeHouseRegressionBundle(wrongFixture), /E_LATITUDE_COMPARE_FIXTURE/);
});

test('CLI accepts a single Windows UTF-16LE/BOM portable file without Rust', () => {
  const script = fileURLToPath(new URL(
    '../scripts/verify-native-house-regression-bundle.mjs', import.meta.url));
  const dir = mkdtempSync(path.join(tmpdir(), 'vs-portable-house-'));
  try {
    const receipt = path.join(dir, 'house-regression-bundle.json');
    writeFileSync(receipt, `\uFEFF${JSON.stringify(makeBundle())}`, 'utf16le');
    const run = spawnSync(process.execPath, [script, '--bundle', receipt], {encoding: 'utf8'});
    assert.equal(run.status, 0, run.stderr);
    assert.equal(JSON.parse(run.stdout).reportHashesChecked, 5);
    const missing = spawnSync(process.execPath, [script], {encoding: 'utf8'});
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /E_NATIVE_BUNDLE_OPTIONS/);
    const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
    assert.equal(help.status, 0);
    assert.match(help.stdout, /not.*scientific|scientific.*correctness/i);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
