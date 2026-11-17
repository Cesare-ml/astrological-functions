#!/usr/bin/env node
/**
 * Explicit, opt-in smoke run against the REAL locally built VirgoStars Node addon.
 * This does not establish astronomical or Astro.com method accuracy.
 * No addon is installed, built, downloaded, or searched for automatically.
 */
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {calculateAstroComHouseFromProvider} from '../src/astro-com-house-provider.mjs';
import {bindVirgoStarsNodeHouseAngles} from '../src/virgostars-node-house-bridge.mjs';

const FIELDS = Object.freeze({
  checkout: 'string', 'expected-commit': 'string', 'expected-addon-sha256': 'string',
  'kernel-context': 'string', help: 'boolean',
});
export const HOUSE_SMOKE_FIXTURE = Object.freeze({
  id: 'J2000_NOON_40N_SYNTHETIC_TIMESCALES',
  datetimeUtc: '2000-01-01T12:00:00Z',
  birthTimeKnown: true,
  ut1JulianDay: 2451545,
  ttJulianDay: 2451545.0008,
  latitudeDeg: 40,
  longitudeDegEast: 12.4964,
});

const fullSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
const addonSha = value => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
const label = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 128 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);

export function parseNativeHouseOptions(argv) {
  const {values} = parseArgs({args: argv, strict: true, allowPositionals: false,
    options: Object.fromEntries(Object.entries(FIELDS).map(([key, type]) =>
      [key, {type}]))});
  if (values.help) return {help: true};
  if (!label(values.checkout) || !fullSha(values['expected-commit']) ||
      !addonSha(values['expected-addon-sha256']) || !label(values['kernel-context'])) {
    throw new Error('E_NATIVE_SMOKE_OPTIONS: require --checkout, --expected-commit (40 hex), ' +
      '--expected-addon-sha256 (64 hex) and --kernel-context (explicit label)');
  }
  return Object.freeze({checkout: values.checkout,
    expectedCommit: values['expected-commit'].toLowerCase(),
    expectedAddonSha256: values['expected-addon-sha256'].toLowerCase(),
    kernelContext: values['kernel-context']});
}

export function circularErrorArcsec(actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    throw new Error('E_REFERENCE_ANGLE: angles must be finite');
  }
  const diff = ((actual - expected) % 360 + 540) % 360 - 180;
  return Math.abs(diff) * 3600;
}

