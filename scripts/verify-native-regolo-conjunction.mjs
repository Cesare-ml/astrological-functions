#!/usr/bin/env node
/**
 * Operator-only native Rust/DE441 smoke for the isolated *numerical* Regolo
 * preceding conjunction finder. NO downloads, P0 archive or production use.
 */
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {searchRegoloPrecedingConjunction} from
  '../src/regolo-moon-conjunction-search.mjs';
import {verifyNativeAddonPreflight} from './verify-native-house-bridge.mjs';
import {verifyRegoloKernel} from './verify-native-regolo-lots.mjs';

const SHA40 = /^[0-9a-f]{40}$/i;
const SHA64 = /^[0-9a-f]{64}$/i;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UTC = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/;
const REQUIRED = [
  'checkout', 'expected-commit', 'expected-addon-sha256', 'de441',
  'expected-de441-sha256', 'datetime-utc', 'birth-dut1-seconds',
  'time-model', 'expected-time-source-policy', 'lookback-days',
  'sample-step-hours', 'root-tolerance-seconds', 'max-iterations',
  'max-conjunction-residual-deg',
];

const error = (message) => {throw new Error(`E_REGOLO_CONJUNCTION_OPTIONS: ${message}`);};

export function parseNativeConjunctionOptions(argv) {
  const {values} = parseArgs({args: argv, strict: true, allowPositionals: false,
    options: Object.fromEntries([...REQUIRED, 'help'].map(key =>
      [key, {type: key === 'help' ? 'boolean' : 'string'}]))});
  if (values.help) return Object.freeze({help: true});
  for (const key of REQUIRED) {
    if (typeof values[key] !== 'string' || values[key].length > 1024 ||
        values[key].length === 0 || values[key] !== values[key].trim() ||
        /[\x00-\x1f\x7f]/.test(values[key])) error(`invalid --${key}`);
  }
  if (!SHA40.test(values['expected-commit']) ||
      !SHA64.test(values['expected-addon-sha256']) ||
      !SHA64.test(values['expected-de441-sha256']) ||
      !SAFE_ID.test(values['time-model']) ||
      !SAFE_ID.test(values['expected-time-source-policy'])) {
    error('explicit valid source/digest/time-model pins required');
  }
  const dut1 = Number(values['birth-dut1-seconds']);
  const lookbackDays = Number(values['lookback-days']);
  const sampleStepHours = Number(values['sample-step-hours']);
  const rootToleranceSeconds = Number(values['root-tolerance-seconds']);
  const maxIterations = Number(values['max-iterations']);
  const maxConjunctionResidualDeg = Number(values['max-conjunction-residual-deg']);
  if (!Number.isFinite(dut1) || Math.abs(dut1) > 1 ||
      !Number.isFinite(lookbackDays) || lookbackDays < 30 || lookbackDays > 35 ||
      !Number.isFinite(sampleStepHours) || sampleStepHours < 1 || sampleStepHours > 12 ||
      !Number.isFinite(rootToleranceSeconds) || rootToleranceSeconds < 0.01 ||
      rootToleranceSeconds > 60 || !Number.isSafeInteger(maxIterations) ||
      maxIterations < 10 || maxIterations > 96 ||
      !Number.isFinite(maxConjunctionResidualDeg) ||
      maxConjunctionResidualDeg <= 0 || maxConjunctionResidualDeg > 0.1) {
    error('DUT1, 30–35-day lookback, 1–12-hour samples, root limits and residual required');
  }
  const match = UTC.exec(values['datetime-utc']);
  if (!match) error('exact Z-suffixed UTC required');
  const micro = (match[2] ?? '').padEnd(6, '0');
  const timestamp = `${match[1]}.${micro.slice(0, 3)}Z`;
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString() !== timestamp) {
    error('invalid Gregorian UTC instant');
  }
  return Object.freeze({checkout: values.checkout,
    expectedCommit: values['expected-commit'].toLowerCase(),
    expectedAddonSha256: values['expected-addon-sha256'].toLowerCase(),
    de441: values.de441,
    expectedDe441Sha256: values['expected-de441-sha256'].toLowerCase(),
    datetimeUtc: values['datetime-utc'],
    birthJdUt: 2440587.5 + (milliseconds + Number(micro.slice(3)) / 1000 +
      dut1 * 1000) / 86400000,
    ut1MinusUtcAtBirthSeconds: dut1,
    timeModelId: values['time-model'],
    expectedTimeSourcePolicy: values['expected-time-source-policy'],
    lookbackDays, sampleStepHours, rootToleranceSeconds, maxIterations,
    maxConjunctionResidualDeg});
}

