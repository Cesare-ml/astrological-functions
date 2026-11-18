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
  parseNativeRegressionOptions, preflightNativeRegression, saveNativeHouseRegressionEvidence,
  snapshotNativeAddon} from
  '../scripts/run-native-house-latitude-regression.mjs';
import {NATIVE_HOUSE_BUNDLE_FILES, verifyNativeHouseRegressionBundle} from
  '../scripts/verify-native-house-regression-bundle.mjs';

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
    assert.doesNotThrow(() => assertNativeAddonBuildUpdated(null, before));
    assert.throws(() => assertNativeAddonBuildUpdated(before, snapshotNativeAddon(addon)),
      /E_NATIVE_REGRESSION_STALE_ADDON/);
    assert.throws(() => assertNativeAddonBuildUpdated(before, null),
      /E_NATIVE_REGRESSION_ADDON/);

    writeFileSync(addon, 'simulated native bytes v2');
    const changed = snapshotNativeAddon(addon);
    assert.notEqual(changed.sha256, before.sha256);
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
    assert.throws(() => saveNativeHouseRegressionEvidence(options.outDir, evidence),
      /E_NATIVE_REGRESSION_OUTPUT/);
    assert.deepEqual(JSON.parse(readFileSync(saved.bundleFile, 'utf8')), portable,
      'a repeated execution must not overwrite the previous report');
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
  assert.match(source, /if \(-not \$CheckOnly\)/);
  assert.doesNotMatch(source, /&\s*git\s+(?:checkout|pull|merge|reset)/i);
});
