#!/usr/bin/env node
/**
 * Offline internal-consistency verification of one portable 7×23 native
 * regression evidence bundle. Hashes detect file mismatches, NOT provenance
 * or deliberate tampering; this is never independent scientific parity.
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE} from './verify-native-house-bridge.mjs';
import {auditNativeHouseAngleOrientation} from './audit-native-house-angle-orientation.mjs';
import {validateNativeLatitudeAudit} from './compare-native-house-latitudes.mjs';
import {diffNativeHouseLatitudes, readNativeLatitudeDiffReceipt,
  parseNativeLatitudeDiffReceiptBytes} from
  './diff-native-house-latitudes.mjs';
import {buildNativeHouseMethodReviewQueue} from './build-native-house-method-review-queue.mjs';

const NAMES = Object.freeze({nativeGrid: 'house-latitudes-new.json',
  smoke: 'house-smoke-new.json', orientation: 'house-angle-orientation.json',
  versionDiff: 'house-latitudes-version-diff.json',
  methodReview: 'house-method-review-queue.json',
  summary: 'house-regression-summary.json'});
const METHODS = ASTRO_COM_HOUSE_SYSTEM_IDS.filter(name => name !== 'SUNSHINE');
const methods = new Set(METHODS);
const fail = (code, reason) => {throw new Error(`${code}: ${reason}`);};
const plain = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const nonEmpty = value => typeof value === 'string' && value.length > 0 && value.length <= 512;
const sha64 = value => typeof value === 'string' && /^[a-f\d]{64}$/i.test(value);
export const NATIVE_HOUSE_BUNDLE_FILES = NAMES;

export function canonicalReportSha256(report) {
  return createHash('sha256').update(`${JSON.stringify(report, null, 2)}\n`).digest('hex');
}

function checkSmoke(smoke, grid) {
  if (!plain(smoke) || smoke.contract !== 'VirgoStarsNativeHouseSmokeV1' ||
      smoke.validatedScientificParity !== false ||
      smoke.addonBuiltFromSelectedCommitIndependentlyVerified !== false ||
      smoke.attempted !== METHODS.length ||
      !Array.isArray(smoke.results) || !Array.isArray(smoke.failures) ||
      smoke.results.length !== smoke.passed || smoke.failures.length !== smoke.failed ||
      smoke.passed + smoke.failed !== METHODS.length ||
      !Array.isArray(smoke.blocked) || smoke.blocked.length !== 1 ||
      smoke.blocked[0]?.houseSystem !== 'SUNSHINE' ||
      !plain(smoke.ephemeris) ||
      smoke.ephemeris.upstreamCommitSha !== grid.ephemeris.upstreamCommitSha ||
      smoke.ephemeris.nativeAddonSha256 !== grid.ephemeris.nativeAddonSha256 ||
      smoke.ephemeris.kernelContext !== grid.ephemeris.kernelContext ||
      !plain(smoke.fixture) ||
      Object.keys(HOUSE_SMOKE_FIXTURE).some(key => smoke.fixture[key] !== HOUSE_SMOKE_FIXTURE[key])) {
    fail('E_NATIVE_BUNDLE_SMOKE', 'Smoke receipt must match the exact 23-method native build');
  }
  const seen = new Set();
  for (const row of smoke.results) {
    const count = row?.houseSystem === 'GAUQUELIN_36' ? 36 : 12;
    if (!plain(row) || !methods.has(row.houseSystem) || seen.has(row.houseSystem) ||
        !Array.isArray(row.valuesDeg) || row.valuesDeg.length !== count ||
        !row.valuesDeg.every(value => Number.isFinite(value) && value >= 0 && value < 360)) {
      fail('E_NATIVE_BUNDLE_SMOKE', 'Malformed/duplicate native smoke cusp result');
    }
    seen.add(row.houseSystem);
  }
  for (const row of smoke.failures) {
    if (!plain(row) || !methods.has(row.houseSystem) || seen.has(row.houseSystem) ||
        !nonEmpty(row.code) || !nonEmpty(row.message)) {
      fail('E_NATIVE_BUNDLE_SMOKE', 'Malformed/duplicate native smoke method error');
    }
    seen.add(row.houseSystem);
  }
  if (seen.size !== METHODS.length || smoke.status !== (smoke.failed === 0
    ? 'NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY' : 'NATIVE_ADDON_EXECUTED_WITH_FAILURES')) {
    fail('E_NATIVE_BUNDLE_SMOKE', 'Native smoke status or 23-method coverage is incomplete');
  }
}

/** Check semantic consistency; do not purport to authenticate a caller's build. */
export function verifyNativeHouseRegressionBundle(bundle) {
  if (!plain(bundle) || bundle.contract !== 'VirgoStarsNativeHouseRegressionEvidenceV1' ||
      bundle.scientificallyCertified !== false ||
      bundle.independentlyVerifiedBuildProvenance !== false ||
      bundle.comparisonToIndependentReferences !== false ||
      !plain(bundle.reports) || !plain(bundle.reportSha256) ||
      !plain(bundle.baselineSource) ||
      typeof bundle.baselineSource.rawBytesBase64 !== 'string' ||
      !Object.hasOwn(bundle.reports, 'baseline')) {
    fail('E_NATIVE_BUNDLE_CONTRACT', 'Require an explicit, uncertified self-contained evidence bundle');
  }
  const {baseline, nativeGrid, smoke, orientation, versionDiff,
    methodReview, summary} = bundle.reports;
  const encodedBaseline = bundle.baselineSource.rawBytesBase64;
  if (encodedBaseline.length === 0 || encodedBaseline.length > 7_000_000 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedBaseline)) {
    fail('E_NATIVE_BUNDLE_BASELINE', 'Original baseline must have canonical base64 bytes');
  }
  const rawBaseline = Buffer.from(encodedBaseline, 'base64');
  if (rawBaseline.toString('base64') !== encodedBaseline ||
      rawBaseline.length > 5_000_000 || rawBaseline.length === 0 ||
      !plain(summary) ||
      createHash('sha256').update(rawBaseline).digest('hex') !== summary.baselineReceiptSha256 ||
      !isDeepStrictEqual(parseNativeLatitudeDiffReceiptBytes(rawBaseline), baseline)) {
    fail('E_NATIVE_BUNDLE_BASELINE', 'Raw historical baseline bytes or hash do not match parsed report');
  }
  validateNativeLatitudeAudit(baseline);
  validateNativeLatitudeAudit(nativeGrid);
  checkSmoke(smoke, nativeGrid);
  const actualOrientation = auditNativeHouseAngleOrientation(nativeGrid);
  const actualDiff = diffNativeHouseLatitudes(baseline, nativeGrid);
  const actualReviewQueue = buildNativeHouseMethodReviewQueue(baseline, nativeGrid);
  if (!isDeepStrictEqual(orientation, actualOrientation) ||
      !isDeepStrictEqual(versionDiff, actualDiff)) {
    fail('E_NATIVE_BUNDLE_CALCULATIONS', 'Saved orientation or diff differs from recomputation');
  }
  if (!isDeepStrictEqual(methodReview, actualReviewQueue)) {
    fail('E_NATIVE_BUNDLE_REVIEW_QUEUE', 'Saved human-review queue differs from all 161 original outcomes');
  }
  for (const key of Object.keys(NAMES)) {
    if (!sha64(bundle.reportSha256[key]) ||
        bundle.reportSha256[key] !== canonicalReportSha256(bundle.reports[key])) {
      fail('E_NATIVE_BUNDLE_HASH', `Incorrect SHA-256 of ${NAMES[key]}`);
    }
  }
  if (Object.keys(bundle.reportSha256).length !== Object.keys(NAMES).length) {
    fail('E_NATIVE_BUNDLE_HASH', 'Unexpected or omitted report hash');
  }
  const expectedReview = smoke.failed > 0 || actualOrientation.flagged > 0 ||
    nativeGrid.failed > 0 || actualDiff.successToError > 0 ||
    actualDiff.sameAddonDigest;
  if (!plain(summary) || summary.contract !== 'VirgoStarsNativeHouseRegressionBundleV1' ||
      summary.scientificallyCertified !== false ||
      summary.nativeBuildOriginIndependentlyVerified !== false ||
      summary.independentMethodParityVerified !== false ||
      summary.status !== (expectedReview ? 'MANUAL_METHOD_REVIEW_REQUIRED' :
        'STRUCTURAL_CHECKS_COMPLETE_NOT_CERTIFIED') ||
      !sha64(summary.baselineReceiptSha256) ||
      summary.expectedSourceCommitSha !== nativeGrid.ephemeris.upstreamCommitSha ||
      summary.nativeAddonSha256 !== nativeGrid.ephemeris.nativeAddonSha256 ||
      summary.baselinePassed !== baseline.passed || summary.baselineFailed !== baseline.failed ||
      summary.currentPassed !== nativeGrid.passed || summary.currentFailed !== nativeGrid.failed ||
      summary.attempted !== 161 || summary.smokePassed !== smoke.passed ||
      summary.smokeFailed !== smoke.failed ||
      summary.ascendantBranchesFlagged !== orientation.flagged ||
      summary.pendingIndependentMethodReferences !==
        actualReviewQueue.missingIndependentMethodReferences ||
      summary.pendingIndependentAngleReferences !==
        actualReviewQueue.missingIndependentAngleReferences ||
      summary.errorToSuccess !== actualDiff.errorToSuccess ||
      summary.successToError !== actualDiff.successToError ||
      summary.errorCodesChanged !== actualDiff.errorCodesChanged ||
      summary.successValuesChanged !== actualDiff.successValuesChanged ||
      summary.sameAddonDigest !== actualDiff.sameAddonDigest ||
      !Array.isArray(summary.files) ||
      !Object.values(NAMES).every(filename => summary.files.includes(filename)) ||
      !summary.files.includes('house-regression-bundle.json')) {
    fail('E_NATIVE_BUNDLE_SUMMARY', 'Saved summary is not consistent with the full native receipts');
  }
  return Object.freeze({contract: 'VirgoStarsNativeHouseBundleVerificationV1',
    status: 'INTERNAL_CONSISTENCY_VERIFIED_NOT_CERTIFIED',
    scientificallyCertified: false, nativeBuildOriginIndependentlyVerified: false,
    independentMethodParityVerified: false,
    attempted: nativeGrid.attempted, passed: nativeGrid.passed, failed: nativeGrid.failed,
    flaggedAscendants: orientation.flagged,
    recoveredMethods: actualDiff.errorToSuccess,
    newlyFailedMethods: actualDiff.successToError,
    sameAddonDigest: actualDiff.sameAddonDigest,
    independentMethodReferencesStillNeeded: actualReviewQueue.missingIndependentMethodReferences,
    independentAngleReferencesStillNeeded: actualReviewQueue.missingIndependentAngleReferences,
    methodReviewPriorityCounts: actualReviewQueue.priorities,
    reportHashesChecked: Object.keys(NAMES).length,
    originalBaselineSha256Checked: true});
}

