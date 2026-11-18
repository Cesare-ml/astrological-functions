import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync,
  utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE} from '../scripts/verify-native-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES} from '../scripts/audit-native-house-latitudes.mjs';
import {assembleNativeHouseRegressionEvidence, assertNativeAddonBuildUpdated,
  assertNativeAddonStillPinned,
  assertPinnedNativeSource,
  parseNativeRegressionOptions, preflightNativeRegression, saveNativeHouseRegressionEvidence,
  snapshotNativeAddon, verifySavedNativeHouseRegressionEvidence} from
  '../scripts/run-native-house-latitude-regression.mjs';
import {NATIVE_HOUSE_BUNDLE_FILES, verifyNativeHouseRegressionBundle} from
  '../scripts/verify-native-house-regression-bundle.mjs';
import {createNativeHouseReviewWorksheetCsv, NATIVE_HOUSE_REVIEW_COLUMNS, reviewCsvCell} from
  '../scripts/export-native-house-review-worksheet.mjs';
import {createNativeHouseReferenceFromWorksheet, parseNativeHouseReviewCsv} from
  '../scripts/import-native-house-review-worksheet.mjs';

function baseline() {
  const methods = ASTRO_COM_HOUSE_SYSTEM_IDS.filter(id => id !== 'SUNSHINE');
  const scenarios = LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}) => ({
    id, fixture: {...HOUSE_SMOKE_FIXTURE, id, latitudeDeg},
    sourceAngles: {model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
      armcDeg: 292, ascendantDeg: 34, midheavenDeg: 291, trueObliquityDeg: 23.4},
    attempted: 23, passed: 23, failed: 0, failures: [],
    results: methods.map(houseSystem => ({houseSystem,
      valuesDeg: Array.from({length: houseSystem === 'GAUQUELIN_36' ? 36 : 12},
        (_, i) => i * (houseSystem === 'GAUQUELIN_36' ? 10 : 30))})),
  }));
  return {contract: 'VirgoStarsNativeHouseLatitudeAuditV1',
    status: 'STRUCTURAL_GRID_COMPLETE_NOT_CERTIFIED',
    scientificallyCertified: false, highLatitudeMethodParityVerified: false,
    expectedPolarAvailabilityVerified: false, resultsAreIndependentReferences: false,
    scenarioCount: 7, attempted: 161, passed: 161, failed: 0,
    blocked: [{houseSystem: 'SUNSHINE', reason: 'APPARENT_DECLINATION_UNAVAILABLE'}],
    scenarios, ephemeris: {upstreamCommitSha: 'a'.repeat(40),
      nativeAddonSha256: 'b'.repeat(64), kernelContext: 'HOUSE_ANGLES_NO_KERNEL',
      kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441',
      addonBuiltFromSelectedCommitIndependentlyVerified: false}};
}

function git(checkout, ...args) {
  return execFileSync('git', ['-C', checkout, ...args], {encoding: 'utf8'}).trim();
}

/** Build a tiny isolated Git repository, never any consumer or owner checkout. */
function setup() {
  const folder = mkdtempSync(path.join(tmpdir(), 'vs-native-regression-'));
  const checkout = path.join(folder, 'ephemeris');
  const binding = path.join(checkout, 'bindings', 'node');
  const scripts = path.join(binding, 'scripts');
  mkdirSync(scripts, {recursive: true});
  writeFileSync(path.join(binding, 'package.json'), '{"private":true,"scripts":{"build":"exit 1"}}');
  writeFileSync(path.join(scripts, 'build-native.mjs'), '// test fixture, intentionally never run');
  execFileSync('git', ['init', '-q', checkout]);
  git(checkout, 'add', 'bindings/node/package.json', 'bindings/node/scripts/build-native.mjs');
  git(checkout, '-c', 'user.name=Test', '-c', 'user.email=unit@example.invalid',
    'commit', '-qm', 'synthetic pinned checkout');
  const old = path.join(folder, 'before.json');
  writeFileSync(old, `\uFEFF${JSON.stringify(baseline())}`, 'utf16le');
  const expectedBaselineSha256 = createHash('sha256').update(readFileSync(old)).digest('hex');
  const outDir = path.join(folder, 'new-receipts');
  return {folder, checkout, baseline: old, outDir,
    expectedBaselineSha256,
    expectedCommit: git(checkout, 'rev-parse', 'HEAD'),
    kernelContext: 'HOUSE_ANGLES_NO_KERNEL'};
}

