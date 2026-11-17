#!/usr/bin/env node
/**
 * Offline, caller-sourced numerical comparison for the real native smoke
 * receipt. Does NOT verify source independence or certify scientific parity.
 * No external ephemeris, Swiss code, network or fallback is used here.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE, circularErrorArcsec} from './verify-native-house-bridge.mjs';

const expectedMethods = Object.freeze(
  ASTRO_COM_HOUSE_SYSTEM_IDS.filter(system => system !== 'SUNSHINE'));
const angleNames = Object.freeze(['armcDeg', 'ascendantDeg', 'midheavenDeg', 'trueObliquityDeg']);
const nativeModel = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
const allowedMethods = new Set(expectedMethods);
const plain = obj => obj !== null && typeof obj === 'object' && !Array.isArray(obj) &&
  (Object.getPrototypeOf(obj) === Object.prototype || Object.getPrototypeOf(obj) === null);
const identifier = str => typeof str === 'string' && str.trim().length > 0 &&
  str.length <= 256 && str.trim() === str;
const fail = (code, detail) => {throw new Error(`${code}: ${detail}`);};
const hasExactly = (obj, keys) => plain(obj) &&
  Object.keys(obj).length === keys.length && keys.every(key => Object.hasOwn(obj, key));

function checkLongitudeArray(values, count, context) {
  if (!Array.isArray(values) || values.length !== count ||
      !values.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 360)) {
    fail('E_HOUSE_COMPARISON_VALUES', `${context} needs ${count} finite, canonical [0,360) degrees`);
  }
}
function checkTolerance(value, reason) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 3600 ||
      !identifier(reason)) {
    fail('E_HOUSE_COMPARISON_TOLERANCE', 'Give a justified (0,3600] arcsec tolerance for each comparison');
  }
}
function source(obj, kinds) {
  if (!hasExactly(obj, ['kind', 'title', 'uri', 'acquiredUtc', 'convention']) ||
      !kinds.includes(obj.kind) || !identifier(obj.title) || !identifier(obj.convention) ||
      !/^https:\/\/[^\s]+$/i.test(obj.uri) ||
      typeof obj.acquiredUtc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(obj.acquiredUtc) ||
      !Number.isFinite(Date.parse(obj.acquiredUtc))) {
    fail('E_HOUSE_COMPARISON_SOURCE', 'Reference must document a source kind, title, HTTPS URL, UTC acquisition and convention');
  }
}
function sameFixture(actual, expected) {
  const keys = Object.keys(HOUSE_SMOKE_FIXTURE);
  return hasExactly(actual, keys) && hasExactly(expected, keys) &&
    keys.every(key => actual[key] === expected[key] && expected[key] === HOUSE_SMOKE_FIXTURE[key]);
}

function validateSmoke(smoke) {
  if (!plain(smoke) || smoke.contract !== 'VirgoStarsNativeHouseSmokeV1' ||
      smoke.status !== 'NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY' ||
      smoke.validatedScientificParity !== false ||
      !sameFixture(smoke.fixture, HOUSE_SMOKE_FIXTURE) ||
      smoke.attempted !== 23 || smoke.passed !== 23 || smoke.failed !== 0 ||
      !Array.isArray(smoke.failures) || smoke.failures.length !== 0 ||
      !Array.isArray(smoke.blocked) || smoke.blocked.length !== 1 ||
      smoke.blocked[0]?.houseSystem !== 'SUNSHINE' ||
      !Array.isArray(smoke.results) || smoke.results.length !== 23 ||
      !plain(smoke.ephemeris) || !/^[0-9a-f]{40}$/i.test(smoke.ephemeris.upstreamCommitSha) ||
      !/^[0-9a-f]{64}$/i.test(smoke.ephemeris.nativeAddonSha256) ||
      !identifier(smoke.ephemeris.kernelContext)) {
    fail('E_HOUSE_COMPARISON_SMOKE', 'Need a complete, successful 23-method native smoke receipt with explicit provenance');
  }
  if (!plain(smoke.angles) || smoke.angles.model !== nativeModel ||
      !angleNames.every(key => typeof smoke.angles[key] === 'number' &&
        Number.isFinite(smoke.angles[key]) && smoke.angles[key] >= 0 && smoke.angles[key] < 360)) {
    fail('E_HOUSE_COMPARISON_ANGLES', 'Native smoke receipt must contain four canonical source angles');
  }
  const seen = new Set();
  for (const result of smoke.results) {
    if (!plain(result) || !allowedMethods.has(result.houseSystem) || seen.has(result.houseSystem)) {
      fail('E_HOUSE_COMPARISON_METHODS', 'Native receipt contains unknown or duplicate methods');
    }
    seen.add(result.houseSystem);
    checkLongitudeArray(result.valuesDeg,
      result.houseSystem === 'GAUQUELIN_36' ? 36 : 12, result.houseSystem);
  }
  if (seen.size !== expectedMethods.length) {
    fail('E_HOUSE_COMPARISON_METHODS', 'Native receipt is missing canonical methods');
  }
}

function validateReference(reference, fixture) {
  if (!plain(reference) || reference.contract !== 'VirgoStarsHouseReferenceSetV1' ||
      !sameFixture(reference.fixture, fixture) || !Array.isArray(reference.methods) ||
      reference.methods.length > expectedMethods.length) {
    fail('E_HOUSE_COMPARISON_REFERENCE', 'Reference set requires the exact recorded fixture and an explicit methods array');
  }
  if (Object.hasOwn(reference, 'angleReference')) {
    const a = reference.angleReference;
    if (!plain(a) || !hasExactly(a.valuesDeg, angleNames)) {
      fail('E_HOUSE_COMPARISON_REFERENCE', 'Angle reference requires all four independently sourced angles');
    }
    source(a.source, ['INDEPENDENT_ASTRONOMICAL_ANGLES']);
    checkTolerance(a.toleranceArcsec, a.toleranceRationale);
    for (const key of angleNames) {
      checkLongitudeArray([a.valuesDeg[key]], 1, `reference ${key}`);
    }
  }
  if (reference.methods.length > 0) {
    source(reference.methodSource,
      ['ASTRO_COM_METHOD_PARITY', 'INDEPENDENT_METHOD_IMPLEMENTATION']);
  }
  const seen = new Set();
  for (const method of reference.methods) {
    if (!plain(method) || !allowedMethods.has(method.houseSystem) ||
        seen.has(method.houseSystem)) {
      fail('E_HOUSE_COMPARISON_REFERENCE', 'Reference method must be a unique canonical ID excluding Sunshine');
    }
    seen.add(method.houseSystem);
    checkLongitudeArray(method.valuesDeg,
      method.houseSystem === 'GAUQUELIN_36' ? 36 : 12, `reference ${method.houseSystem}`);
    checkTolerance(method.toleranceArcsec, method.toleranceRationale);
  }
}

/**
 * Comparisons are numeric only; caller-supplied reference metadata remains
 * unaudited, even when every residual falls within declared tolerances.
 */
