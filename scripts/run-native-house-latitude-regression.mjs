#!/usr/bin/env node
/**
 * Opt-in local Windows/Linux runner. Builds the explicitly pinned Rust addon,
 * runs all seven latitudes/23 methods, and saves audit + version-diff evidence.
 * Never checks out source, installs packages, downloads kernels or overwrites
 * a receipt. A successful invocation is NOT scientific certification.
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync,
  writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {verifyNativeAddonPreflight, runNativeHouseSmoke} from
  './verify-native-house-bridge.mjs';
import {runNativeHouseLatitudeAudit} from './audit-native-house-latitudes.mjs';
import {auditNativeHouseAngleOrientation} from './audit-native-house-angle-orientation.mjs';
import {validateNativeLatitudeAudit} from './compare-native-house-latitudes.mjs';
import {diffNativeHouseLatitudes, readNativeLatitudeDiffReceipt} from
  './diff-native-house-latitudes.mjs';
import {NATIVE_HOUSE_BUNDLE_FILES, verifyNativeHouseRegressionBundle} from
  './verify-native-house-regression-bundle.mjs';

const fail = (code, message) => {throw new Error(`${code}: ${message}`);};
const sha40 = value => typeof value === 'string' && /^[a-f\d]{40}$/i.test(value);
const label = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 128 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
const fileName = value => typeof value === 'string' && value.trim() !== '';
const sha256 = filename => createHash('sha256').update(readFileSync(filename)).digest('hex');

export function parseNativeRegressionOptions(argv) {
  const {values} = parseArgs({args: argv, strict: true, options: {
    checkout: {type: 'string'}, 'expected-commit': {type: 'string'},
    baseline: {type: 'string'}, 'out-dir': {type: 'string'},
    'kernel-context': {type: 'string'}, help: {type: 'boolean'},
  }});
  if (values.help) return {help: true};
  if (!fileName(values.checkout) || !sha40(values['expected-commit']) ||
      !fileName(values.baseline) || !fileName(values['out-dir']) ||
      !label(values['kernel-context'])) {
    fail('E_NATIVE_REGRESSION_OPTIONS', 'Require --checkout, --expected-commit (40 hex), ' +
      '--baseline, --out-dir, --kernel-context');
  }
  return Object.freeze({checkout: path.resolve(values.checkout),
    expectedCommit: values['expected-commit'].toLowerCase(),
    baseline: path.resolve(values.baseline),
    outDir: path.resolve(values['out-dir']),
    kernelContext: values['kernel-context']});
}

function command(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8', timeout: options.timeout ?? 15_000,
    maxBuffer: 1_000_000, cwd: options.cwd,
    windowsHide: true, shell: options.shell ?? false,
  });
  if (result.error || result.status !== 0) {
    fail('E_NATIVE_REGRESSION_COMMAND', `${cmd} ${args.join(' ')}: ` +
      String(result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`));
  }
  return result.stdout.trim();
}

/** Validate all safe-to-check inputs before compiling or creating files. */
export function preflightNativeRegression(options) {
  const checkout = realpathSync(options.checkout);
  const gitRoot = realpathSync(command('git', ['-C', checkout, 'rev-parse', '--show-toplevel']));
  if (checkout !== gitRoot) {
    fail('E_NATIVE_REGRESSION_CHECKOUT', '--checkout must be the Git repository root');
  }
  const head = command('git', ['-C', checkout, 'rev-parse', 'HEAD']).toLowerCase();
  if (head !== options.expectedCommit) {
    fail('E_NATIVE_REGRESSION_COMMIT', 'Selected HEAD differs from the required full commit');
  }
  if (command('git', ['-C', checkout, 'status', '--porcelain', '--untracked-files=no'])) {
    fail('E_NATIVE_REGRESSION_DIRTY', 'Rust checkout has modified tracked files');
  }
  const nodeDir = path.join(checkout, 'bindings', 'node');
  const packageFile = path.join(nodeDir, 'package.json');
  if (!existsSync(packageFile) || !statSync(packageFile).isFile()) {
    fail('E_NATIVE_REGRESSION_PACKAGE', 'Pinned Node binding package.json is missing');
  }
  command('git', ['-C', checkout, 'ls-files', '--error-unmatch',
    '--', 'bindings/node/package.json', 'bindings/node/scripts/build-native.mjs']);
  const baseline = readNativeLatitudeDiffReceipt(options.baseline);
  validateNativeLatitudeAudit(baseline);
  if (baseline.ephemeris.kernelContext !== options.kernelContext) {
    fail('E_NATIVE_REGRESSION_CONTEXT', 'Baseline declared kernel context differs from selected label');
  }
  if (baseline.ephemeris.upstreamCommitSha === options.expectedCommit) {
    fail('E_NATIVE_REGRESSION_UNCHANGED_COMMIT',
      'Selected Rust commit is identical to the historical baseline; choose the corrected PR SHA');
  }
  if (options.outDir === options.baseline) {
    fail('E_NATIVE_REGRESSION_OUTPUT', 'Output directory cannot be the baseline receipt');
  }
  if (existsSync(options.outDir) &&
      (!statSync(options.outDir).isDirectory() || readdirSync(options.outDir).length !== 0)) {
    fail('E_NATIVE_REGRESSION_OUTPUT', 'Output directory must be absent or EMPTY (no overwrites)');
  }
  return Object.freeze({checkout, nodeDir, baseline,
    baselineSha256: sha256(options.baseline)});
}

