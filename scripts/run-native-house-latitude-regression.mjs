#!/usr/bin/env node
/**
 * Opt-in local Windows/Linux runner. Builds the explicitly pinned Rust addon,
 * runs all seven latitudes/23 methods, and saves audit + version-diff evidence.
 * Never checks out source, installs packages, downloads kernels or overwrites
 * a receipt. A successful invocation is NOT scientific certification.
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync,
  writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {verifyNativeAddonPreflight, runNativeHouseSmoke} from
  './verify-native-house-bridge.mjs';
import {runNativeHouseLatitudeAudit} from './audit-native-house-latitudes.mjs';
import {auditNativeHouseAngleOrientation} from './audit-native-house-angle-orientation.mjs';
import {validateNativeLatitudeAudit} from './compare-native-house-latitudes.mjs';
import {diffNativeHouseLatitudes, parseNativeLatitudeDiffReceiptBytes} from
  './diff-native-house-latitudes.mjs';
import {buildNativeHouseMethodReviewQueue} from
  './build-native-house-method-review-queue.mjs';
import {canonicalReportSha256, NATIVE_HOUSE_BUNDLE_FILES,
  verifyNativeHouseRegressionBundle} from
  './verify-native-house-regression-bundle.mjs';

const fail = (code, message) => {throw new Error(`${code}: ${message}`);};
const sha40 = value => typeof value === 'string' && /^[a-f\d]{40}$/i.test(value);
const label = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 128 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
const fileName = value => typeof value === 'string' && value.trim() !== '';
const sha256 = filename => createHash('sha256').update(readFileSync(filename)).digest('hex');

function assertEmptyOutputDirectory(outDir) {
  const entry = lstatSync(outDir, {throwIfNoEntry: false});
  if (entry && (entry.isSymbolicLink() || !entry.isDirectory() ||
      readdirSync(outDir).length !== 0)) {
    fail('E_NATIVE_REGRESSION_OUTPUT',
      'Output directory must be absent or EMPTY and cannot be a symlink (no overwrites)');
  }
}

export function parseNativeRegressionOptions(argv) {
  const {values} = parseArgs({args: argv, strict: true, options: {
    checkout: {type: 'string'}, 'expected-commit': {type: 'string'},
    baseline: {type: 'string'}, 'expected-baseline-sha256': {type: 'string'},
    'out-dir': {type: 'string'},
    'kernel-context': {type: 'string'}, 'check-only': {type: 'boolean'},
    help: {type: 'boolean'},
  }});
  if (values.help) return {help: true};
  if (!fileName(values.checkout) || !sha40(values['expected-commit']) ||
      !fileName(values.baseline) || !fileName(values['out-dir']) ||
      !label(values['kernel-context']) ||
      (values['expected-baseline-sha256'] !== undefined &&
        !/^[a-f\d]{64}$/i.test(values['expected-baseline-sha256']))) {
    fail('E_NATIVE_REGRESSION_OPTIONS', 'Require --checkout, --expected-commit (40 hex), ' +
      '--baseline, --out-dir, --kernel-context');
  }
  return Object.freeze({checkout: path.resolve(values.checkout),
    expectedCommit: values['expected-commit'].toLowerCase(),
    baseline: path.resolve(values.baseline),
    expectedBaselineSha256: values['expected-baseline-sha256']?.toLowerCase(),
    outDir: path.resolve(values['out-dir']),
    kernelContext: values['kernel-context'],
    checkOnly: values['check-only'] === true});
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

/** Require the selected Rust HEAD and tracked tree to remain pinned throughout the run. */
export function assertPinnedNativeSource(checkout, expectedCommit) {
  const gitRoot = realpathSync(command('git', ['-C', checkout, 'rev-parse', '--show-toplevel']));
  if (realpathSync(checkout) !== gitRoot) {
    fail('E_NATIVE_REGRESSION_CHECKOUT', '--checkout must be the Git repository root');
  }
  const head = command('git', ['-C', checkout, 'rev-parse', 'HEAD']).toLowerCase();
  if (head !== expectedCommit) {
    fail('E_NATIVE_REGRESSION_COMMIT', 'Selected HEAD differs from the required full commit');
  }
  if (command('git', ['-C', checkout, 'status', '--porcelain', '--untracked-files=no'])) {
    fail('E_NATIVE_REGRESSION_DIRTY', 'Rust checkout has modified tracked files');
  }
}