export function compareNativeHouseReceipt(smoke, reference) {
  validateSmoke(smoke);
  validateReference(reference, smoke.fixture);
  const nativeBySystem = new Map(smoke.results.map(result => [result.houseSystem, result]));
  const methods = reference.methods.map(method => {
    const actual = nativeBySystem.get(method.houseSystem).valuesDeg;
    const residualsArcsec = actual.map((deg, i) => circularErrorArcsec(deg, method.valuesDeg[i]));
    const maxResidualArcsec = Math.max(...residualsArcsec);
    const worstIndex = residualsArcsec.indexOf(maxResidualArcsec);
    return {houseSystem: method.houseSystem,
      comparedValues: actual.length, toleranceArcsec: method.toleranceArcsec,
      maxResidualArcsec, worstIndex: worstIndex + 1,
      withinTolerance: maxResidualArcsec <= method.toleranceArcsec};
  });
  const angleResiduals = Object.hasOwn(reference, 'angleReference')
    ? Object.fromEntries(angleNames.map(name => [name, circularErrorArcsec(
      smoke.angles[name], reference.angleReference.valuesDeg[name])])) : null;
  const maxAngleResidualArcsec = angleResiduals ? Math.max(...Object.values(angleResiduals)) : null;
  const anglesWithinTolerance = angleResiduals
    ? maxAngleResidualArcsec <= reference.angleReference.toleranceArcsec : false;
  const methodSet = new Set(methods.map(method => method.houseSystem));
  const missingReferences = expectedMethods.filter(method => !methodSet.has(method));
  const failures = methods.filter(method => !method.withinTolerance).map(method => method.houseSystem);
  if (angleResiduals && !anglesWithinTolerance) failures.push('HOUSE_ANGLES');
  const complete = missingReferences.length === 0 && angleResiduals !== null;
  const status = failures.length ? 'NUMERICAL_MISMATCH' :
    complete ? 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED' : 'INCOMPLETE_REFERENCES';
  return Object.freeze({contract: 'VirgoStarsHouseComparisonReceiptV1',
    status, scientificallyCertified: false,
    referenceIndependenceAudited: false,
    binaryBuildOriginIndependentlyVerified: false,
    fixture: smoke.fixture,
    upstreamCommitSha: smoke.ephemeris.upstreamCommitSha,
    nativeAddonSha256: smoke.ephemeris.nativeAddonSha256,
    methodSource: reference.methodSource ?? null,
    angleSource: reference.angleReference?.source ?? null,
    angleResidualsArcsec: angleResiduals, maxAngleResidualArcsec,
    angleToleranceArcsec: reference.angleReference?.toleranceArcsec ?? null,
    anglesWithinTolerance,
    methodsCompared: methods.length,
    methodsExpected: expectedMethods.length,
    missingReferences, failures,
    blocked: smoke.blocked,
    methods});
}

export function readSmallJson(filename) {
  const stat = statSync(filename);
  if (!stat.isFile() || stat.size > 5_000_000) {
    fail('E_HOUSE_COMPARISON_FILE', 'Only regular JSON files up to 5 MB are accepted');
  }
  return JSON.parse(readFileSync(filename, 'utf8'));
}

export const HELP_TEXT = `Compare a real VirgoStars native house smoke receipt to caller-supplied references.
  node scripts/compare-native-house-receipt.mjs --smoke SMOKE.json --reference REFERENCE.json
Outputs JSON to stdout. Exit 0 only with all 23 methods, four angles and all
declared tolerances met. Sunshine stays blocked. Reference metadata are NOT
independently audited; even an exit-0 receipt is NOT scientific certification.
See docs/NATIVE_NODE_HOUSE_REFERENCE.md for the reference JSON contract.`;

async function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {smoke: {type: 'string'}, reference: {type: 'string'}, help: {type: 'boolean'}}});
    if (values.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    if (!identifier(values.smoke) || !identifier(values.reference)) {
      fail('E_HOUSE_COMPARISON_ARGS', 'Require --smoke and --reference JSON paths');
    }
    const result = compareNativeHouseReceipt(readSmallJson(values.smoke),
      readSmallJson(values.reference));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED') {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${String(error.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
