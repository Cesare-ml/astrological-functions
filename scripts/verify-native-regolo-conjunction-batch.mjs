#!/usr/bin/env node
/**
 * Manual, fail-closed MULTI-EPOCH native Regolo conjunction audit.
 * One preflight/DE441 hash, then independently sourced DUT1 for each test
 * instant; every candidate remains unverified for astrological use.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {parseNativeConjunctionOptions, prepareNativeConjunctionSession} from
  './verify-native-regolo-conjunction.mjs';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const COMMON = ['checkout', 'expected-commit', 'expected-addon-sha256',
  'de441', 'expected-de441-sha256', 'time-model', 'lookback-days',
  'sample-step-hours', 'root-tolerance-seconds', 'max-iterations',
  'max-conjunction-residual-deg'];
const CASE_FIELDS = ['id', 'datetimeUtc', 'birthDut1Seconds',
  'dut1SourceUri', 'expectedTimeSourcePolicy'];
// Deliberately conservative: before 1972, a sourced civil UTC/UT1 relation
// needs a distinct historical timescale contract, not a guessed ±1 s DUT1.
const MODERN_UTC_START_MS = Date.parse('1972-01-01T00:00:00Z');
const fail = message => {throw new Error(`E_REGOLO_CONJUNCTION_BATCH: ${message}`);};
const plain = obj => obj && typeof obj === 'object' && !Array.isArray(obj) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(obj));
const exact = (obj, keys) => plain(obj) &&
  Object.keys(obj).length === keys.length &&
  keys.every(key => Object.hasOwn(obj, key));

function buildCaseOptions(common, item) {
  const flags = {...common, 'datetime-utc': item.datetimeUtc,
    'birth-dut1-seconds': String(item.birthDut1Seconds),
    'expected-time-source-policy': item.expectedTimeSourcePolicy};
  // Node parseArgs interprets a separate negative DUT1 value as an option.
  // --key=value handles both positive and negative sourced offsets.
  return parseNativeConjunctionOptions(Object.entries(flags).map(
    ([key, value]) => `--${key}=${value}`));
}

/** The manifest contains TEST instants only; never real birth records. */
export function parseNativeConjunctionBatchManifest(manifest, common) {
  if (!exact(manifest, ['contract', 'cases']) ||
      manifest.contract !== 'RegoloNativeConjunctionBatchCasesV1' ||
      !Array.isArray(manifest.cases) || manifest.cases.length < 1 ||
      manifest.cases.length > 32) {
    fail('versioned manifest with 1–32 test instants required');
  }
  const ids = new Set();
  return Object.freeze(manifest.cases.map(item => {
    if (!exact(item, CASE_FIELDS) || typeof item.id !== 'string' ||
        !ID.test(item.id) ||
        ids.has(item.id) || !Number.isFinite(item.birthDut1Seconds) ||
        Math.abs(item.birthDut1Seconds) > 1 ||
        typeof item.dut1SourceUri !== 'string' ||
        item.dut1SourceUri.length > 512 ||
        !/^https:\/\/[^\s]+$/i.test(item.dut1SourceUri)) {
      fail('each case needs unique ID, UTC, sourced numeric DUT1 and HTTPS source URI');
    }
    ids.add(item.id);
    // Reuse precisely the single-case UTC/UT1, time-policy, interval and
    // SHA pin validation; no second, divergent date conversion algorithm.
    const options = buildCaseOptions(common, item);
    if (Date.parse(options.datetimeUtc) < MODERN_UTC_START_MS) {
      fail('multi-epoch DUT1 contract is restricted to UTC instants from 1972 onward; pre-1972 requires a historical time model');
    }
    return Object.freeze({id: item.id,
      dut1SourceUri: item.dut1SourceUri, options});
  }));
}

function readManifest(filename) {
  const info = statSync(filename);
  if (!info.isFile() || info.size > 100_000) {
    fail('manifest must be a regular JSON file smaller than 100 KB');
  }
  return JSON.parse(readFileSync(filename, 'utf8'));
}

export function parseNativeConjunctionBatchOptions(argv) {
  const {values} = parseArgs({args: argv, strict: true, allowPositionals: false,
    options: Object.fromEntries([...COMMON, 'manifest', 'help'].map(key =>
      [key, {type: key === 'help' ? 'boolean' : 'string'}]))});
  if (values.help) return Object.freeze({help: true});
  if (typeof values.manifest !== 'string' || !values.manifest ||
      values.manifest.length > 1024 || /[\x00-\x1f\x7f]/.test(values.manifest) ||
      COMMON.some(key => typeof values[key] !== 'string')) {
    fail('all source/kernel/method flags and --manifest are required');
  }
  const common = Object.freeze(Object.fromEntries(COMMON.map(key =>
    [key, values[key]])));
  const cases = parseNativeConjunctionBatchManifest(readManifest(values.manifest),
    common);
  return Object.freeze({common, cases});
}

