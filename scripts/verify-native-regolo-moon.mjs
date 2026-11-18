#!/usr/bin/env node
/**
 * Opt-in operator smoke connecting the ACTUAL Rust P0 Python reader and
 * the SHA-pinned VirgoStars-Ephemeris Node addon. No download or rebuild.
 * Produces an UNAVAILABLE Regolo Moon candidate diagnostic, never a release gate.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createReadStream, realpathSync, statSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {inspectRegoloRecordedNewMoon} from '../src/regolo-moon-event-candidate.mjs';
import {verifyNativeAddonPreflight} from './verify-native-house-bridge.mjs';
import {verifyRegoloKernel} from './verify-native-regolo-lots.mjs';

const SHA40 = /^[a-f0-9]{40}$/i;
const SHA64 = /^[a-f0-9]{64}$/i;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LABEL = /^[^\x00-\x1f\x7f]{1,255}$/;
const ARGUMENTS = [
  'checkout', 'expected-commit', 'expected-addon-sha256',
  'de441', 'expected-de441-sha256',
  'python', 'p0-archive', 'expected-p0-sha256',
  'datetime-utc', 'time-model', 'dut1-seconds',
  'expected-time-source', 'max-conjunction-residual-deg',
];

function requireField(value, name) {
  if (typeof value !== 'string' || !LABEL.test(value) ||
      value !== value.trim() || value.length === 0) {
    throw new Error(`E_REGOLO_MOON_OPTIONS: missing or unsafe --${name}`);
  }
  return value;
}

export function parseRegoloMoonNativeOptions(argv) {
  const {values} = parseArgs({args: argv, strict: true, allowPositionals: false,
    options: Object.fromEntries([...ARGUMENTS, 'help'].map(name =>
      [name, {type: name === 'help' ? 'boolean' : 'string'}]))});
  if (values.help) return Object.freeze({help: true});
  for (const name of ARGUMENTS) requireField(values[name], name);
  if (!SHA40.test(values['expected-commit']) ||
      !SHA64.test(values['expected-addon-sha256']) ||
      !SHA64.test(values['expected-de441-sha256']) ||
      !SHA64.test(values['expected-p0-sha256']) ||
      !IDENTIFIER.test(values['time-model']) ||
      !IDENTIFIER.test(values['expected-time-source'])) {
    throw new Error('E_REGOLO_MOON_OPTIONS: invalid pinned digest, commit or time-model identifier');
  }
  const dut1 = Number(values['dut1-seconds']);
  const tolerance = Number(values['max-conjunction-residual-deg']);
  if (!Number.isFinite(dut1) || Math.abs(dut1) > 1 ||
      !Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1) {
    throw new Error('E_REGOLO_MOON_OPTIONS: DUT1 must be within ±1 s and residual bound within (0, 1] degrees');
  }
  return Object.freeze({checkout: values.checkout,
    expectedCommit: values['expected-commit'].toLowerCase(),
    expectedAddonSha256: values['expected-addon-sha256'].toLowerCase(),
    de441: values.de441,
    expectedDe441Sha256: values['expected-de441-sha256'].toLowerCase(),
    python: values.python, p0Archive: values['p0-archive'],
    expectedP0Sha256: values['expected-p0-sha256'].toLowerCase(),
    datetimeUtc: values['datetime-utc'], timeModelId: values['time-model'],
    ut1MinusUtcAtEventSeconds: dut1,
    expectedTimeSource: values['expected-time-source'],
    maxConjunctionResidualDeg: tolerance});
}

/** Verify the archive itself, not just the SHA printed inside a P0 JSON response. */
export async function verifyMoonP0Archive(filename, expectedSha256) {
  if (!SHA64.test(expectedSha256 ?? '')) {
    throw new Error('E_REGOLO_MOON_ARCHIVE_SHA: trusted full P0 digest required');
  }
  let file;
  try {
    file = realpathSync(filename);
    if (!statSync(file).isFile()) throw new Error('not regular');
  } catch {
    throw new Error('E_REGOLO_MOON_ARCHIVE_PATH: P0 path must be an existing regular file');
  }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const sha256 = hash.digest('hex');
  if (sha256 !== expectedSha256.toLowerCase()) {
    throw new Error('E_REGOLO_MOON_ARCHIVE_SHA: P0 archive bytes differ from trusted digest');
  }
  return Object.freeze({file, sha256});
}

const PYTHON_READ = `import json, sys
from virgostars_events import VirgoStarsEvents
with VirgoStarsEvents.open(sys.argv[1], expected_sha256=sys.argv[2]) as reader:
    print(json.dumps(reader.get_synods_at(sys.argv[3]), separators=(',',':')))
`;

/** Use an installed Python/Rust reader with its own native SHA preflight. */
export function loadP0MoonSnapshotFromPython(python, archive, sha256, datetimeUtc) {
  let json;
  try {
    json = execFileSync(python, ['-c', PYTHON_READ, archive, sha256, datetimeUtc],
      {encoding: 'utf8', timeout: 60000, maxBuffer: 2_000_000,
        stdio: ['ignore', 'pipe', 'pipe']});
  } catch (error) {
    throw new Error('E_REGOLO_MOON_PYTHON: independently installed P0 reader failed: ' +
      String(error.stderr?.toString()?.trim() ?? error.message).slice(0, 500));
  }
  try {return JSON.parse(json);} catch {
    throw new Error('E_REGOLO_MOON_PYTHON_JSON: native reader did not return one JSON object');
  }
}