/** Validate all safe-to-check inputs before compiling or creating files. */
export function preflightNativeRegression(options) {
  const checkout = realpathSync(options.checkout);
  assertPinnedNativeSource(checkout, options.expectedCommit);
  const nodeDir = path.join(checkout, 'bindings', 'node');
  const packageFile = path.join(nodeDir, 'package.json');
  if (!existsSync(packageFile) || !statSync(packageFile).isFile()) {
    fail('E_NATIVE_REGRESSION_PACKAGE', 'Pinned Node binding package.json is missing');
  }
  command('git', ['-C', checkout, 'ls-files', '--error-unmatch',
    '--', 'bindings/node/package.json', 'bindings/node/scripts/build-native.mjs']);
  // Snapshot the original bytes once, before a potentially long Cargo build:
  // the parsed comparison, digest and portable source must all refer to the
  // exact same receipt, even if another process touches its path later.
  const baselineBytes = readFileSync(options.baseline);
  const baseline = parseNativeLatitudeDiffReceiptBytes(baselineBytes, options.baseline);
  validateNativeLatitudeAudit(baseline);
  const baselineSha256 = createHash('sha256').update(baselineBytes).digest('hex');
  if (options.expectedBaselineSha256 && options.expectedBaselineSha256 !== baselineSha256) {
    fail('E_NATIVE_REGRESSION_BASELINE_SHA256',
      'Original baseline receipt bytes do not match --expected-baseline-sha256');
  }
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
  assertEmptyOutputDirectory(options.outDir);
  return Object.freeze({checkout, nodeDir, baseline, baselineBytes, baselineSha256});
}

const serializedJson = data => `${JSON.stringify(data, null, 2)}\n`;

function exclusiveJson(dir, name, data) {
  const filename = path.join(dir, name);
  writeFileSync(filename, serializedJson(data), {encoding: 'utf8', flag: 'wx'});
  return filename;
}

/** Observe generated bytes without assuming they originate from the pinned source. */
export function snapshotNativeAddon(addonPath) {
  const nativeDir = path.dirname(addonPath);
  if (existsSync(nativeDir)) {
    const directory = lstatSync(nativeDir);
    if (directory.isSymbolicLink() || !directory.isDirectory()) {
      fail('E_NATIVE_REGRESSION_ADDON_PATH', 'Native output directory must be a real directory');
    }
  }
  if (!existsSync(addonPath)) return null;
  const file = lstatSync(addonPath);
  if (file.isSymbolicLink() || !file.isFile() || file.size === 0) {
    fail('E_NATIVE_REGRESSION_ADDON_PATH', 'Native addon must be a nonempty regular file');
  }
  return Object.freeze({sha256: sha256(addonPath), mtimeMs: file.mtimeMs, size: file.size});
}

/** Reject a successful build that left an old binary byte-for-byte untouched. */
export function assertNativeAddonBuildUpdated(previous, current) {
  if (!current) {
    fail('E_NATIVE_REGRESSION_ADDON', 'No compiled native/virgostars_ephemeris.node found');
  }
  if (previous && previous.sha256 === current.sha256 &&
      previous.mtimeMs === current.mtimeMs && previous.size === current.size) {
    fail('E_NATIVE_REGRESSION_STALE_ADDON',
      'Native addon file was not updated by the build; refusing to audit a possibly stale binary');
  }
}

