import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE} from '../scripts/verify-native-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES} from '../scripts/audit-native-house-latitudes.mjs';
import {auditNativeHouseAngleOrientation} from '../scripts/audit-native-house-angle-orientation.mjs';
import {diffNativeHouseLatitudes} from '../scripts/diff-native-house-latitudes.mjs';
import {buildNativeHouseMethodReviewQueue} from
  '../scripts/build-native-house-method-review-queue.mjs';
import {canonicalReportSha256, formatNativeHouseRegressionTriage,
  NATIVE_HOUSE_BUNDLE_FILES,
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
  const rawBaseline = Buffer.from(`\uFEFF${JSON.stringify(baseline)}`, 'utf16le');
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
  const methodReview = buildNativeHouseMethodReviewQueue(baseline, nativeGrid);
  const review = orientation.flagged > 0;
  const summary = {contract: 'VirgoStarsNativeHouseRegressionBundleV1',
    status: review ? 'MANUAL_METHOD_REVIEW_REQUIRED' : 'STRUCTURAL_CHECKS_COMPLETE_NOT_CERTIFIED',
    scientificallyCertified: false,
    nativeBuildOriginIndependentlyVerified: false,
    independentMethodParityVerified: false,
    expectedSourceCommitSha: commitSha(true), nativeAddonSha256: addonSha(true),
    baselineReceiptSha256: createHash('sha256').update(rawBaseline).digest('hex'),
    baselinePassed: baseline.passed, baselineFailed: baseline.failed,
    currentPassed: nativeGrid.passed, currentFailed: nativeGrid.failed,
    attempted: 161, smokePassed: smoke.passed, smokeFailed: smoke.failed,
    ascendantBranchesFlagged: orientation.flagged,
    pendingIndependentMethodReferences: methodReview.missingIndependentMethodReferences,
    pendingIndependentAngleReferences: methodReview.missingIndependentAngleReferences,
    errorToSuccess: versionDiff.errorToSuccess,
    successToError: versionDiff.successToError,
    errorCodesChanged: versionDiff.errorCodesChanged,
    successValuesChanged: versionDiff.successValuesChanged,
    sameAddonDigest: versionDiff.sameAddonDigest,
    files: [...Object.values(NATIVE_HOUSE_BUNDLE_FILES), 'house-regression-bundle.json']};
  const reports = {baseline, nativeGrid, smoke, orientation, versionDiff,
    methodReview, summary};
  const reportSha256 = Object.fromEntries(Object.keys(NATIVE_HOUSE_BUNDLE_FILES).map(
    key => [key, canonicalReportSha256(reports[key])]));
  return {contract: 'VirgoStarsNativeHouseRegressionEvidenceV1',
    scientificallyCertified: false, independentlyVerifiedBuildProvenance: false,
    comparisonToIndependentReferences: false,
    baselineSource: {rawBytesBase64: rawBaseline.toString('base64')},
    reports, reportSha256};
}

test('portable bundle checks hashes and recomputes 161-method diff and polar rising', () => {
  const bundle = makeBundle();
  const output = verifyNativeHouseRegressionBundle(bundle);
  assert.equal(output.contract, 'VirgoStarsNativeHouseBundleVerificationV1');
  assert.equal(output.status, 'INTERNAL_CONSISTENCY_VERIFIED_NOT_CERTIFIED');
  assert.equal(output.attempted, 161);
  assert.equal(output.reportHashesChecked, 6);
  assert.equal(output.independentMethodReferencesStillNeeded, 161);
  assert.equal(output.independentAngleReferencesStillNeeded, 7);
  assert.equal(output.originalBaselineSha256Checked, true);
  assert.equal(output.flaggedAscendants, 0);
  assert.equal(output.scientificallyCertified, false);
  assert.equal(output.nativeBuildOriginIndependentlyVerified, false);
  assert.equal(output.independentMethodParityVerified, false);
  assert.equal(bundle.reports.orientation.scenarios[6].status, 'RISING_BRANCH');
  assert.ok(Math.abs(bundle.reports.versionDiff.scenarios[6]
    .angleDeltaArcsec.ascendantDeg - 648000) < 1e-6);
  assert.equal(bundle.reports.methodReview.methods.length, 161);
  assert.equal(bundle.reports.methodReview.angles.length, 7);
  assert.equal(bundle.reports.methodReview.priorities.P4_STILL_REQUIRES_INDEPENDENT_REFERENCE, 161);
  const triage = formatNativeHouseRegressionTriage(bundle);
  assert.match(triage, /NOT SCIENTIFICALLY CERTIFIED/);
  assert.match(triage, /Seven synthetic latitude cases:/);
  assert.match(triage, /N_HIGH_80 \(80°\): 23\/23 -> 23\/23/);
  assert.match(triage, /ASC RISING_BRANCH; delta 648000\.000 arcsec/);
  assert.match(triage, /Identical addon digest: NO/);
  assert.equal(triage.split('\n').filter(line =>
    /\((?:-?80|-?66\.55|-?45|0)°\):/.test(line)).length, 7);
});