export const HELP_TEXT = `Offline verification of a single portable VirgoStars 7×23 evidence bundle.
  node scripts/verify-native-house-regression-bundle.mjs --bundle house-regression-bundle.json \\
    [--expected-commit 40_HEX_PR_SHA] [--expected-baseline-sha256 64_HEX_RECEIPT_SHA]

Checks SHA-256 for its exact original UTF-8/UTF-16LE baseline bytes, the six
individually saved reports, all 161 method outcomes and their review queue,
the 23-method smoke, horizon branch, before/after diff and summary consistency.
No Rust, native addon, kernel, network, Swiss code, external reference or
production service is used. Exit 0 only for internally consistent evidence;
exit 1 for incomplete/tampered/inconsistent data. Neither status can establish
the authenticity of source binaries or scientific house-method correctness.`;

async function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {bundle: {type: 'string'}, 'expected-commit': {type: 'string'},
        'expected-baseline-sha256': {type: 'string'}, help: {type: 'boolean'}}});
    if (values.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    if (!values.bundle) fail('E_NATIVE_BUNDLE_OPTIONS', '--bundle JSON_PATH is required');
    if (values['expected-commit'] !== undefined &&
        !/^[a-f\d]{40}$/i.test(values['expected-commit'])) {
      fail('E_NATIVE_BUNDLE_OPTIONS', '--expected-commit must be 40 hex');
    }
    if (values['expected-baseline-sha256'] !== undefined &&
        !/^[a-f\d]{64}$/i.test(values['expected-baseline-sha256'])) {
      fail('E_NATIVE_BUNDLE_OPTIONS', '--expected-baseline-sha256 must be 64 hex');
    }
    // The bundle includes the parsed baseline AND its raw bytes, so it can
    // exceed the strict per-receipt 5 MB limit without weakening that limit.
    const receipt = readNativeLatitudeDiffReceipt(values.bundle, 20_000_000);
    const output = verifyNativeHouseRegressionBundle(receipt);
    if (values['expected-commit'] &&
        receipt.reports.nativeGrid.ephemeris.upstreamCommitSha.toLowerCase() !==
          values['expected-commit'].toLowerCase()) {
      fail('E_NATIVE_BUNDLE_EXPECTED_COMMIT', 'Evidence differs from the independently selected Rust commit');
    }
    if (values['expected-baseline-sha256'] &&
        receipt.reports.summary.baselineReceiptSha256.toLowerCase() !==
          values['expected-baseline-sha256'].toLowerCase()) {
      fail('E_NATIVE_BUNDLE_EXPECTED_BASELINE', 'Evidence differs from the selected old receipt');
    }
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (caught) {
    process.stderr.write(`${String(caught?.message ?? caught)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