function exclusiveJson(dir, name, data) {
  const filename = path.join(dir, name);
  writeFileSync(filename, `${JSON.stringify(data, null, 2)}\n`, {encoding: 'utf8', flag: 'wx'});
  return filename;
}

export async function runNativeHouseLatitudeRegression(options) {
  const selected = preflightNativeRegression(options);
  process.stdout.write('Building pinned Rust Node addon (npm run build)...\n');
  const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build'], {cwd: selected.nodeDir, stdio: 'inherit',
      timeout: 15 * 60_000, shell: process.platform === 'win32'});
  if (build.error || build.status !== 0) {
    fail('E_NATIVE_REGRESSION_BUILD', String(build.error?.message ?? `npm build exit ${build.status}`));
  }
  const addonPath = path.join(selected.nodeDir, 'native', 'virgostars_ephemeris.node');
  if (!existsSync(addonPath)) {
    fail('E_NATIVE_REGRESSION_ADDON', 'No compiled native/virgostars_ephemeris.node found');
  }
  const nativeOptions = {checkout: selected.checkout,
    expectedCommit: options.expectedCommit,
    expectedAddonSha256: sha256(addonPath), kernelContext: options.kernelContext};
  verifyNativeAddonPreflight(nativeOptions);
  mkdirSync(options.outDir, {recursive: true});

  process.stdout.write('Running the actual 7 × 23 native method grid...\n');
  const audit = await runNativeHouseLatitudeAudit(nativeOptions);
  validateNativeLatitudeAudit(audit);
  const auditFile = exclusiveJson(options.outDir, 'house-latitudes-new.json', audit);

  process.stdout.write('Running 23-method native smoke, rising check and version diff...\n');
  const smoke = await runNativeHouseSmoke(nativeOptions);
  const orientation = auditNativeHouseAngleOrientation(audit);
  const comparison = diffNativeHouseLatitudes(selected.baseline, audit);
  exclusiveJson(options.outDir, 'house-smoke-new.json', smoke);
  exclusiveJson(options.outDir, 'house-angle-orientation.json', orientation);
  exclusiveJson(options.outDir, 'house-latitudes-version-diff.json', comparison);

  const summary = Object.freeze({contract: 'VirgoStarsNativeHouseRegressionBundleV1',
    status: smoke.failed > 0 || orientation.flagged > 0 || audit.failed > 0 ||
      comparison.successToError > 0 ? 'MANUAL_METHOD_REVIEW_REQUIRED'
      : 'STRUCTURAL_CHECKS_COMPLETE_NOT_CERTIFIED',
    scientificallyCertified: false, nativeBuildOriginIndependentlyVerified: false,
    independentMethodParityVerified: false,
    platform: process.platform, architecture: process.arch, nodeVersion: process.version,
    expectedSourceCommitSha: options.expectedCommit,
    nativeAddonSha256: nativeOptions.expectedAddonSha256,
    baselineReceiptSha256: selected.baselineSha256,
    baselinePassed: selected.baseline.passed, baselineFailed: selected.baseline.failed,
    currentPassed: audit.passed, currentFailed: audit.failed,
    attempted: audit.attempted, smokePassed: smoke.passed, smokeFailed: smoke.failed,
    ascendantBranchesFlagged: orientation.flagged,
    errorToSuccess: comparison.errorToSuccess,
    successToError: comparison.successToError,
    errorCodesChanged: comparison.errorCodesChanged,
    successValuesChanged: comparison.successValuesChanged,
    sameAddonDigest: comparison.sameAddonDigest,
    files: ['house-latitudes-new.json', 'house-smoke-new.json',
      'house-angle-orientation.json', 'house-latitudes-version-diff.json',
      'house-regression-summary.json', 'house-regression-bundle.json'],
    note: 'Structural and version evidence only; not independent scientific validation.'});
  exclusiveJson(options.outDir, 'house-regression-summary.json', summary);
  const reports = Object.freeze({baseline: selected.baseline, nativeGrid: audit,
    smoke, orientation, versionDiff: comparison, summary});
  const reportSha256 = Object.freeze(Object.fromEntries(
    Object.entries(NATIVE_HOUSE_BUNDLE_FILES).map(([key, file]) =>
      [key, sha256(path.join(options.outDir, file))])));
  const bundle = Object.freeze({contract: 'VirgoStarsNativeHouseRegressionEvidenceV1',
    scientificallyCertified: false,
    independentlyVerifiedBuildProvenance: false,
    comparisonToIndependentReferences: false,
    reports, reportSha256});
  verifyNativeHouseRegressionBundle(bundle);
  const bundleFile = exclusiveJson(options.outDir, 'house-regression-bundle.json', bundle);
  return Object.freeze({summary, auditFile, bundleFile});
}

