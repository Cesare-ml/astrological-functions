#!/usr/bin/env node
/**
 * Offline comparison of the seven-latitude real-addon audit to documented
 * caller-supplied numerical AND availability references. Neither the native
 * binary nor the reference issuer/source independence is certified here.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE, circularErrorArcsec} from './verify-native-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES} from './audit-native-house-latitudes.mjs';

const METHODS = Object.freeze(ASTRO_COM_HOUSE_SYSTEM_IDS.filter(id => id !== 'SUNSHINE'));
const methodSet = new Set(METHODS);
const caseById = new Map(LATITUDE_AUDIT_CASES.map(row => [row.id, row]));
const model = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
const ANGLES = Object.freeze(['armcDeg', 'ascendantDeg', 'midheavenDeg', 'trueObliquityDeg']);
const ALLOWED_UNAVAILABLE = new Set([
  'POLAR_HOUSES_UNAVAILABLE', 'POLAR_ASCENDANT_UNAVAILABLE',
  'ALBATEGNIUS_HOUSES_UNAVAILABLE', 'GAUQUELIN_CUSPS_UNAVAILABLE',
  'AZIMUTH_UNAVAILABLE', 'HOUSE_GEOMETRY_UNAVAILABLE',
  'MERIDIAN_PROJECTION_UNAVAILABLE', 'ASCENDANT_ARC_UNAVAILABLE',
  'DECLINATION_CIRCLE_UNAVAILABLE', 'DECLINATION_ARC_UNAVAILABLE',
  'DEGENERATE_HOUSE_GEOMETRY', 'DEGENERATE_QUADRANTS',
]);
const plain = obj => obj !== null && typeof obj === 'object' && !Array.isArray(obj) &&
  (Object.getPrototypeOf(obj) === Object.prototype || Object.getPrototypeOf(obj) === null);
const keysExactly = (obj, keys) => plain(obj) && Object.keys(obj).length === keys.length &&
  keys.every(key => Object.hasOwn(obj, key));
const label = value => typeof value === 'string' && value.trim() === value &&
  value.length > 0 && value.length <= 256 && !/[\x00-\x1f\x7f]/.test(value);
const fail = (code, why) => {throw new Error(`${code}: ${why}`);};
const validSha = (value, length) => typeof value === 'string' &&
  new RegExp(`^[0-9a-f]{${length}}$`, 'i').test(value);

function checkArray(values, n, where) {
  if (!Array.isArray(values) || values.length !== n ||
      !values.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 360)) {
    fail('E_LATITUDE_COMPARE_VALUES', `${where}: ${n} canonical longitudes [0,360) required`);
  }
}
function checkSource(source, kind) {
  if (!keysExactly(source, ['kind', 'title', 'uri', 'acquiredUtc', 'convention']) ||
      source.kind !== kind || !label(source.title) || !label(source.convention) ||
      typeof source.uri !== 'string' || !/^https:\/\/[^\s]+$/i.test(source.uri) ||
      typeof source.acquiredUtc !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(source.acquiredUtc) ||
      !Number.isFinite(Date.parse(source.acquiredUtc))) {
    fail('E_LATITUDE_COMPARE_SOURCE', `Document a full HTTPS/UTC source of kind ${kind}`);
  }
}
function checkTolerance(value, rationale) {
  if (typeof value !== 'number' || !Number.isFinite(value) ||
      value <= 0 || value > 3600 || !label(rationale)) {
    fail('E_LATITUDE_COMPARE_TOLERANCE', 'Need justified tolerance in (0,3600] arcseconds');
  }
}
function checkFixture(fixture, scenario) {
  const expected = {...HOUSE_SMOKE_FIXTURE, id: scenario.id, latitudeDeg: scenario.latitudeDeg};
  if (!keysExactly(fixture, Object.keys(expected)) ||
      Object.keys(expected).some(key => fixture[key] !== expected[key])) {
    fail('E_LATITUDE_COMPARE_FIXTURE', `Unexpected UTC, UT1/TT or observer for ${scenario.id}`);
  }
}

function checkAudit(audit) {
  if (!plain(audit) || audit.contract !== 'VirgoStarsNativeHouseLatitudeAuditV1' ||
      audit.scientificallyCertified !== false ||
      audit.expectedPolarAvailabilityVerified !== false ||
      audit.highLatitudeMethodParityVerified !== false ||
      audit.resultsAreIndependentReferences !== false ||
      audit.scenarioCount !== LATITUDE_AUDIT_CASES.length ||
      audit.attempted !== LATITUDE_AUDIT_CASES.length * METHODS.length ||
      !Array.isArray(audit.scenarios) || audit.scenarios.length !== LATITUDE_AUDIT_CASES.length ||
      !Array.isArray(audit.blocked) || audit.blocked.length !== 1 ||
      audit.blocked[0]?.houseSystem !== 'SUNSHINE' ||
      !plain(audit.ephemeris) ||
      !validSha(audit.ephemeris.upstreamCommitSha, 40) ||
      !validSha(audit.ephemeris.nativeAddonSha256, 64) ||
      !label(audit.ephemeris.kernelContext) ||
      audit.ephemeris.kernelRole !== 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441' ||
      audit.ephemeris.addonBuiltFromSelectedCommitIndependentlyVerified !== false) {
    fail('E_LATITUDE_COMPARE_AUDIT', 'A complete, pinned real-addon latitude receipt is required');
  }
  let passed = 0;
  let failed = 0;
  for (let i = 0; i < LATITUDE_AUDIT_CASES.length; i++) {
    const expected = LATITUDE_AUDIT_CASES[i];
    const scenario = audit.scenarios[i];
    if (!plain(scenario) || scenario.id !== expected.id ||
        scenario.attempted !== METHODS.length || !Array.isArray(scenario.results) ||
        !Array.isArray(scenario.failures) ||
        scenario.passed !== scenario.results.length ||
        scenario.failed !== scenario.failures.length ||
        scenario.passed + scenario.failed !== METHODS.length) {
      fail('E_LATITUDE_COMPARE_AUDIT', `Malformed native results for ${expected.id}`);
    }
    checkFixture(scenario.fixture, expected);
    const seen = new Set();
    for (const result of scenario.results) {
      if (!plain(result) || !methodSet.has(result.houseSystem) || seen.has(result.houseSystem)) {
        fail('E_LATITUDE_COMPARE_AUDIT', `${expected.id}: repeated/unknown successful method`);
      }
      seen.add(result.houseSystem);
      checkArray(result.valuesDeg, result.houseSystem === 'GAUQUELIN_36' ? 36 : 12,
        `${expected.id}:${result.houseSystem}`);
    }
    for (const error of scenario.failures) {
      if (!plain(error) || !methodSet.has(error.houseSystem) || seen.has(error.houseSystem) ||
          !label(error.code) || !label(error.message)) {
        fail('E_LATITUDE_COMPARE_AUDIT', `${expected.id}: malformed or duplicate failure`);
      }
      seen.add(error.houseSystem);
    }
    if (seen.size !== METHODS.length) {
      fail('E_LATITUDE_COMPARE_AUDIT', `${expected.id}: a method has been omitted`);
    }
    const angles = scenario.sourceAngles;
    if ((scenario.passed > 0 && !keysExactly(angles, ['model', ...ANGLES])) ||
        (scenario.passed === 0 && angles !== null)) {
      fail('E_LATITUDE_COMPARE_AUDIT', `${expected.id}: invalid native-angle availability`);
    }
    if (angles) {
      if (angles.model !== model) fail('E_LATITUDE_COMPARE_AUDIT', 'Wrong native angle model');
      for (const name of ANGLES) checkArray([angles[name]], 1, `native ${name}`);
      if (angles.trueObliquityDeg <= 0 || angles.trueObliquityDeg >= 90) {
        fail('E_LATITUDE_COMPARE_AUDIT', 'Unphysical true obliquity');
      }
    }
    passed += scenario.passed;
    failed += scenario.failed;
  }
  const status = failed === 0 ? 'STRUCTURAL_GRID_COMPLETE_NOT_CERTIFIED'
    : 'METHOD_ERRORS_REQUIRE_MANUAL_REVIEW';
  if (audit.passed !== passed || audit.failed !== failed || audit.status !== status) {
    fail('E_LATITUDE_COMPARE_AUDIT', 'Latitude audit totals/status do not agree');
  }
}

function checkReference(reference, audit) {
  if (!plain(reference) || reference.contract !== 'VirgoStarsHouseLatitudeReferenceSetV1' ||
      !keysExactly(reference.ephemeris,
        ['upstreamCommitSha', 'nativeAddonSha256', 'kernelContext']) ||
      !['upstreamCommitSha', 'nativeAddonSha256', 'kernelContext'].every(key =>
        reference.ephemeris[key] === audit.ephemeris[key]) ||
      !Array.isArray(reference.scenarios) ||
      reference.scenarios.length > LATITUDE_AUDIT_CASES.length) {
    fail('E_LATITUDE_COMPARE_REFERENCE', 'Reference set must match the exact native addon context');
  }
  const seen = new Set();
  for (const scenario of reference.scenarios) {
    if (!plain(scenario) || !caseById.has(scenario.id) || seen.has(scenario.id) ||
        scenario.latitudeDeg !== caseById.get(scenario.id).latitudeDeg ||
        !Array.isArray(scenario.methods) || scenario.methods.length > METHODS.length) {
      fail('E_LATITUDE_COMPARE_REFERENCE', 'Reference scenario identity or methods invalid');
    }
    seen.add(scenario.id);
    if (Object.hasOwn(scenario, 'angleReference')) {
      const angles = scenario.angleReference;
      if (!plain(angles) || !keysExactly(angles.valuesDeg, ANGLES)) {
        fail('E_LATITUDE_COMPARE_REFERENCE', 'Four independent house-angle reference values required');
      }
      checkSource(angles.source, 'INDEPENDENT_ASTRONOMICAL_ANGLES');
      checkTolerance(angles.toleranceArcsec, angles.toleranceRationale);
      for (const name of ANGLES) checkArray([angles.valuesDeg[name]], 1, `angle ref ${name}`);
      if (angles.valuesDeg.trueObliquityDeg <= 0 ||
          angles.valuesDeg.trueObliquityDeg >= 90) {
        fail('E_LATITUDE_COMPARE_REFERENCE', 'Unphysical reference obliquity');
      }
    }
    const methods = new Set();
    for (const method of scenario.methods) {
      if (!plain(method) || !methodSet.has(method.houseSystem) ||
          methods.has(method.houseSystem) ||
          !['AVAILABLE', 'UNAVAILABLE'].includes(method.expectation)) {
        fail('E_LATITUDE_COMPARE_REFERENCE', 'Unknown, duplicate or unclassified method reference');
      }
      methods.add(method.houseSystem);
      if (method.expectation === 'AVAILABLE') {
        if (!keysExactly(method, ['houseSystem', 'expectation', 'valuesDeg',
          'toleranceArcsec', 'toleranceRationale', 'source'])) {
          fail('E_LATITUDE_COMPARE_REFERENCE', 'Available reference needs exact numeric values and source');
        }
        checkArray(method.valuesDeg, method.houseSystem === 'GAUQUELIN_36' ? 36 : 12,
          `reference ${method.houseSystem}`);
        checkTolerance(method.toleranceArcsec, method.toleranceRationale);
        checkSource(method.source, 'INDEPENDENT_METHOD_NUMERIC');
      } else {
        if (!keysExactly(method, ['houseSystem', 'expectation', 'errorCode', 'source']) ||
            !ALLOWED_UNAVAILABLE.has(method.errorCode)) {
          fail('E_LATITUDE_COMPARE_REFERENCE', 'Unavailability must name one approved method-specific error code');
        }
        checkSource(method.source, 'INDEPENDENT_METHOD_AVAILABILITY');
      }
    }
  }
}

/** An exact caller match is still not an independent scientific certification. */
export function compareNativeHouseLatitudeAudit(audit, reference) {
  checkAudit(audit);
  checkReference(reference, audit);
  const refs = new Map(reference.scenarios.map(s => [s.id, s]));
  const missingMethodReferences = [];
  const missingAngleReferences = [];
  const mismatches = [];
  const methods = [];
  const angleComparisons = [];
  for (const scenario of audit.scenarios) {
    const source = refs.get(scenario.id);
    const bySystem = new Map(source?.methods?.map(m => [m.houseSystem, m]) ?? []);
    const actualValues = new Map(scenario.results.map(m => [m.houseSystem, m]));
    const actualErrors = new Map(scenario.failures.map(m => [m.houseSystem, m]));
    if (!source || !Object.hasOwn(source, 'angleReference')) {
      missingAngleReferences.push(scenario.id);
    } else if (!scenario.sourceAngles) {
      mismatches.push(`${scenario.id}:HOUSE_ANGLES_NOT_AVAILABLE`);
    } else {
      const {valuesDeg, toleranceArcsec} = source.angleReference;
      const residualsArcsec = Object.fromEntries(ANGLES.map(name => [name,
        circularErrorArcsec(scenario.sourceAngles[name], valuesDeg[name])]));
      const maxResidualArcsec = Math.max(...Object.values(residualsArcsec));
      const withinTolerance = maxResidualArcsec <= toleranceArcsec;
      angleComparisons.push({id: scenario.id, residualsArcsec,
        maxResidualArcsec, toleranceArcsec, withinTolerance});
      if (!withinTolerance) mismatches.push(`${scenario.id}:HOUSE_ANGLES`);
    }
    for (const houseSystem of METHODS) {
      const ref = bySystem.get(houseSystem);
      if (!ref) {
        missingMethodReferences.push(`${scenario.id}:${houseSystem}`);
        continue;
      }
      const actual = actualValues.get(houseSystem);
      const error = actualErrors.get(houseSystem);
      let comparison;
      if (ref.expectation === 'UNAVAILABLE') {
        const withinExpectation = !!error && error.code === ref.errorCode;
        comparison = {id: scenario.id, houseSystem, expectation: 'UNAVAILABLE',
          actualErrorCode: error?.code ?? null, expectedErrorCode: ref.errorCode,
          withinExpectation};
      } else {
        const residuals = actual ? actual.valuesDeg.map((v, i) =>
          circularErrorArcsec(v, ref.valuesDeg[i])) : [];
        const maxResidualArcsec = residuals.length ? Math.max(...residuals) : null;
        const withinExpectation = maxResidualArcsec !== null &&
          maxResidualArcsec <= ref.toleranceArcsec;
        comparison = {id: scenario.id, houseSystem, expectation: 'AVAILABLE',
          actualErrorCode: error?.code ?? null,
          comparedValues: residuals.length, maxResidualArcsec,
          toleranceArcsec: ref.toleranceArcsec, withinExpectation};
      }
      methods.push(comparison);
      if (!comparison.withinExpectation) mismatches.push(`${scenario.id}:${houseSystem}`);
    }
  }
  const complete = missingMethodReferences.length === 0 && missingAngleReferences.length === 0;
  const status = mismatches.length ? 'NUMERICAL_OR_AVAILABILITY_MISMATCH' :
    complete ? 'MATCHES_CALLER_REFERENCES_NOT_CERTIFIED' : 'INCOMPLETE_REFERENCES';
  return Object.freeze({contract: 'VirgoStarsHouseLatitudeComparisonReceiptV1', status,
    scientificallyCertified: false, sourceIndependenceAudited: false,
    binaryBuildOriginIndependentlyVerified: false,
    ephemeris: audit.ephemeris, scenariosExpected: LATITUDE_AUDIT_CASES.length,
    methodsExpected: LATITUDE_AUDIT_CASES.length * METHODS.length,
    methodsCompared: methods.length, angleComparisons,
    missingMethodReferences, missingAngleReferences, mismatches,
    blocked: audit.blocked, methods});
}