/** Injectable for mock tests; real CLI only uses verified native session. */
export async function runNativeConjunctionBatch({cases}, sessionFactory =
  prepareNativeConjunctionSession) {
  if (!Array.isArray(cases) || !cases.length ||
      cases.some(item => !item.options)) fail('parsed cases required');
  // All pinned fields are identical across cases by the single shared CLI;
  // the session itself also refuses identity/time-model changes.
  const session = await sessionFactory(cases[0].options);
  const results = [];
  let passed = 0;
  for (const item of cases) {
    let output;
    try {
      const receipt = session.run(item.options);
      const ok = receipt.status === 'CANDIDATE_UNVERIFIED_ASTRONOMY' &&
        receipt.nativeAudit?.verifiedLocalBytes === true &&
        receipt.nativeAudit?.nativeAddonExecuted === true &&
        receipt.precedingNewMoon?.availability === 'UNAVAILABLE';
      if (ok) ++passed;
      output = {id: item.id, datetimeUtc: item.options.datetimeUtc,
        birthDut1Seconds: item.options.ut1MinusUtcAtBirthSeconds,
        dut1SourceUri: item.dut1SourceUri, outcome: ok ? 'CANDIDATE' : 'FAILED',
        receipt};
    } catch (error) {
      output = {id: item.id, datetimeUtc: item.options.datetimeUtc,
        birthDut1Seconds: item.options.ut1MinusUtcAtBirthSeconds,
        dut1SourceUri: item.dut1SourceUri, outcome: 'FAILED',
        error: String(error?.code ?? error?.message ?? error).slice(0, 512)};
    }
    results.push(Object.freeze(output));
  }
  return Object.freeze({contract: 'VirgoStarsNativeConjunctionBatchAuditV1',
    status: passed === cases.length ? 'ALL_NATIVE_CANDIDATES_UNVERIFIED' :
      'NATIVE_CANDIDATE_FAILURES',
    nativeBytesPreflightPerformed: true, scientificParityCertified: false,
    referenceIndependenceAudited: false, sourceBuildOriginVerified: false,
    source: Object.freeze({upstreamCommitSha: session.preflight.upstreamCommitSha,
      nativeAddonSha256: session.preflight.nativeAddonSha256,
      de441Sha256: session.kernel.sha256,
      timeModelId: session.pinned.timeModelId}),
    counts: Object.freeze({total: cases.length, candidate: passed,
      failed: cases.length - passed}), results: Object.freeze(results)});
}

export const HELP = `Native Regolo lunar-conjunction multi-epoch smoke (operator-only).

node scripts/verify-native-regolo-conjunction-batch.mjs \\
  --manifest TEST_INSTANTS.json \\
  --checkout EXISTING_VIRGOSTARS_EPHEMERIS_DIR \\
  --expected-commit PINNED_40_HEX_SHA \\
  --expected-addon-sha256 VERIFIED_64_HEX_SHA256 \\
  --de441 EXISTING_DE441_FILE \\
  --expected-de441-sha256 VERIFIED_64_HEX_SHA256 \\
  --time-model PINNED_TIME_MODEL_ID \\
  --lookback-days 35 --sample-step-hours 6 \\
  --root-tolerance-seconds 0.5 --max-iterations 64 \\
  --max-conjunction-residual-deg 0.001

Manifest: {"contract":"RegoloNativeConjunctionBatchCasesV1","cases":[
  {"id":"TEST_CASE_ID","datetimeUtc":"2026-11-18T12:00:00Z",
   "birthDut1Seconds":<SOURCED_NUMBER>,
   "dut1SourceUri":"https://<REAL_DUT1_SOURCE>",
   "expectedTimeSourcePolicy":"<OBSERVED_ENGINE_POLICY>"}
]}
Each birth instant is an artificial TEST epoch, never an actual person's data.
The script hashes DE441/Node addon once, then returns independent case receipts
to STDOUT. Exit 0 only if each numerical candidate exists. Passing does NOT
certify any astronomical event or unlock Regolo lunar lots.`;

async function main() {
  try {
    const options = parseNativeConjunctionBatchOptions(process.argv.slice(2));
    if (options.help) {process.stdout.write(`${HELP}\n`); return;}
    const report = await runNativeConjunctionBatch(options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.counts.failed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
