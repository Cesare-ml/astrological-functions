#!/usr/bin/env node
/**
 * Manual latitude availability audit against an explicitly pinned REAL Rust
 * Node addon. Outcomes are observations, never independent method parity.
 * No polar fallback, reference positions or expected failures are invented.
 */
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {calculateAstroComHouseFromProvider} from '../src/astro-com-house-provider.mjs';
import {bindVirgoStarsNodeHouseAngles} from '../src/virgostars-node-house-bridge.mjs';
import {HOUSE_SMOKE_FIXTURE, parseNativeHouseOptions,
  verifyNativeAddonPreflight} from './verify-native-house-bridge.mjs';

// These are synthetic observers, NOT identifiable birth records. At high
// latitudes, a method-specific unavailable result can be perfectly legitimate.
export const LATITUDE_AUDIT_CASES = Object.freeze([
  ['S_HIGH_80', -80], ['S_NEAR_CIRCLE_66_55', -66.55],
  ['S_MID_45', -45], ['EQUATOR_0', 0], ['N_MID_45', 45],
  ['N_NEAR_CIRCLE_66_55', 66.55], ['N_HIGH_80', 80],
].map(([id, latitudeDeg]) => Object.freeze({id, latitudeDeg})));

const METHODS = Object.freeze(ASTRO_COM_HOUSE_SYSTEM_IDS.filter(id => id !== 'SUNSHINE'));
const ANGLE_KEYS = Object.freeze(['model', 'armcDeg', 'ascendantDeg',
  'midheavenDeg', 'trueObliquityDeg']);

/**
 * The caller supplies an already pinned house provider. Unit tests can inject
 * a fake structural provider, while the CLI always loads the real native addon
 * only after the existing clean-checkout/SHA preflight.
 */
export async function evaluateNativeHouseLatitudeGrid(provider) {
  if (!provider || !provider.expectedProvider ||
      typeof provider.calculateHouseAngles !== 'function') {
    throw new Error('E_NATIVE_LATITUDE_PROVIDER: a pinned house provider is required');
  }
  const scenarios = [];
  let totalPassed = 0;
  let totalFailed = 0;
  for (const {id, latitudeDeg} of LATITUDE_AUDIT_CASES) {
    const fixture = Object.freeze({...HOUSE_SMOKE_FIXTURE, id,
      latitudeDeg});
    const {id: _fixtureId, ...calculationFixture} = fixture;
    const results = [];
    const failures = [];
    let angles = null;
    for (const houseSystem of METHODS) {
      try {
        const output = await calculateAstroComHouseFromProvider({
          ...calculationFixture, houseSystem,
          expectedProvider: provider.expectedProvider}, provider);
        const valuesDeg = houseSystem === 'GAUQUELIN_36'
          ? output.result.sectorBoundariesDeg : output.result.cuspsDeg;
        const count = houseSystem === 'GAUQUELIN_36' ? 36 : 12;
        if (output.houseSystem !== houseSystem ||
            output.result.houseSystem !== houseSystem ||
            !Array.isArray(valuesDeg) || valuesDeg.length !== count ||
            !valuesDeg.every(n => typeof n === 'number' &&
              Number.isFinite(n) && n >= 0 && n < 360)) {
          throw new Error('E_NATIVE_LATITUDE_SHAPE: invalid method, sector count or longitude');
        }
        const currentAngles = Object.freeze(Object.fromEntries(
          ANGLE_KEYS.map(key => [key, output.angleSource[key]])));
        if (angles && ANGLE_KEYS.some(key => angles[key] !== currentAngles[key])) {
          throw new Error('E_NATIVE_LATITUDE_DRIFT: source angles differ within a scenario');
        }
        angles = currentAngles;
        results.push({houseSystem, valuesDeg});
      } catch (error) {
        failures.push({houseSystem, code: typeof error?.code === 'string'
          ? error.code : 'E_NATIVE_LATITUDE_METHOD',
        message: String(error?.message ?? error)});
      }
    }
    totalPassed += results.length;
    totalFailed += failures.length;
    scenarios.push({id, fixture, sourceAngles: angles, attempted: METHODS.length,
      passed: results.length, failed: failures.length, results, failures});
  }
  return Object.freeze({contract: 'VirgoStarsNativeHouseLatitudeAuditV1',
    status: totalFailed === 0 ? 'STRUCTURAL_GRID_COMPLETE_NOT_CERTIFIED'
      : 'METHOD_ERRORS_REQUIRE_MANUAL_REVIEW',
    scientificallyCertified: false,
    highLatitudeMethodParityVerified: false,
    expectedPolarAvailabilityVerified: false,
    resultsAreIndependentReferences: false,
    scenarioCount: LATITUDE_AUDIT_CASES.length,
    attempted: METHODS.length * LATITUDE_AUDIT_CASES.length,
    passed: totalPassed, failed: totalFailed,
    blocked: [{houseSystem: 'SUNSHINE',
      reason: 'INDEPENDENT_APPARENT_SUN_DECLINATION_NOT_SUPPLIED'}],
    scenarios});
}

export async function runNativeHouseLatitudeAudit(options) {
  const files = verifyNativeAddonPreflight(options);
  const nativeModule = createRequire(import.meta.url)(files.index);
  if (typeof nativeModule.createHouseAngleProvider !== 'function') {
    throw new Error('E_NATIVE_LATITUDE_API: upstream createHouseAngleProvider() is unavailable');
  }
  const provider = bindVirgoStarsNodeHouseAngles(nativeModule.createHouseAngleProvider(), {
    upstreamCommitSha: files.upstreamCommitSha,
    nativeAddonSha256: files.nativeAddonSha256,
    kernelSetId: options.kernelContext,
  });
  const audit = await evaluateNativeHouseLatitudeGrid(provider);
  return Object.freeze({...audit, ephemeris: {
    upstreamCommitSha: files.upstreamCommitSha,
    nativeAddonSha256: files.nativeAddonSha256,
    kernelContext: options.kernelContext,
    kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441',
    addonBuiltFromSelectedCommitIndependentlyVerified: false,
  }});
}

export const HELP_TEXT = `Audit 23 experimental house methods across seven latitude cases.
Pass the SAME pinned --checkout, --expected-commit, --expected-addon-sha256,
and --kernel-context arguments as verify-native-house-bridge.mjs.

Outputs full JSON: 7 synthetic observers x 23 non-Sunshine methods.
Exit 0 means only that every attempted method returned canonical-shaped data;
exit 2 means at least one method failed and requires manual classification.
Neither result certifies polar availability, scientific accuracy or binary origin.
No external references, fallback algorithms, or real birth records are used.`;

async function main() {
  try {
    const options = parseNativeHouseOptions(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    const result = await runNativeHouseLatitudeAudit(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.failed > 0) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