test('worksheet CSV parser preserves quoted metadata and rejects malformed records', () => {
  assert.deepEqual(parseNativeHouseReviewCsv('\uFEFF"name","note"\r\n"a""b","line 1\r\nline 2"\r\n'),
    [['name', 'note'], ['a"b', 'line 1\r\nline 2']]);
  assert.deepEqual(parseNativeHouseReviewCsv('\uFEFFsep=;\r\n"name";"note"\r\n"a""b";"one;two"\r\n'),
    [['name', 'note'], ['a"b', 'one;two']]);
  assert.deepEqual(parseNativeHouseReviewCsv('sep=,\r\n"name","note"\r\n"a","b"\r\n'),
    [['name', 'note'], ['a', 'b']]);
  assert.throws(() => parseNativeHouseReviewCsv('"unterminated'), /E_NATIVE_WORKSHEET_CSV/);
  assert.throws(() => parseNativeHouseReviewCsv('"a"junk,b'), /E_NATIVE_WORKSHEET_CSV/);
  assert.throws(() => parseNativeHouseReviewCsv('"name";"note","extra"\n'),
    /E_NATIVE_WORKSHEET_DELIMITER/);
  assert.throws(() => parseNativeHouseReviewCsv('sep=;\n"name","note"\n'),
    /E_NATIVE_WORKSHEET_DELIMITER/);
});

test('single-command runner validates fully pinned clean repo and UTF-16LE baseline', () => {
  const fixture = setup();
  try {
    const options = parseNativeRegressionOptions([
      '--checkout', fixture.checkout, '--expected-commit', fixture.expectedCommit,
      '--baseline', fixture.baseline, '--out-dir', fixture.outDir,
      '--expected-baseline-sha256', fixture.expectedBaselineSha256,
      '--kernel-context', fixture.kernelContext]);
    const selected = preflightNativeRegression(options);
    assert.equal(selected.baseline.attempted, 161);
    assert.equal(selected.baseline.passed, 161);
    assert.match(selected.baselineSha256, /^[a-f\d]{64}$/);
    assert.equal(selected.checkout, fixture.checkout);
    assert.equal(existsSync(fixture.outDir), false,
      'preflight must not create output or compile a native addon');
    assert.equal(existsSync(path.join(fixture.checkout, 'bindings', 'node', 'native')), false);
  } finally {
    rmSync(fixture.folder, {recursive: true, force: true});
  }
});

test('preflight refuses unpinned/dirty checkout, changed context and occupied output', () => {
  const fixture = setup();
  const base = parseNativeRegressionOptions([
    '--checkout', fixture.checkout, '--expected-commit', fixture.expectedCommit,
    '--baseline', fixture.baseline, '--out-dir', fixture.outDir,
    '--expected-baseline-sha256', fixture.expectedBaselineSha256,
    '--kernel-context', fixture.kernelContext]);
  try {
    assert.throws(() => preflightNativeRegression({...base,
      expectedCommit: 'f'.repeat(40)}), /E_NATIVE_REGRESSION_COMMIT/);
    assert.throws(() => preflightNativeRegression({...base,
      kernelContext: 'WRONG_CONTEXT'}), /E_NATIVE_REGRESSION_CONTEXT/);
    assert.throws(() => preflightNativeRegression({...base,
      expectedBaselineSha256: 'a'.repeat(64)}), /E_NATIVE_REGRESSION_BASELINE_SHA256/);
    assert.throws(() => preflightNativeRegression({...base,
      outDir: path.join(fixture.checkout, 'reports')}), /E_NATIVE_REGRESSION_OUTPUT/);
    assert.throws(() => preflightNativeRegression({...base,
      outDir: path.join(fixture.checkout, '.git', 'objects', 'reports')}),
    /E_NATIVE_REGRESSION_OUTPUT/);
    assert.throws(() => preflightNativeRegression({...base,
      outDir: path.join(fixture.folder, '.git', 'reports')}),
    /E_NATIVE_REGRESSION_OUTPUT/);
    const link = path.join(fixture.folder, 'linked-rust-source');
    try {
      symlinkSync(fixture.checkout, link, 'dir');
      assert.throws(() => preflightNativeRegression({...base,
        outDir: path.join(link, 'indirect-reports')}), /E_NATIVE_REGRESSION_OUTPUT/);
    } catch (error) {
      if (process.platform !== 'win32' ||
          (error.code !== 'EPERM' && error.code !== 'EACCES')) throw error;
    }
    const reusedSource = baseline();
    reusedSource.ephemeris.upstreamCommitSha = fixture.expectedCommit;
    const reusedBaseline = path.join(fixture.folder, 'same-commit.json');
    writeFileSync(reusedBaseline, JSON.stringify(reusedSource));
    assert.throws(() => preflightNativeRegression({...base, baseline: reusedBaseline,
      expectedBaselineSha256: createHash('sha256').update(readFileSync(reusedBaseline))
        .digest('hex')}),
      /E_NATIVE_REGRESSION_UNCHANGED_COMMIT/);
    mkdirSync(fixture.outDir);
    writeFileSync(path.join(fixture.outDir, 'keep-user-file.txt'), 'do not touch');
    assert.throws(() => preflightNativeRegression(base), /E_NATIVE_REGRESSION_OUTPUT/);
    assert.equal(existsSync(path.join(fixture.outDir, 'keep-user-file.txt')), true);
    writeFileSync(path.join(fixture.checkout, 'bindings', 'node', 'package.json'), '{}');
    assert.throws(() => preflightNativeRegression(base), /E_NATIVE_REGRESSION_DIRTY/);
  } finally {
    rmSync(fixture.folder, {recursive: true, force: true});
  }
});