/** Mock-injectable seam; a mock must never claim a native checksum preflight. */
export function executeNativeConjunctionSearch(engine, source, options, preflight) {
  const calculated = searchRegoloPrecedingConjunction({
    datetimeUtc: options.datetimeUtc,
    birthJdUt: options.birthJdUt,
    ut1MinusUtcAtBirthSeconds: options.ut1MinusUtcAtBirthSeconds,
    expectedEphemeris: source,
    expectedTimeSourcePolicy: options.expectedTimeSourcePolicy,
    lookbackDays: options.lookbackDays,
    sampleStepHours: options.sampleStepHours,
    rootToleranceSeconds: options.rootToleranceSeconds,
    maxIterations: options.maxIterations,
    maxConjunctionResidualDeg: options.maxConjunctionResidualDeg,
    engine,
  });
  return Object.freeze({...calculated, nativeAudit: Object.freeze({
    contract: 'VirgoStarsNativeConjunctionAuditV1',
    nativeAddonExecuted: false,
    verifiedLocalBytes: false,
    scientificParityCertified: false,
    referenceIndependenceAudited: false,
    sourceBuildOriginVerified: false,
    upstreamCommitSha: preflight.upstreamCommitSha,
    nativeAddonSha256: preflight.nativeAddonSha256,
    de441Sha256: options.expectedDe441Sha256,
    timeModelId: options.timeModelId,
    birthDut1Seconds: options.ut1MinusUtcAtBirthSeconds,
    eventDut1Seconds: null,
  })});
}

/**
 * Verify source/installed addon/DE441 bytes BEFORE loading the addon.
 * A session lets an operator compare multiple deliberately supplied UTC
 * instants without rehashing the (large) DE441 file for every birth epoch.
 */
export async function prepareNativeConjunctionSession(options) {
  const preflight = verifyNativeAddonPreflight(options);
  const kernel = await verifyRegoloKernel(options.de441,
    options.expectedDe441Sha256);
  const binding = createRequire(import.meta.url)(preflight.index);
  if (typeof binding.Engine !== 'function' ||
      typeof binding.Engine.prototype.calcUt !== 'function') {
    throw new Error('E_REGOLO_CONJUNCTION_ENGINE: Engine.calcUt is absent from pinned addon');
  }
  const source = Object.freeze({engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: preflight.upstreamCommitSha,
    kernelSetId: kernel.sha256, timeModelId: options.timeModelId});
  const engine = new binding.Engine(kernel.file);
  const pinned = Object.freeze(Object.fromEntries([
    'checkout', 'expectedCommit', 'expectedAddonSha256', 'de441',
    'expectedDe441Sha256', 'timeModelId',
  ].map(key => [key, options[key]])));
  return Object.freeze({pinned, preflight, kernel,
    run(candidateOptions) {
      if (Object.entries(pinned).some(([key, value]) =>
        candidateOptions?.[key] !== value)) {
        throw new Error('E_REGOLO_CONJUNCTION_SESSION_PIN: source, binary, kernel and time model must remain unchanged');
      }
      const found = executeNativeConjunctionSearch(engine, source,
        candidateOptions, preflight);
      return Object.freeze({...found, nativeAudit: Object.freeze({
        ...found.nativeAudit, nativeAddonExecuted: true,
        verifiedLocalBytes: true})});
    }});
}

/** One-case CLI compatibility path; still performs full preflight. */
export async function runNativeConjunctionSearch(options) {
  const session = await prepareNativeConjunctionSession(options);
  return session.run(options);
}

export const HELP = `Native Regolo Sun–Moon search (opt-in, STRUCTURAL ONLY).

node scripts/verify-native-regolo-conjunction.mjs \\
  --checkout PATH_TO_VIRGOSTARS_EPHEMERIS \\
  --expected-commit FULL_40_HEX_SOURCE_HEAD \\
  --expected-addon-sha256 FULL_64_HEX_NATIVE_ADDON_SHA256 \\
  --de441 PATH_TO_EXISTING_DE441 \\
  --expected-de441-sha256 FULL_64_HEX_DE441_SHA256 \\
  --datetime-utc 2026-11-18T12:00:00Z \\
  --birth-dut1-seconds SOURCED_UT1_MINUS_UTC_AT_BIRTH \\
  --time-model VERSIONED_TIME_MODEL_ID \\
  --expected-time-source-policy NAMED_NATIVE_POLICY \\
  --lookback-days 35 \\
  --sample-step-hours 6 \\
  --root-tolerance-seconds 0.5 \\
  --max-iterations 64 \\
  --max-conjunction-residual-deg 0.001

Check the source commit and SHA-256 bytes independently first. The local
DE441 and native addon must already exist; no fetch/build/install occurs.
The JSON receipt is suitable for a separately sourced UT1 reference check.
Its precedingNewMoon always stays UNAVAILABLE. Exit 0 only means a numerical
candidate was found, NOT independently certified astronomical accuracy.`;

async function main() {
  try {
    const options = parseNativeConjunctionOptions(process.argv.slice(2));
    if (options.help) {process.stdout.write(`${HELP}\n`); return;}
    const result = await runNativeConjunctionSearch(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== 'CANDIDATE_UNVERIFIED_ASTRONOMY') process.exitCode = 1;
  } catch (err) {
    process.stderr.write(`${String(err?.message ?? err)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