/** Injectable interface seam: tested with mocks, never certifies astronomy. */
export function executeRegoloMoonNativeAudit(engine, snapshot, source, options, preflight) {
  const result = inspectRegoloRecordedNewMoon({
    datetimeUtc: options.datetimeUtc, snapshot,
    expectedDatasetSha256: options.expectedP0Sha256,
    expectedEphemeris: source,
    ut1MinusUtcAtEventSeconds: options.ut1MinusUtcAtEventSeconds,
    expectedTimeSource: options.expectedTimeSource,
    maxConjunctionResidualDeg: options.maxConjunctionResidualDeg,
    engine,
  });
  return Object.freeze({...result,
    nativeAudit: Object.freeze({
      contract: 'VirgoStarsNativeRegoloMoonAuditV1',
      // This injectable seam is also used by mocks in tests. Only the real
      // operator runner below may promote these execution/provenance flags.
      nativeAddonExecuted: false,
      verifiedLocalBytes: false,
      scientificParityCertified: false,
      referenceIndependenceAudited: false,
      sourceBuildOriginVerified: false,
      p0ArchiveCoverageCertified: false,
      ephemerisCommitSha: preflight.upstreamCommitSha,
      nativeAddonSha256: preflight.nativeAddonSha256,
      de441Sha256: options.expectedDe441Sha256,
      p0ArchiveSha256: options.expectedP0Sha256,
      pythonReader: 'INSTALLED_VIRGOSTARS_EVENTS_NATIVE',
    })});
}

export async function runNativeRegoloMoonAudit(options) {
  // All three byte identities are checked BEFORE invoking either binary.
  const preflight = verifyNativeAddonPreflight(options);
  const kernel = await verifyRegoloKernel(options.de441, options.expectedDe441Sha256);
  const archive = await verifyMoonP0Archive(options.p0Archive, options.expectedP0Sha256);
  const snapshot = loadP0MoonSnapshotFromPython(options.python, archive.file,
    archive.sha256, options.datetimeUtc);
  const nodeBinding = createRequire(import.meta.url)(preflight.index);
  if (typeof nodeBinding.Engine !== 'function' ||
      typeof nodeBinding.Engine.prototype.calcUt !== 'function') {
    throw new Error('E_REGOLO_MOON_ENGINE_API: Engine.calcUt unavailable in pinned Node binding');
  }
  const engine = new nodeBinding.Engine(kernel.file);
  const source = Object.freeze({engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: preflight.upstreamCommitSha,
    kernelSetId: kernel.sha256, timeModelId: options.timeModelId});
  const report = executeRegoloMoonNativeAudit(engine, snapshot, source, options, preflight);
  return Object.freeze({...report, nativeAudit: Object.freeze({...report.nativeAudit,
    nativeAddonExecuted: report.candidate !== null &&
      typeof report.candidate.eventJdUt === 'number',
    verifiedLocalBytes: true})});
}

export const HELP = `Run a pinned native VirgoStars Regolo recorded-Moon smoke without downloads.

node scripts/verify-native-regolo-moon.mjs \\
  --checkout PATH_TO_VIRGOSTARS_EPHEMERIS \\
  --expected-commit 40_HEX_CHECKOUT_HEAD \\
  --expected-addon-sha256 64_HEX_NATIVE_ADDON \\
  --de441 PATH_TO_EXISTING_DE441 \\
  --expected-de441-sha256 64_HEX_KERNEL \\
  --python PATH_TO_INSTALLED_P0_READER_PYTHON \\
  --p0-archive PATH_TO_EXISTING_P0_ARCHIVE \\
  --expected-p0-sha256 64_HEX_P0_ARCHIVE \\
  --datetime-utc 2026-11-18T12:00:00Z \\
  --time-model EXPLICIT_TIME_MODEL_ID \\
  --dut1-seconds EXPLICIT_UT1_MINUS_UTC \\
  --expected-time-source EXACT_CALC_UT_TIME_SOURCE \\
  --max-conjunction-residual-deg 0.25

The Python virtualenv must already have virgostars_events and its native
reader installed. Source, addon, P0 and DE441 must already exist locally.
Returns a direct RegoloRecordedMoonCandidateV1 JSON with a nativeAudit receipt.
It always keeps NEW_MOON unavailable. No reference comparison or scientific
certification is performed. Use compare-regolo-moon-reference.mjs separately.`;

async function main() {
  try {
    const options = parseRegoloMoonNativeOptions(process.argv.slice(2));
    if (options.help) {process.stdout.write(`${HELP}\n`); return;}
    const result = await runNativeRegoloMoonAudit(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    // A valid diagnostic, including a P0 gap, is not numerical certification.
    // Exit 1 if the archive did not even yield a conjunction-like candidate.
    if (result.status !== 'CANDIDATE_UNREVIEWED_COVERAGE') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