test('human-review queue distinguishes new, persistent, recovered, changed errors and cusps', () => {
  const {baseline, nativeGrid} = makeBundle().reports;
  function markError(grid, index, houseSystem, code) {
    const scenario = grid.scenarios[index];
    const position = scenario.results.findIndex(row => row.houseSystem === houseSystem);
    assert.notEqual(position, -1);
    scenario.results.splice(position, 1);
    scenario.failures.push({houseSystem, code, message: 'Synthetic unresolved method'});
    scenario.passed--;
    scenario.failed++;
    grid.passed--;
    grid.failed++;
    grid.status = 'METHOD_ERRORS_REQUIRE_MANUAL_REVIEW';
  }
  markError(baseline, 0, 'PLACIDUS', 'POLAR_HOUSES_UNAVAILABLE');
  markError(nativeGrid, 0, 'PLACIDUS', 'POLAR_HOUSES_UNAVAILABLE');
  markError(baseline, 1, 'KOCH', 'POLAR_HOUSES_UNAVAILABLE');
  markError(nativeGrid, 2, 'GAUQUELIN_36', 'GAUQUELIN_CUSPS_UNAVAILABLE');
  markError(baseline, 3, 'CAMPANUS', 'DEGENERATE_QUADRANTS');
  markError(nativeGrid, 3, 'CAMPANUS', 'HOUSE_GEOMETRY_UNAVAILABLE');
  nativeGrid.scenarios[4].results.find(row => row.houseSystem === 'MERIDIAN')
    .valuesDeg[0] += 1;
  const queue = buildNativeHouseMethodReviewQueue(baseline, nativeGrid);
  assert.deepEqual(queue.priorities, {
    P0_NEW_METHOD_FAILURE: 1, P1_CHANGED_ERROR_CODE: 1,
    P1_PERSISTENT_METHOD_FAILURE: 1, P2_RECOVERED_METHOD: 1,
    P3_CHANGED_NUMERIC_CUSPS: 1, P4_STILL_REQUIRES_INDEPENDENT_REFERENCE: 156,
  });
  assert.equal(queue.attempted, 161);
  assert.equal(queue.currentMethodFailures, 3);
  assert.equal(queue.missingIndependentMethodReferences, 161);
  assert.equal(queue.missingIndependentAngleReferences, 7);
  assert.equal(queue.polarMethodAvailabilityIndependentlyVerified, false);
  assert.equal(queue.methods.filter(row => row.reviewStatus !==
    'PENDING_INDEPENDENT_REVIEW').length, 0);
  assert.equal(queue.methods.find(row => row.triage === 'P0_NEW_METHOD_FAILURE')
    .requiredEvidence, 'INDEPENDENT_METHOD_AVAILABILITY_REFERENCE');
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
  const forgedReview = structuredClone(makeBundle());
  forgedReview.reports.methodReview.methods[0].reviewStatus = 'SCIENTIFICALLY_APPROVED';
  forgedReview.reportSha256.methodReview =
    canonicalReportSha256(forgedReview.reports.methodReview);
  assert.throws(() => verifyNativeHouseRegressionBundle(forgedReview), /E_NATIVE_BUNDLE_REVIEW_QUEUE/);
  const wrongFixture = makeBundle();
  wrongFixture.reports.baseline.scenarios[3].fixture.ttJulianDay += 1;
  assert.throws(() => verifyNativeHouseRegressionBundle(wrongFixture), /E_NATIVE_BUNDLE_BASELINE/);
  const rawTamper = makeBundle();
  rawTamper.baselineSource.rawBytesBase64 = Buffer.from('a fabricated old receipt').toString('base64');
  assert.throws(() => verifyNativeHouseRegressionBundle(rawTamper), /E_NATIVE_BUNDLE_BASELINE/);
  assert.throws(() => formatNativeHouseRegressionTriage(rawTamper),
    /E_NATIVE_BUNDLE_BASELINE/, 'triage must never summarize an invalid bundle');
  const rehashedWrongBaseline = makeBundle();
  rehashedWrongBaseline.reports.summary.baselineReceiptSha256 = 'a'.repeat(64);
  rehashedWrongBaseline.reportSha256.summary =
    canonicalReportSha256(rehashedWrongBaseline.reports.summary);
  assert.throws(() => verifyNativeHouseRegressionBundle(rehashedWrongBaseline),
    /E_NATIVE_BUNDLE_BASELINE/);
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
    assert.equal(JSON.parse(run.stdout).reportHashesChecked, 6);
    const human = spawnSync(process.execPath, [script, '--bundle', receipt, '--triage'],
      {encoding: 'utf8'});
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /Seven synthetic latitude cases:/);
    assert.match(human.stdout, /161 method outcomes, 7 angle sets/);
    assert.doesNotMatch(human.stdout, /"contract"/);
    const pinned = spawnSync(process.execPath, [script, '--bundle', receipt,
      '--expected-commit', 'c'.repeat(40), '--expected-baseline-sha256',
      makeBundle().reports.summary.baselineReceiptSha256], {encoding: 'utf8'});
    assert.equal(pinned.status, 0, pinned.stderr);
    const wrongCommit = spawnSync(process.execPath, [script, '--bundle', receipt,
      '--expected-commit', 'd'.repeat(40)], {encoding: 'utf8'});
    assert.equal(wrongCommit.status, 1);
    assert.match(wrongCommit.stderr, /E_NATIVE_BUNDLE_EXPECTED_COMMIT/);
    const wrongBaseline = spawnSync(process.execPath, [script, '--bundle', receipt,
      '--expected-baseline-sha256', 'a'.repeat(64)], {encoding: 'utf8'});
    assert.equal(wrongBaseline.status, 1);
    assert.match(wrongBaseline.stderr, /E_NATIVE_BUNDLE_EXPECTED_BASELINE/);
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