export const HELP_TEXT = `One-shot manual, local VirgoStars house regression (Windows or Linux):
  node scripts/run-native-house-latitude-regression.mjs \\
    --checkout PATH_TO_CLEAN_VIRGOSTARS_EPHEMERIS_REPO \\
    --expected-commit EXACT_40_HEX_PR596_HEAD \\
    --baseline PATH_TO_OLD_141_OF_161_RECEIPT \\
    --out-dir NEW_EMPTY_EVIDENCE_DIRECTORY \\
    --kernel-context HOUSE_ANGLES_NO_KERNEL

Checks exact Git HEAD, clean tracked sources, the full 161-case baseline,
and an empty/absent output directory BEFORE running npm run build (cargo).
Builds the Rust addon, verifies installed bytes, then saves a new full 161-case
receipt, 23-method smoke, rising-branch analysis, before/after diff and summary.
Also exports a single self-contained house-regression-bundle.json with all
source receipts and checksums; verify it offline with
  node scripts/verify-native-house-regression-bundle.mjs --bundle FILE
It never switches/pulls branches, installs npm dependencies, downloads kernels,
overwrites existing files, or claims scientific or reproducible-build parity.
Exit 0: completed, no method/orientation concerns; 2: saved valid evidence with
methods requiring review; 1: fatal preflight/build/input/runtime error.
Cargo may fetch missing pinned crates using its normal dependency cache policy.`;

async function main() {
  try {
    const options = parseNativeRegressionOptions(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    const {summary, auditFile, bundleFile} = await runNativeHouseLatitudeRegression(options);
    process.stdout.write(`Saved ${summary.attempted} real-native cases to ${auditFile}\n` +
      `Old ${summary.baselinePassed}/${summary.attempted}; new ` +
      `${summary.currentPassed}/${summary.attempted}; recovered ` +
      `${summary.errorToSuccess}, new failures ${summary.successToError}; ` +
      `ASC flags ${summary.ascendantBranchesFlagged}.\n` +
      `Single portable report to share: ${bundleFile}\n` +
      `${summary.status}; no scientific or method-parity certification.\n`);
    if (summary.status === 'MANUAL_METHOD_REVIEW_REQUIRED') process.exitCode = 2;
  } catch (caught) {
    process.stderr.write(`${String(caught?.message ?? caught)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
