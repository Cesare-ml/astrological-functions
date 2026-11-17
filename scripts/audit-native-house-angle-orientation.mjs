#!/usr/bin/env node
/**
 * OFFLINE diagnostic for the eastern/rising branch of native house angles.
 * It checks the geometry of an owner-supplied latitude receipt, not external
 * astronomical parity or the availability of any astrological house system.
 * This calculation MUST NOT be used as a runtime substitute for the Rust core.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {LATITUDE_AUDIT_CASES} from './audit-native-house-latitudes.mjs';
import {HOUSE_SMOKE_FIXTURE} from './verify-native-house-bridge.mjs';

const RAD = Math.PI / 180;
const EXPECTED_MODEL = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
const HORIZON_TOLERANCE = 1e-9;
const CROSSING_TOLERANCE = 1e-10;
const error = (code, reason) => { throw new Error(`${code}: ${reason}`); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const longitude = value => finite(value) && value >= 0 && value < 360;
const normalize = degrees => ((degrees % 360) + 360) % 360;

/**
 * Analytic geometry only: verifies that an ecliptic point lies on the local
 * horizon and whether sidereal rotation carries it upwards (rising) or down.
 * No sidereal-time, ephemeris, or house-cusp values are independently computed.
 */
export function classifyNativeAscendantBranch({latitudeDeg, armcDeg,
  trueObliquityDeg, ascendantDeg}) {
  if (!finite(latitudeDeg) || Math.abs(latitudeDeg) >= 90 ||
      !longitude(armcDeg) || !longitude(ascendantDeg) ||
      !finite(trueObliquityDeg) || trueObliquityDeg <= 0 ||
      trueObliquityDeg >= 90) {
    error('E_NATIVE_ANGLE_ORIENTATION_INPUT', 'Finite canonical angles and |latitude| < 90 required');
  }
  const phi = latitudeDeg * RAD;
  const epsilon = trueObliquityDeg * RAD;
  const lambda = ascendantDeg * RAD;
  const alpha = Math.atan2(Math.sin(lambda) * Math.cos(epsilon), Math.cos(lambda));
  const delta = Math.asin(Math.sin(lambda) * Math.sin(epsilon));
  const hourAngle = armcDeg * RAD - alpha;
  const sinAltitude = Math.sin(phi) * Math.sin(delta) +
    Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const crossingDerivative = -Math.cos(phi) * Math.cos(delta) * Math.sin(hourAngle);
  const oppositeLongitudeDeg = normalize(ascendantDeg + 180);
  const status = Math.abs(sinAltitude) > HORIZON_TOLERANCE
    ? 'NOT_ON_HORIZON'
    : crossingDerivative > CROSSING_TOLERANCE ? 'RISING_BRANCH'
      : crossingDerivative < -CROSSING_TOLERANCE ? 'SETTING_BRANCH'
        : 'TANGENT_INDETERMINATE';
  return Object.freeze({status, sinAltitude, crossingDerivative,
    oppositeLongitudeDeg});
}

/** Validate exact synthetic observer identity before interpreting receipt data. */
export function auditNativeHouseAngleOrientation(receipt) {
  if (!receipt || receipt.contract !== 'VirgoStarsNativeHouseLatitudeAuditV1' ||
      !Array.isArray(receipt.scenarios) ||
      receipt.scenarios.length !== LATITUDE_AUDIT_CASES.length) {
    error('E_NATIVE_ANGLE_ORIENTATION_RECEIPT', 'A complete seven-latitude receipt is required');
  }
  const scenarios = LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}, index) => {
    const row = receipt.scenarios[index];
    const expectedFixture = {...HOUSE_SMOKE_FIXTURE, id, latitudeDeg};
    if (!row || row.id !== id || !row.fixture ||
        Object.keys(expectedFixture).some(key => row.fixture[key] !== expectedFixture[key])) {
      error('E_NATIVE_ANGLE_ORIENTATION_FIXTURE', `Unexpected fixture at ${id}`);
    }
    const source = row.sourceAngles;
    if (source === null) {
      return Object.freeze({id, latitudeDeg, status: 'SOURCE_ANGLES_MISSING'});
    }
    if (!source || source.model !== EXPECTED_MODEL ||
        !longitude(source.midheavenDeg)) {
      error('E_NATIVE_ANGLE_ORIENTATION_MODEL', `Missing/incompatible Rust model at ${id}`);
    }
    return Object.freeze({id, latitudeDeg, ascendantDeg: source.ascendantDeg,
      ...classifyNativeAscendantBranch({latitudeDeg,
        armcDeg: source.armcDeg, trueObliquityDeg: source.trueObliquityDeg,
        ascendantDeg: source.ascendantDeg})});
  });
  const requiresReview = scenarios.filter(row => row.status !== 'RISING_BRANCH');
  return Object.freeze({contract: 'VirgoStarsNativeHouseAngleOrientationAuditV1',
    status: requiresReview.length === 0 ? 'ANALYTIC_BRANCH_CHECK_PASSED_NOT_CERTIFIED'
      : 'NATIVE_ASCENDANT_BRANCH_REVIEW_REQUIRED',
    scientificallyCertified: false, nativeBinaryProvenanceVerified: false,
    checked: scenarios.length, flagged: requiresReview.length, scenarios});
}

function readReceipt(file) {
  const size = statSync(file).size;
  if (size === 0 || size > 5_000_000) {
    error('E_NATIVE_ANGLE_ORIENTATION_FILE', 'Receipt must be nonempty and <= 5 MB');
  }
  const bytes = readFileSync(file);
  const utf16le = bytes[0] === 0xff && bytes[1] === 0xfe;
  const json = (utf16le ? bytes.toString('utf16le') : bytes.toString('utf8'))
    .replace(/^\uFEFF/, '');
  return JSON.parse(json);
}

export const HELP_TEXT = `Offline check of rising versus setting native Ascendant at seven synthetic latitudes.
Usage: node scripts/audit-native-house-angle-orientation.mjs --receipt PATH [--json]

Reads UTF-8 or Windows PowerShell UTF-16LE/BOM receipt JSON (no addon needed).
Exit 0 = all seven horizon crossings rising; 2 = any branch needs review;
1 = invalid input. This does NOT certify astronomy, method cusps or addon provenance.
Opposite longitudes are DIAGNOSTIC CANDIDATES, never corrected house outputs.`;

async function main() {
  try {
    const {values} = parseArgs({options: {receipt: {type: 'string'},
      json: {type: 'boolean'}, help: {type: 'boolean'}}, strict: true});
    if (values.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    if (!values.receipt) {
      error('E_NATIVE_ANGLE_ORIENTATION_OPTIONS', '--receipt PATH is required');
    }
    const result = auditNativeHouseAngleOrientation(readReceipt(values.receipt));
    if (values.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${result.status}: ${result.flagged}/${result.checked} require review\n`);
      for (const row of result.scenarios) {
        process.stdout.write(`${row.id}: ${row.status}` +
          (row.ascendantDeg === undefined ? '' :
            ` (native Asc ${row.ascendantDeg.toFixed(6)}°, opposite diagnostic ${row.oppositeLongitudeDeg.toFixed(6)}°)`) + '\n');
      }
      process.stdout.write('Analytic diagnostic only; no scientific certification or fallback.\n');
    }
    if (result.flagged > 0) process.exitCode = 2;
  } catch (caught) {
    process.stderr.write(`${String(caught?.message ?? caught)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