test('pinned Rust checkout is rechecked after build and before evidence save', () => {
  const fixture = setup();
  const packageFile = path.join(fixture.checkout, 'bindings', 'node', 'package.json');
  try {
    assert.doesNotThrow(() => assertPinnedNativeSource(fixture.checkout,
      fixture.expectedCommit));
    writeFileSync(packageFile, '{"private":true,"scripts":{"build":"exit 0"}}');
    assert.throws(() => assertPinnedNativeSource(fixture.checkout,
      fixture.expectedCommit), /E_NATIVE_REGRESSION_DIRTY/);
    writeFileSync(packageFile, '{"private":true,"scripts":{"build":"exit 1"}}');
    assert.doesNotThrow(() => assertPinnedNativeSource(fixture.checkout,
      fixture.expectedCommit));
    git(fixture.checkout, '-c', 'user.name=Test', '-c', 'user.email=unit@example.invalid',
      'commit', '--allow-empty', '-qm', 'simulated concurrent HEAD change');
    assert.throws(() => assertPinnedNativeSource(fixture.checkout,
      fixture.expectedCommit), /E_NATIVE_REGRESSION_COMMIT/);
    assert.equal(existsSync(fixture.outDir), false,
      'rejecting source drift must not create any evidence directory');
  } finally {
    rmSync(fixture.folder, {recursive: true, force: true});
  }
});

test('runner requires explicit inputs; --help never starts building', () => {
  const script = fileURLToPath(new URL(
    '../scripts/run-native-house-latitude-regression.mjs', import.meta.url));
  assert.throws(() => parseNativeRegressionOptions([]), /E_NATIVE_REGRESSION_OPTIONS/);
  assert.throws(() => parseNativeRegressionOptions(['--checkout', '/tmp/example']),
    /E_NATIVE_REGRESSION_OPTIONS/);
  assert.deepEqual(parseNativeRegressionOptions(['--help']), {help: true});
  const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /no scientific|scientific.*parity/i);
  assert.match(help.stdout, /overwrites existing files/i);
  const noArgs = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(noArgs.status, 1);
  assert.match(noArgs.stderr, /E_NATIVE_REGRESSION_OPTIONS/);
});

test('--check-only validates genuine input bytes without building or writing files', () => {
  const fixture = setup();
  const script = fileURLToPath(new URL(
    '../scripts/run-native-house-latitude-regression.mjs', import.meta.url));
  try {
    const args = [script, '--checkout', fixture.checkout,
      '--expected-commit', fixture.expectedCommit,
      '--baseline', fixture.baseline,
      '--expected-baseline-sha256', fixture.expectedBaselineSha256,
      '--out-dir', fixture.outDir,
      '--kernel-context', fixture.kernelContext, '--check-only'];
    const check = spawnSync(process.execPath, args, {encoding: 'utf8'});
    assert.equal(check.status, 0, check.stderr);
    const result = JSON.parse(check.stdout);
    assert.equal(result.contract, 'VirgoStarsNativeHouseRegressionPreflightV1');
    assert.equal(result.sourceCommitSha, fixture.expectedCommit);
    assert.equal(result.baselineReceiptSha256, fixture.expectedBaselineSha256);
    assert.equal(result.attempted, 161);
    assert.equal(result.status, 'INPUTS_CHECKED_NO_BUILD_OR_WRITES');
    assert.equal(existsSync(fixture.outDir), false);
    assert.equal(existsSync(path.join(fixture.checkout, 'bindings', 'node', 'native')), false);
    const wrong = spawnSync(process.execPath, args.map(arg => arg === fixture.expectedCommit
      ? 'f'.repeat(40) : arg), {encoding: 'utf8'});
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /E_NATIVE_REGRESSION_COMMIT/);
    assert.equal(existsSync(fixture.outDir), false);
  } finally {
    rmSync(fixture.folder, {recursive: true, force: true});
  }
});

