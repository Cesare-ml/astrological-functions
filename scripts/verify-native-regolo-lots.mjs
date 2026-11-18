#!/usr/bin/env node
/**
 * Operator-invoked real VirgoStars-Ephemeris addon smoke test for the Regolo
 * Sun-centre sect bridge. No automatic build/download/installation or claim of
 * independent astronomical parity. Uses artificial natal longitudes only.
 */
import {createHash} from 'node:crypto';
import {createReadStream, existsSync, realpathSync, statSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {calculateRegoloLotsFromVirgoStarsRiseSet} from
  '../src/regolo-lots-rise-set-bridge.mjs';
import {verifyNativeAddonPreflight} from './verify-native-house-bridge.mjs';

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA40 = /^[a-f0-9]{40}$/i;
const SHA64 = /^[a-f0-9]{64}$/i;
const REQUIRED = ['checkout', 'expected-commit', 'expected-addon-sha256',
  'de441', 'expected-de441-sha256', 'time-model', 'dut1-seconds'];

export const REGOLO_NATIVE_CASES = Object.freeze([
  Object.freeze({id: 'ROME_WINTER_DAY_COARSE',
    datetimeUtc: '2026-11-18T12:00:00Z', expectedSect: 'DAY'}),
  Object.freeze({id: 'ROME_WINTER_NIGHT_COARSE',
    datetimeUtc: '2026-11-18T21:00:00Z', expectedSect: 'NIGHT'}),
]);

const NATAL = Object.freeze({birthTimeKnown: true, zodiac: 'TROPICAL',
  chartContextId: 'SYNTHETIC_REGOLO_NATIVE_SMOKE', ascendantLongitudeDeg: 350,
  planetsLongitudeDeg: Object.freeze({SUN: 10, MOON: 80, MERCURY: 100,
    VENUS: 130, MARS: 160, JUPITER: 200, SATURN: 260}),
  houseCuspsDeg: Object.freeze(Array.from({length: 12}, (_, i) => i * 30 + 10)),
  midheavenLongitudeDeg: 300, descendantLongitudeDeg: 170});
const OBSERVER = Object.freeze({latitudeDeg: 41.9028,
  longitudeDegEast: 12.4964, elevationMeters: 30});
const MODEL = Object.freeze({pressureHpa: 1013.25, temperatureC: 15,
  boundaryUncertaintySeconds: 120});

export function parseRegoloNativeOptions(argv) {
  const {values} = parseArgs({args: argv, strict: true, allowPositionals: false,
    options: Object.fromEntries([...REQUIRED, 'help'].map(key =>
      [key, {type: key === 'help' ? 'boolean' : 'string'}]))});
  if (values.help) return Object.freeze({help: true});
  if (REQUIRED.some(key => typeof values[key] !== 'string' ||
      values[key].trim() !== values[key] || !values[key])) {
    throw new Error('E_REGOLO_OPTIONS: all seven explicit flags are required');
  }
  if (!SHA40.test(values['expected-commit']) ||
      !SHA64.test(values['expected-addon-sha256']) ||
      !SHA64.test(values['expected-de441-sha256']) ||
      !IDENTIFIER.test(values['time-model'])) {
    throw new Error('E_REGOLO_OPTIONS: invalid commit, digest or time-model identifier');
  }
  const dut1Seconds = Number(values['dut1-seconds']);
  if (!Number.isFinite(dut1Seconds) || Math.abs(dut1Seconds) > 1 ||
      values['dut1-seconds'].trim() === '') {
    throw new Error('E_REGOLO_OPTIONS: --dut1-seconds must be an explicit value within ±1 s');
  }
  return Object.freeze({checkout: values.checkout,
    expectedCommit: values['expected-commit'].toLowerCase(),
    expectedAddonSha256: values['expected-addon-sha256'].toLowerCase(),
    de441: values.de441,
    expectedDe441Sha256: values['expected-de441-sha256'].toLowerCase(),
    timeModelId: values['time-model'], dut1Seconds});
}

/** Verify explicitly supplied kernel bytes without buffering an entire DE441 file. */
export async function verifyRegoloKernel(pathToKernel, expectedSha256) {
  if (typeof expectedSha256 !== 'string' || !SHA64.test(expectedSha256)) {
    throw new Error('E_REGOLO_KERNEL_DIGEST: exact trusted 64-hex SHA-256 required');
  }
  if (typeof pathToKernel !== 'string' || !pathToKernel || !existsSync(pathToKernel)) {
    throw new Error('E_REGOLO_KERNEL_PATH: explicitly supplied DE441 file is missing');
  }
  const real = realpathSync(pathToKernel);
  if (!statSync(real).isFile()) {
    throw new Error('E_REGOLO_KERNEL_PATH: DE441 path must be a regular file');
  }
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(real)) digest.update(chunk);
  const actual = digest.digest('hex');
  if (actual !== expectedSha256.toLowerCase()) {
    throw new Error('E_REGOLO_KERNEL_SHA256: DE441 file does not match trusted digest');
  }
  return Object.freeze({file: real, sha256: actual});
}