export function readSmallJson(filename) {
  const stat = statSync(filename);
  if (!stat.isFile() || stat.size > 5_000_000) {
    fail('E_LATITUDE_COMPARE_FILE', 'Only regular JSON files up to 5 MB are accepted');
  }
  return JSON.parse(readFileSync(filename, 'utf8'));
}

export const HELP_TEXT = `Offline latitude-grid comparison against caller-sourced numeric and availability references.
  node scripts/compare-native-house-latitudes.mjs --audit GRID.json --reference REFERENCES.json
Exit 0 only if all 161 methods, all seven independent angle sets, and every
declared expectation match. An exit-0 receipt is NOT scientific certification.
Method-specific polar unavailability needs an explicit external reference.
See docs/NATIVE_NODE_HOUSE_LATITUDE_COMPARISON.md.`;

function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {audit: {type: 'string'}, reference: {type: 'string'}, help: {type: 'boolean'}}});
    if (values.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    if (!label(values.audit) || !label(values.reference)) {
      fail('E_LATITUDE_COMPARE_ARGS', 'Provide --audit and --reference JSON files');
    }
    const report = compareNativeHouseLatitudeAudit(readSmallJson(values.audit),
      readSmallJson(values.reference));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.status !== 'MATCHES_CALLER_REFERENCES_NOT_CERTIFIED') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