test('native build checks refuse stale binary and symlinked output without deleting data', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'vs-native-addon-'));
  try {
    const nativeDir = path.join(fixture, 'native');
    const addon = path.join(nativeDir, 'virgostars_ephemeris.node');
    assert.equal(snapshotNativeAddon(addon), null);
    mkdirSync(nativeDir);
    writeFileSync(addon, 'simulated native bytes v1');
    const before = snapshotNativeAddon(addon);
    assert.match(before.sha256, /^[a-f\d]{64}$/);
    assert.doesNotThrow(() => assertNativeAddonStillPinned(addon, before.sha256));
    assert.doesNotThrow(() => assertNativeAddonBuildUpdated(null, before));
    assert.throws(() => assertNativeAddonBuildUpdated(before, snapshotNativeAddon(addon)),
      /E_NATIVE_REGRESSION_STALE_ADDON/);
    assert.throws(() => assertNativeAddonBuildUpdated(before, null),
      /E_NATIVE_REGRESSION_ADDON/);

    writeFileSync(addon, 'simulated native bytes v2');
    const changed = snapshotNativeAddon(addon);
    assert.notEqual(changed.sha256, before.sha256);
    assert.throws(() => assertNativeAddonStillPinned(addon, before.sha256),
      /E_NATIVE_REGRESSION_ADDON_DRIFT/);
    assert.doesNotThrow(() => assertNativeAddonStillPinned(addon, changed.sha256));
    assert.doesNotThrow(() => assertNativeAddonBuildUpdated(before, changed));
    // An identical reproducible binary is still acceptable when actually recopied.
    writeFileSync(addon, 'simulated native bytes v1');
    utimesSync(addon, new Date(2_000_000_000_000), new Date(2_000_000_000_000));
    const recopied = snapshotNativeAddon(addon);
    assert.equal(recopied.sha256, before.sha256);
    assert.notEqual(recopied.mtimeMs, before.mtimeMs);
    assert.doesNotThrow(() => assertNativeAddonBuildUpdated(before, recopied));

    const link = path.join(fixture, 'linked.node');
    try {
      symlinkSync(addon, link);
    } catch (error) {
      // Some Windows installations cannot create symlinks without Developer Mode.
      if (process.platform === 'win32' &&
          (error.code === 'EPERM' || error.code === 'EACCES')) return;
      throw error;
    }
    assert.throws(() => snapshotNativeAddon(link), /E_NATIVE_REGRESSION_ADDON_PATH/);
    assert.equal(readFileSync(addon, 'utf8'), 'simulated native bytes v1');
    const linkedOutputDir = path.join(fixture, 'linked-native');
    try {
      symlinkSync(nativeDir, linkedOutputDir, 'dir');
    } catch (error) {
      if (process.platform === 'win32' &&
          (error.code === 'EPERM' || error.code === 'EACCES')) return;
      throw error;
    }
    assert.throws(() => snapshotNativeAddon(path.join(linkedOutputDir,
      'virgostars_ephemeris.node')), /E_NATIVE_REGRESSION_ADDON_PATH/);
    assert.throws(() => assertNativeAddonStillPinned(link, changed.sha256),
      /E_NATIVE_REGRESSION_ADDON_PATH/);
  } finally {
    rmSync(fixture, {recursive: true, force: true});
  }
});