/** Pure structural smoke on a supplied Engine. No independent solar oracle. */
export function executeRegoloNativeCases(engine, source, dut1Seconds) {
  const results = [];
  const failures = [];
  for (const fixture of REGOLO_NATIVE_CASES) {
    try {
      const result = calculateRegoloLotsFromVirgoStarsRiseSet({
        engine, datetimeUtc: fixture.datetimeUtc, ut1MinusUtcSeconds: dut1Seconds,
        observer: OBSERVER, expectedEphemeris: source,
        solarModel: MODEL, natal: NATAL,
        precedingNewMoon: {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'},
      });
      const klerosCount = Object.keys(result.kleroi.kleroi).length;
      if (result.sect !== fixture.expectedSect || klerosCount !== 9 ||
          result.arabicParts.entries.length !== 92 ||
          result.precedingNewMoon.availability !== 'UNAVAILABLE' ||
          !Number.isFinite(result.solarEvents.nearestBoundarySeconds)) {
        throw new Error('E_REGOLO_SMOKE_SHAPE: unexpected sect or Regolo result shape');
      }
      results.push(Object.freeze({id: fixture.id, datetimeUtc: fixture.datetimeUtc,
        expectedSect: fixture.expectedSect, sect: result.sect,
        solarEvents: result.solarEvents, klerosCount,
        arabicPartsCount: result.arabicParts.entries.length,
        availableArabicPartsCount: result.arabicParts.availableCount}));
    } catch (error) {
      failures.push(Object.freeze({id: fixture.id,
        code: String(error?.code ?? 'E_REGOLO_SMOKE_EXEC'),
        message: String(error?.message ?? error)}));
    }
  }
  return Object.freeze({passed: results.length, failed: failures.length,
    results: Object.freeze(results), failures: Object.freeze(failures)});
}

export async function runNativeRegoloSmoke(options) {
  // Refuse to load a native addon before verifying its source checkout and
  // exact binary digest. The kernel is independently checked by streaming.
  const preflight = verifyNativeAddonPreflight(options);
  const kernel = await verifyRegoloKernel(options.de441, options.expectedDe441Sha256);
  const binding = createRequire(import.meta.url)(preflight.index);
  if (typeof binding.Engine !== 'function' ||
      typeof binding.Engine.prototype.riseTransUt !== 'function') {
    throw new Error('E_REGOLO_ENGINE_API: real Engine.riseTransUt is unavailable');
  }
  const engine = new binding.Engine(kernel.file);
  const source = Object.freeze({engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: preflight.upstreamCommitSha,
    kernelSetId: kernel.sha256, timeModelId: options.timeModelId});
  const executed = executeRegoloNativeCases(engine, source, options.dut1Seconds);
  return Object.freeze({contract: 'VirgoStarsNativeRegoloLotsSmokeV1',
    status: executed.failed ? 'NATIVE_ADDON_EXECUTED_WITH_FAILURES' :
      'NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY',
    validatedScientificParity: false,
    addonBuiltFromSelectedCommitIndependentlyVerified: false,
    recordedMoonConjunctionVerified: false,
    ephemeris: Object.freeze({upstreamCommitSha: preflight.upstreamCommitSha,
      nativeAddonSha256: preflight.nativeAddonSha256,
      de441Sha256: kernel.sha256, timeModelId: options.timeModelId,
      dut1Seconds: options.dut1Seconds,
      timeModelAuthenticity: 'CALLER_ASSERTED_NOT_AUTHENTICATED'}),
    observer: OBSERVER, solarModel: MODEL,
    fixtures: REGOLO_NATIVE_CASES,
    ...executed});
}

export const HELP = `VirgoStars Regolo lots — opt-in real native-addon smoke.

Requirements: a clean pinned VirgoStars-Ephemeris checkout, a built native
bindings/node/native/virgostars_ephemeris.node and an existing DE441 file.
Provide independently recorded full Git commit SHA-1 and SHA-256 hashes.

node scripts/verify-native-regolo-lots.mjs \\
  --checkout PATH_TO_VIRGOSTARS_EPHEMERIS \\
  --expected-commit FULL_40_HEX_COMMIT \\
  --expected-addon-sha256 FULL_64_HEX_NATIVE_ADDON_SHA256 \\
  --de441 PATH_TO_EXISTING_DE441 \\
  --expected-de441-sha256 FULL_64_HEX_DE441_SHA256 \\
  --time-model EXPLICIT_PINNED_TIME_MODEL_LABEL \\
  --dut1-seconds EXPLICIT_UT1_MINUS_UTC_SECONDS

Runs two Rome synthetic-chart cases (local midday and night) and outputs a
JSON receipt. No user natal data, source download, DB writes or production
integration. This checks only native execution and coarse day/night shape,
not independently verified numerical sunrise accuracy or wheel provenance.`;

async function main() {
  try {
    const options = parseRegoloNativeOptions(process.argv.slice(2));
    if (options.help) { process.stdout.write(`${HELP}\n`); return; }
    const receipt = await runNativeRegoloSmoke(options);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    if (receipt.failed > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
