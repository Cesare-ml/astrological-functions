import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE} from '../scripts/verify-native-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES} from '../scripts/audit-native-house-latitudes.mjs';
import {parseNativeRegressionOptions, preflightNativeRegression} from
  '../scripts/run-native-house-latitude-regression.mjs';

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