test('synthetic evidence flows through assembly, all seven files and offline verification', () => {
  const fixture = setup();
  try {
    const options = parseNativeRegressionOptions([
      '--checkout', fixture.checkout, '--expected-commit', fixture.expectedCommit,
      '--baseline', fixture.baseline, '--out-dir', fixture.outDir,
      '--expected-baseline-sha256', fixture.expectedBaselineSha256,
      '--kernel-context', fixture.kernelContext]);
    const selected = preflightNativeRegression(options);
    const audit = baseline();
    const addonHash = 'c'.repeat(64);
    audit.ephemeris.upstreamCommitSha = options.expectedCommit;
    audit.ephemeris.nativeAddonSha256 = addonHash;
    // Synthetic rising geometry isolates the binary-identity gate from polar flags.
    const risingAsc = [7.16881630295217, 12.481452337837476,
      17.42420249955754, 24.778143295766903, 41.09682061519927,
      100.47525199627685, 344.5489205114233];
    for (const [i, row] of audit.scenarios.entries()) {
      row.sourceAngles = {model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
        armcDeg: 292.95347186375847, ascendantDeg: risingAsc[i],
        midheavenDeg: 291.23482098822, trueObliquityDeg: 23.437676823739082};
    }
    const smoke = {contract: 'VirgoStarsNativeHouseSmokeV1',
      status: 'NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY',
      validatedScientificParity: false,
      addonBuiltFromSelectedCommitIndependentlyVerified: false,
      ephemeris: {...audit.ephemeris}, fixture: HOUSE_SMOKE_FIXTURE,
      attempted: 23, passed: 23, failed: 0, failures: [],
      blocked: [{houseSystem: 'SUNSHINE',
        reason: 'INDEPENDENT_APPARENT_SUN_DECLINATION_NOT_SUPPLIED'}],
      results: structuredClone(audit.scenarios[3].results)};
    const nativeOptions = {checkout: fixture.checkout,
      expectedCommit: fixture.expectedCommit,
      expectedAddonSha256: addonHash, kernelContext: fixture.kernelContext};
    const args = {selected, options, nativeOptions, audit, smoke};
    const evidence = assembleNativeHouseRegressionEvidence(args);
    assert.equal(existsSync(options.outDir), false, 'assembly must be entirely in memory');
    const verified = verifyNativeHouseRegressionBundle(evidence.bundle);
    assert.equal(verified.attempted, 161);
    assert.equal(verified.reportHashesChecked, 6);
    assert.equal(verified.flaggedAscendants, 0);
    assert.equal(verified.sameAddonDigest, false);
    assert.equal(evidence.summary.status, 'STRUCTURAL_CHECKS_COMPLETE_NOT_CERTIFIED');
    assert.equal(evidence.summary.scientificallyCertified, false);

    const unchangedGrid = structuredClone(audit);
    const unchangedSmoke = structuredClone(smoke);
    unchangedGrid.ephemeris.nativeAddonSha256 = selected.baseline.ephemeris.nativeAddonSha256;
    unchangedSmoke.ephemeris.nativeAddonSha256 = selected.baseline.ephemeris.nativeAddonSha256;
    const suspect = assembleNativeHouseRegressionEvidence({...args,
      audit: unchangedGrid, smoke: unchangedSmoke,
      nativeOptions: {...nativeOptions,
        expectedAddonSha256: selected.baseline.ephemeris.nativeAddonSha256}});
    assert.equal(suspect.summary.status, 'MANUAL_METHOD_REVIEW_REQUIRED',
      'identical binary digests need review even without method or rising failures');
    assert.equal(verifyNativeHouseRegressionBundle(suspect.bundle).sameAddonDigest, true);
    assert.equal(existsSync(options.outDir), false, 'digest review may not write evidence');

    const invalidSmoke = {...smoke, passed: 22};
    assert.throws(() => assembleNativeHouseRegressionEvidence({...args,
      smoke: invalidSmoke}), /E_NATIVE_BUNDLE_SMOKE/);
    assert.equal(existsSync(options.outDir), false,
      'a malformed smoke may not leave partial evidence');

    const redirectTarget = path.join(fixture.folder, 'redirect-target');
    const redirected = path.join(fixture.folder, 'redirected-receipts');
    mkdirSync(redirectTarget);
    let linked = false;
    try {
      symlinkSync(redirectTarget, redirected, 'dir');
      linked = true;
    } catch (error) {
      if (process.platform !== 'win32' ||
          (error.code !== 'EPERM' && error.code !== 'EACCES')) throw error;
    }
    if (linked) {
      assert.throws(() => saveNativeHouseRegressionEvidence(redirected, evidence),
        /E_NATIVE_REGRESSION_OUTPUT/);
      assert.equal(readdirSync(redirectTarget).length, 0,
        'a symlink cannot silently redirect the evidence destination');
    }

    const saved = saveNativeHouseRegressionEvidence(options.outDir, evidence);
    assert.equal(readdirSync(options.outDir).length, 7);
    assert.equal(verifySavedNativeHouseRegressionEvidence(options.outDir, evidence).filesChecked,
      7);
    assert.equal(saved.auditFile, path.join(options.outDir, 'house-latitudes-new.json'));
    assert.equal(saved.bundleFile, path.join(options.outDir, 'house-regression-bundle.json'));
    for (const [key, filename] of Object.entries(NATIVE_HOUSE_BUNDLE_FILES)) {
      const bytes = readFileSync(path.join(options.outDir, filename));
      assert.deepEqual(JSON.parse(bytes.toString('utf8')), evidence.bundle.reports[key]);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),
        evidence.bundle.reportSha256[key]);
    }
    const portable = JSON.parse(readFileSync(saved.bundleFile, 'utf8'));
    assert.equal(verifyNativeHouseRegressionBundle(portable).attempted, 161);
    assert.equal(portable.reports.summary.baselineReceiptSha256,
      fixture.expectedBaselineSha256);
    const worksheet = createNativeHouseReviewWorksheetCsv(portable);
    assert.ok(worksheet.startsWith('\uFEFF'));
    const worksheetRows = worksheet.slice(1).trimEnd().split('\r\n');
    assert.equal(worksheetRows.length, 169, 'one header, 161 methods and seven angle rows');
    assert.equal(worksheetRows.filter(row => row.startsWith('"METHOD",')).length, 161);
    assert.equal(worksheetRows.filter(row => row.startsWith('"ANGLES",')).length, 7);
    assert.ok(worksheetRows.slice(1).every(row => row.endsWith(',"","","","","","","","","",""')),
      'independent source, expectation and review fields must stay empty');
    assert.equal(reviewCsvCell('=HYPERLINK("https://invalid.example")'),
      '"\'=HYPERLINK(""https://invalid.example"")"');
    assert.equal(reviewCsvCell(-80), '"-80"', 'signed numeric latitudes must be preserved');
    assert.equal(reviewCsvCell('-80'), '"-80"', 'CSV editor round trips keep numeric latitudes');

    const emptyReview = createNativeHouseReferenceFromWorksheet(portable, worksheet);
    assert.equal(emptyReview.comparison.methodsCompared, 0);
    assert.equal(emptyReview.comparison.missingMethodReferences.length, 161);
    assert.equal(emptyReview.comparison.missingAngleReferences.length, 7);
    const worksheetCells = parseNativeHouseReviewCsv(worksheet);
    assert.equal(worksheetCells.length, 169);
    const index = name => NATIVE_HOUSE_REVIEW_COLUMNS.indexOf(name);
    const fillSource = row => {
      row[index('reference_source_title')] = 'SYNTHETIC_TEST_REFERENCE_NOT_SCIENTIFIC';
      row[index('reference_source_url')] = 'https://example.invalid/test-only';
      row[index('reference_source_acquired_utc')] = '2026-11-18T12:00:00Z';
      row[index('reference_source_convention')] = 'SYNTHETIC_TEST_ONLY_NO_INDEPENDENCE';
      row[index('reference_expected_availability')] = 'AVAILABLE';
      row[index('reference_tolerance_arcsec')] = '1.5';
      row[index('reference_tolerance_rationale')] = 'Synthetic regression parser fixture';
    };
    fillSource(worksheetCells[1]);
    worksheetCells[1][index('reference_expected_values_degrees')] =
      Array.from({length: 12}, (_, i) => i * 30 + 0.5).join(';');
    const angleRow = worksheetCells.find(row => row[0] === 'ANGLES');
    fillSource(angleRow);
    angleRow[index('reference_expected_values_degrees')] = '292;7;291;23.4';
    const filledReview = `\uFEFF${worksheetCells.map(row =>
      row.map(reviewCsvCell).join(',')).join('\r\n')}\r\n`;
    const reviewed = createNativeHouseReferenceFromWorksheet(portable, filledReview);
    const italianCsv = `\uFEFFsep=;\r\n${worksheetCells.map(row =>
      row.map(reviewCsvCell).join(';')).join('\r\n')}\r\n`;
    const italianReviewed = createNativeHouseReferenceFromWorksheet(portable, italianCsv);
    assert.deepEqual(italianReviewed, reviewed,
      'Italian Excel semicolon CSV must preserve all independent references');
    assert.equal(reviewed.comparison.methodsCompared, 1);
    assert.equal(reviewed.comparison.angleComparisons.length, 1);
    assert.equal(reviewed.comparison.missingMethodReferences.length, 160);
    assert.equal(reviewed.comparison.missingAngleReferences.length, 6);
    assert.equal(reviewed.comparison.status, 'NUMERICAL_OR_AVAILABILITY_MISMATCH');
    assert.equal(reviewed.reference.scenarios[0].methods[0].valuesDeg[0], 0.5,
      'only a reviewer-supplied numeric value may become a JSON expectation');
    const incompleteReview = filledReview.replace('Synthetic regression parser fixture', '');
    assert.throws(() => createNativeHouseReferenceFromWorksheet(portable, incompleteReview),
      /E_NATIVE_WORKSHEET_TOLERANCE/);
    const repeatedIdentity = worksheetCells.map(row => row.slice());
    repeatedIdentity[2].splice(0, 4, ...repeatedIdentity[1].slice(0, 4));
    const duplicateCsv = repeatedIdentity.map(row => row.map(reviewCsvCell).join(',')).join('\r\n');
    assert.throws(() => createNativeHouseReferenceFromWorksheet(portable, duplicateCsv),
      /E_NATIVE_WORKSHEET_IDENTITY/);
    const spoofedObserved = worksheetCells.map(row => row.slice());
    spoofedObserved[1][index('observed_outcome')] = 'SCIENTIFICALLY_VERIFIED';
    assert.throws(() => createNativeHouseReferenceFromWorksheet(portable,
      spoofedObserved.map(row => row.map(reviewCsvCell).join(',')).join('\r\n')),
    /E_NATIVE_WORKSHEET_OBSERVED/);
    const importedJsonPath = `${options.outDir}-independent-references-REVIEWED.json`;
    const filledCsvPath = `${options.outDir}-review-COMPLETED.csv`;
    writeFileSync(filledCsvPath, filledReview);
    const importArgs = ['scripts/import-native-house-review-worksheet.mjs', '--bundle', saved.bundleFile,
        '--worksheet', filledCsvPath, '--out', importedJsonPath,
        '--expected-commit', options.expectedCommit,
        '--expected-baseline-sha256', fixture.expectedBaselineSha256];
    const importRun = spawnSync(process.execPath, importArgs, {encoding: 'utf8'});
    assert.equal(importRun.status, 0, importRun.stderr);
    assert.deepEqual(JSON.parse(readFileSync(importedJsonPath, 'utf8')), reviewed.reference);
    assert.equal(JSON.parse(importRun.stdout).methodsEntered, 1);
    const importRepeat = spawnSync(process.execPath, importArgs, {encoding: 'utf8'});
    assert.equal(importRepeat.status, 1, 'a reviewer cannot overwrite an earlier reference set');
    assert.match(importRepeat.stderr, /EEXIST/);
    const importWrongPin = path.join(fixture.folder, 'wrong-import-pin.json');
    const importWrong = spawnSync(process.execPath,
      [...importArgs.slice(0, -1), 'f'.repeat(64)].map(arg =>
        arg === importedJsonPath ? importWrongPin : arg), {encoding: 'utf8'});
    assert.equal(importWrong.status, 1);
    assert.match(importWrong.stderr, /E_NATIVE_WORKSHEET_BASELINE/);
    assert.equal(existsSync(importWrongPin), false);

    const worksheetPath = `${options.outDir}-review-worksheet.csv`;
    const worksheetArgs = [
      'scripts/export-native-house-review-worksheet.mjs',
      '--bundle', saved.bundleFile, '--out', worksheetPath,
      '--expected-commit', options.expectedCommit,
      '--expected-baseline-sha256', fixture.expectedBaselineSha256,
    ];
    const worksheetRun = spawnSync(process.execPath, worksheetArgs,
      {encoding: 'utf8'});
    assert.equal(worksheetRun.status, 0, worksheetRun.stderr);
    assert.equal(readFileSync(worksheetPath, 'utf8'), worksheet);
    const worksheetRepeat = spawnSync(process.execPath, worksheetArgs,
      {encoding: 'utf8'});
    assert.equal(worksheetRepeat.status, 1, 'worksheet must never overwrite existing evidence');
    assert.match(worksheetRepeat.stderr, /EEXIST/);
    const wrongPinFile = path.join(fixture.folder, 'wrong-pin.csv');
    const worksheetWrongPin = spawnSync(process.execPath,
      [...worksheetArgs.slice(0, -1), 'f'.repeat(64)].map(arg =>
        arg === worksheetPath ? wrongPinFile : arg), {encoding: 'utf8'});
    assert.equal(worksheetWrongPin.status, 1);
    assert.match(worksheetWrongPin.stderr, /E_NATIVE_WORKSHEET_BASELINE/);
    assert.equal(existsSync(wrongPinFile), false);
    const templatePath = `${options.outDir}-independent-references-EMPTY.json`;
    const templateRun = spawnSync(process.execPath,
      ['scripts/create-native-house-reference-template.mjs', '--bundle', saved.bundleFile,
        '--out', templatePath, '--expected-commit', options.expectedCommit,
        '--expected-baseline-sha256', fixture.expectedBaselineSha256], {encoding: 'utf8'});
    assert.equal(templateRun.status, 0, templateRun.stderr);
    assert.equal(JSON.parse(readFileSync(templatePath, 'utf8')).scenarios.length, 7);
    assert.equal(readdirSync(options.outDir).length, 7,
      'review sidecars must not change the sealed evidence file count');
    assert.equal(verifySavedNativeHouseRegressionEvidence(options.outDir, evidence).filesChecked,
      7, 'review sidecars must not break byte-for-byte evidence read-back');
    assert.throws(() => saveNativeHouseRegressionEvidence(options.outDir, evidence),
      /E_NATIVE_REGRESSION_OUTPUT/);
    assert.deepEqual(JSON.parse(readFileSync(saved.bundleFile, 'utf8')), portable,
      'a repeated execution must not overwrite the previous report');
    const corruptedReport = path.join(options.outDir, NATIVE_HOUSE_BUNDLE_FILES.smoke);
    writeFileSync(corruptedReport, '{"tampered":true}\n');
    assert.throws(() => verifySavedNativeHouseRegressionEvidence(options.outDir, evidence),
      /E_NATIVE_REGRESSION_PERSIST/);
    assert.deepEqual(JSON.parse(readFileSync(saved.bundleFile, 'utf8')), portable,
      'verification failure must not silently overwrite or remove the portable bundle');
  } finally {
    rmSync(fixture.folder, {recursive: true, force: true});
  }
});