/** Build and verify every report IN MEMORY before writing any evidence file. */
export function assembleNativeHouseRegressionEvidence({selected, options, nativeOptions,
  audit, smoke}) {
  validateNativeLatitudeAudit(audit);
  const orientation = auditNativeHouseAngleOrientation(audit);
  const comparison = diffNativeHouseLatitudes(selected.baseline, audit);
  const methodReview = buildNativeHouseMethodReviewQueue(selected.baseline, audit);
  const summary = Object.freeze({contract: 'VirgoStarsNativeHouseRegressionBundleV1',
    status: smoke.failed > 0 || orientation.flagged > 0 || audit.failed > 0 ||
      comparison.successToError > 0 || comparison.sameAddonDigest
      ? 'MANUAL_METHOD_REVIEW_REQUIRED'
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
    pendingIndependentMethodReferences: methodReview.missingIndependentMethodReferences,
    pendingIndependentAngleReferences: methodReview.missingIndependentAngleReferences,
    errorToSuccess: comparison.errorToSuccess,
    successToError: comparison.successToError,
    errorCodesChanged: comparison.errorCodesChanged,
    successValuesChanged: comparison.successValuesChanged,
    sameAddonDigest: comparison.sameAddonDigest,
    files: ['house-latitudes-new.json', 'house-smoke-new.json',
      'house-angle-orientation.json', 'house-latitudes-version-diff.json',
      'house-method-review-queue.json', 'house-regression-summary.json',
      'house-regression-bundle.json'],
    note: 'Structural and version evidence only; not independent scientific validation.'});
  const reports = Object.freeze({baseline: selected.baseline, nativeGrid: audit,
    smoke, orientation, versionDiff: comparison, methodReview, summary});
  const reportSha256 = Object.freeze(Object.fromEntries(
    Object.keys(NATIVE_HOUSE_BUNDLE_FILES).map(key =>
      [key, canonicalReportSha256(reports[key])])));
  const bundle = Object.freeze({contract: 'VirgoStarsNativeHouseRegressionEvidenceV1',
    scientificallyCertified: false,
    independentlyVerifiedBuildProvenance: false,
    comparisonToIndependentReferences: false,
    baselineSource: {rawBytesBase64: selected.baselineBytes.toString('base64')},
    reports, reportSha256});
  verifyNativeHouseRegressionBundle(bundle);
  return Object.freeze({summary, bundle});
}

/** Confirm all seven saved files exactly match the verified in-memory evidence. */
export function verifySavedNativeHouseRegressionEvidence(outDir, evidence) {
  const files = [...Object.entries(NATIVE_HOUSE_BUNDLE_FILES).map(([key, filename]) =>
    [filename, evidence.bundle.reports[key]]),
  ['house-regression-bundle.json', evidence.bundle]];
  const directory = lstatSync(outDir);
  if (directory.isSymbolicLink() || !directory.isDirectory() ||
      readdirSync(outDir).length !== files.length) {
    fail('E_NATIVE_REGRESSION_PERSIST', 'Saved evidence directory is not an exact seven-file set');
  }
  for (const [filename, object] of files) {
    const output = path.join(outDir, filename);
    const entry = lstatSync(output);
    if (entry.isSymbolicLink() || !entry.isFile() ||
        !readFileSync(output).equals(Buffer.from(serializedJson(object), 'utf8'))) {
      fail('E_NATIVE_REGRESSION_PERSIST', `Saved evidence bytes differ: ${filename}`);
    }
  }
  return Object.freeze({filesChecked: files.length});
}

/** Write only a previously verified bundle; no partial files for malformed results. */
export function saveNativeHouseRegressionEvidence(outDir, evidence) {
  verifyNativeHouseRegressionBundle(evidence.bundle);
  assertEmptyOutputDirectory(outDir);
  mkdirSync(outDir, {recursive: true});
  for (const [key, file] of Object.entries(NATIVE_HOUSE_BUNDLE_FILES)) {
    exclusiveJson(outDir, file, evidence.bundle.reports[key]);
  }
  const bundleFile = exclusiveJson(outDir, 'house-regression-bundle.json', evidence.bundle);
  const auditFile = path.join(outDir, NATIVE_HOUSE_BUNDLE_FILES.nativeGrid);
  // Return success only after reading the complete seven-file evidence back.
  verifySavedNativeHouseRegressionEvidence(outDir, evidence);
  return Object.freeze({summary: evidence.bundle.reports.summary, auditFile, bundleFile});
}