function git(checkout, ...args) {
  return execFileSync('git', ['-C', checkout, ...args],
    {encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe']}).trim();
}

/** Verifies the *requested bytes*, not that they were built from the source SHA. */
export function verifyNativeAddonPreflight(options) {
  const checkout = realpathSync(options.checkout);
  const root = realpathSync(git(checkout, 'rev-parse', '--show-toplevel'));
  if (root !== checkout) {
    throw new Error('E_NATIVE_SMOKE_CHECKOUT: --checkout must be the Git repository root');
  }
  const actualCommit = git(checkout, 'rev-parse', 'HEAD').toLowerCase();
  if (actualCommit !== options.expectedCommit) {
    throw new Error('E_NATIVE_SMOKE_COMMIT: checkout HEAD does not match the expected commit');
  }
  if (git(checkout, 'status', '--porcelain', '--untracked-files=no') !== '') {
    throw new Error('E_NATIVE_SMOKE_DIRTY: tracked source differs from the pinned checkout');
  }
  const index = path.join(checkout, 'bindings', 'node', 'index.js');
  const addon = path.join(checkout, 'bindings', 'node', 'native', 'virgostars_ephemeris.node');
  for (const filename of [index, addon]) {
    if (!existsSync(filename)) {
      throw new Error(`E_NATIVE_SMOKE_MISSING: required binding file is missing (${path.basename(filename)})`);
    }
    const resolved = realpathSync(filename);
    const relative = path.relative(checkout, resolved);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('E_NATIVE_SMOKE_PATH: binding path escapes the pinned repository');
    }
  }
  // Check the tracked Node loader file is part of the selected revision.
  git(checkout, 'ls-files', '--error-unmatch', '--', 'bindings/node/index.js');
  const actualAddonSha256 = createHash('sha256').update(readFileSync(addon)).digest('hex');
  if (actualAddonSha256 !== options.expectedAddonSha256) {
    throw new Error('E_NATIVE_SMOKE_SHA256: installed native addon differs from the pinned digest');
  }
  return Object.freeze({checkout, index, addon, upstreamCommitSha: actualCommit,
    nativeAddonSha256: actualAddonSha256});
}

export async function runNativeHouseSmoke(options) {
  const files = verifyNativeAddonPreflight(options);
  // Loading the binary is intentionally *after* SHA, checkout and source checks.
  const nativeModule = createRequire(import.meta.url)(files.index);
  if (typeof nativeModule.createHouseAngleProvider !== 'function') {
    throw new Error('E_NATIVE_SMOKE_API: upstream createHouseAngleProvider() is unavailable');
  }
  const provider = bindVirgoStarsNodeHouseAngles(nativeModule.createHouseAngleProvider(), {
    upstreamCommitSha: files.upstreamCommitSha,
    nativeAddonSha256: files.nativeAddonSha256,
    kernelSetId: options.kernelContext,
  });
  const results = [];
  const failures = [];
  let angles = null;
  for (const houseSystem of ASTRO_COM_HOUSE_SYSTEM_IDS) {
    if (houseSystem === 'SUNSHINE') continue; // Never synthesize apparent Sun declination.
    try {
      const out = await calculateAstroComHouseFromProvider({
        ...HOUSE_SMOKE_FIXTURE, houseSystem, expectedProvider: provider.expectedProvider,
      }, provider);
      const valuesDeg = houseSystem === 'GAUQUELIN_36'
        ? out.result.sectorBoundariesDeg : out.result.cuspsDeg;
      const expectedCount = houseSystem === 'GAUQUELIN_36' ? 36 : 12;
      if (out.houseSystem !== houseSystem || out.result.houseSystem !== houseSystem ||
          !Array.isArray(valuesDeg) || valuesDeg.length !== expectedCount ||
          !valuesDeg.every(Number.isFinite)) {
        throw new Error('E_NATIVE_SMOKE_SHAPE: incorrect method, count or nonfinite output');
      }
      const extractedAngles = Object.freeze({
        model: out.angleSource.model, armcDeg: out.angleSource.armcDeg,
        ascendantDeg: out.angleSource.ascendantDeg,
        midheavenDeg: out.angleSource.midheavenDeg,
        trueObliquityDeg: out.angleSource.trueObliquityDeg,
      });
      if (angles && Object.keys(angles).some(key => angles[key] !== extractedAngles[key])) {
        throw new Error('E_NATIVE_SMOKE_DRIFT: source angles changed between house-method calls');
      }
      angles = extractedAngles;
      results.push({houseSystem, valuesDeg});
    } catch (error) {
      failures.push({houseSystem, code: error.code ?? 'E_NATIVE_SMOKE_CALC',
        message: String(error.message ?? error)});
    }
  }
  return Object.freeze({contract: 'VirgoStarsNativeHouseSmokeV1',
    status: failures.length ? 'NATIVE_ADDON_EXECUTED_WITH_FAILURES' :
      'NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY',
    validatedScientificParity: false,
    addonBuiltFromSelectedCommitIndependentlyVerified: false,
    ephemeris: {upstreamCommitSha: files.upstreamCommitSha,
      nativeAddonSha256: files.nativeAddonSha256, kernelContext: options.kernelContext,
      kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441'},
    fixture: HOUSE_SMOKE_FIXTURE,
    angles,
    attempted: ASTRO_COM_HOUSE_SYSTEM_IDS.length - 1,
    passed: results.length, failed: failures.length,
    blocked: [{houseSystem: 'SUNSHINE',
      reason: 'INDEPENDENT_APPARENT_SUN_DECLINATION_NOT_SUPPLIED'}],
    results, failures});
}

export const HELP_TEXT = `Real VirgoStars-Ephemeris Node house-angle smoke test (not scientific parity).

1. Build the native addon in a pinned, clean VirgoStars-Ephemeris checkout:
   cd bindings/node && npm run build
2. Record actual Git HEAD and SHA-256 of native/virgostars_ephemeris.node.
3. Run from astrological-functions:
   node scripts/verify-native-house-bridge.mjs \\
     --checkout PATH_TO_VIRGOSTARS_EPHEMERIS \\
     --expected-commit FULL_40_HEX_GIT_SHA \\
     --expected-addon-sha256 FULL_64_HEX_NATIVE_ADDON_SHA256 \\
     --kernel-context EXPLICIT_EXTERNAL_CONTEXT_LABEL

Outputs JSON only; exit 1 if any of the 23 attempted methods fails.
Sunshine remains blocked (requires real apparent Sun declination). The SHA
proves file identity only, not reproducible build provenance or precision.`;

async function main() {
  try {
    const options = parseNativeHouseOptions(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    const receipt = await runNativeHouseSmoke(options);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    if (receipt.failed > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${String(error.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