test('Windows launcher delegates to pinned native runner and has an explicit no-build mode', () => {
  const script = fileURLToPath(new URL(
    '../scripts/run-native-house-regression-windows.ps1', import.meta.url));
  const source = readFileSync(script, 'utf8');
  assert.match(source, /\[Parameter\(Mandatory = \$true\)\]/);
  assert.match(source, /\[switch\]\$CheckOnly/);
  assert.match(source, /'--expected-commit'/);
  assert.match(source, /'--expected-baseline-sha256'/);
  assert.match(source, /'--kernel-context', 'HOUSE_ANGLES_NO_KERNEL'/);
  assert.match(source, /'--check-only'/);
  assert.match(source, /'house-regression-bundle\.json'/);
  assert.match(source, /verify-native-house-regression-bundle\.mjs/);
  assert.match(source, /create-native-house-reference-template\.mjs/);
  assert.match(source, /export-native-house-review-worksheet\.mjs/);
  assert.match(source, /\$referenceTemplate = "\$\{OutputDirectory\}-independent-references-EMPTY\.json"/);
  assert.match(source, /\$reviewWorksheet = "\$\{OutputDirectory\}-review-worksheet\.csv"/);
  assert.match(source, /& node \$referenceTemplateTool --bundle \$bundle --out \$referenceTemplate --expected-commit \$expectedCommitLower --expected-baseline-sha256 \$expectedBaselineLower/);
  assert.match(source, /& node \$worksheetTool --bundle \$bundle --out \$reviewWorksheet --expected-commit \$expectedCommitLower --expected-baseline-sha256 \$expectedBaselineLower/);
  const postRunBranch = source.indexOf('if (-not $CheckOnly -and ($nativeExit -eq 0 -or $nativeExit -eq 2)) {');
  assert.ok(postRunBranch >= 0, 'review artifacts must only be generated after native success');
  assert.ok(source.indexOf('& node $referenceTemplateTool', postRunBranch) > postRunBranch);
  assert.ok(source.indexOf('& node $worksheetTool', postRunBranch) > postRunBranch);
  assert.match(source, /\$PSNativeCommandUseErrorActionPreference = \$false/);
  assert.match(source, /\$expectedCommitLower = \$ExpectedCommit\.ToLowerInvariant\(\)/);
  assert.match(source, /\$expectedBaselineLower = \$ExpectedBaselineSha256\.ToLowerInvariant\(\)/);
  assert.match(source, /--bundle \$bundle --expected-commit \$expectedCommitLower --expected-baseline-sha256 \$expectedBaselineLower --triage/);
  assert.match(source, /if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(source, /if \(-not \$CheckOnly\)/);
  assert.doesNotMatch(source, /&\s*git\s+(?:checkout|pull|merge|reset)/i);
});