export async function runNativeHouseLatitudeRegression(options) {
  const selected = preflightNativeRegression(options);
  const addonPath = path.join(selected.nodeDir, 'native', 'virgostars_ephemeris.node');
  const beforeBuild = snapshotNativeAddon(addonPath);
  process.stdout.write('Building pinned Rust Node addon (npm run build)...\n');
  const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build'], {cwd: selected.nodeDir, stdio: 'inherit',
      timeout: 15 * 60_000, shell: process.platform === 'win32'});
  if (build.error || build.status !== 0) {
    fail('E_NATIVE_REGRESSION_BUILD', String(build.error?.message ?? `npm build exit ${build.status}`));
  }
  // A build script must not change tracked Rust inputs or switch the pinned HEAD.
  assertPinnedNativeSource(selected.checkout, options.expectedCommit);
  const afterBuild = snapshotNativeAddon(addonPath);
  assertNativeAddonBuildUpdated(beforeBuild, afterBuild);
  const nativeOptions = {checkout: selected.checkout,
    expectedCommit: options.expectedCommit,
    expectedAddonSha256: afterBuild.sha256, kernelContext: options.kernelContext};
  verifyNativeAddonPreflight(nativeOptions);

  process.stdout.write('Running the actual 7 × 23 native method grid...\n');
  const audit = await runNativeHouseLatitudeAudit(nativeOptions);
  process.stdout.write('Running 23-method native smoke, rising check and version diff...\n');
  const smoke = await runNativeHouseSmoke(nativeOptions);
  const evidence = assembleNativeHouseRegressionEvidence({selected, options, nativeOptions,
    audit, smoke});
  // Also refuse evidence if tracked source changed while the addon was audited.
  assertPinnedNativeSource(selected.checkout, options.expectedCommit);
  const {summary, auditFile, bundleFile} = saveNativeHouseRegressionEvidence(options.outDir,
    evidence);
  return Object.freeze({summary, auditFile, bundleFile});
}

export const HELP_TEXT = `One-shot manual, local VirgoStars house regression (Windows or Linux):
  node scripts/run-native-house-latitude-regression.mjs \\
    --checkout PATH_TO_CLEAN_VIRGOSTARS_EPHEMERIS_REPO \\
    --expected-commit EXACT_40_HEX_PR596_HEAD \\
    --baseline PATH_TO_OLD_141_OF_161_RECEIPT \\
    --expected-baseline-sha256 ORIGINAL_64_HEX_BASELINE_SHA256 \\
    --out-dir NEW_EMPTY_EVIDENCE_DIRECTORY \\
    --kernel-context HOUSE_ANGLES_NO_KERNEL [--check-only]

Checks exact externally pinned Git HEAD, clean tracked sources, the original
baseline bytes hash (if provided), the full 161-case baseline,
and an empty/absent output directory BEFORE running npm run build (cargo).
Refuses symlinked native outputs or a build that left an old addon unchanged.
--check-only performs that read-only preflight and prints the selected exact
source/baseline identities; it never compiles or creates the output folder.
Builds the Rust addon, verifies installed bytes, then saves a new full 161-case
receipt, 23-method smoke, rising-branch analysis, before/after diff, a full
161-method human scientific review queue and summary.
Also exports a single self-contained house-regression-bundle.json with both
grids, exact historical receipt bytes (base64) and checksums; verify it with
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
    if (options.checkOnly) {
      const selected = preflightNativeRegression(options);
      process.stdout.write(`${JSON.stringify({
        contract: 'VirgoStarsNativeHouseRegressionPreflightV1',
        status: 'INPUTS_CHECKED_NO_BUILD_OR_WRITES',
        sourceCommitSha: options.expectedCommit,
        baselineReceiptSha256: selected.baselineSha256,
        baselinePassed: selected.baseline.passed,
        baselineFailed: selected.baseline.failed,
        attempted: selected.baseline.attempted,
        plannedOutputDirectory: options.outDir,
        scientificallyCertified: false,
      }, null, 2)}\n`);
      return;
    }
    const {summary, auditFile, bundleFile} = await runNativeHouseLatitudeRegression(options);
    process.stdout.write(`Saved ${summary.attempted} real-native cases to ${auditFile}\n` +
      `Old ${summary.baselinePassed}/${summary.attempted}; new ` +
      `${summary.currentPassed}/${summary.attempted}; recovered ` +
      `${summary.errorToSuccess}, new failures ${summary.successToError}; ` +
      `ASC flags ${summary.ascendantBranchesFlagged}.\n` +
      `Scientific reference review still needed: ` +
      `${summary.pendingIndependentMethodReferences} method outcomes and ` +
      `${summary.pendingIndependentAngleReferences} angle sets.\n` +
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
