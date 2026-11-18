#!/usr/bin/env node
/**
 * Compare two complete, caller-supplied native latitude receipts, offline.
 * This reports observable version changes, NOT independent astronomical or
 * Astro.com method parity. No addon, kernel, network or fallback is loaded.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {LATITUDE_AUDIT_CASES} from './audit-native-house-latitudes.mjs';
import {validateNativeLatitudeAudit} from './compare-native-house-latitudes.mjs';

const METHODS = Object.freeze(ASTRO_COM_HOUSE_SYSTEM_IDS.filter(id => id !== 'SUNSHINE'));
const ANGLES = Object.freeze(['armcDeg', 'ascendantDeg',
  'midheavenDeg', 'trueObliquityDeg']);
const MAX_RECEIPT_BYTES = 5_000_000;
const fail = (code, why) => {throw new Error(`${code}: ${why}`);};

function circularDeltaArcsec(a, b) {
  const delta = Math.abs(a - b);
  return Math.min(delta, 360 - delta) * 3600;
}

/** Fail closed before interpreting either version as a valid 161-case run. */
export function diffNativeHouseLatitudes(before, after) {
  validateNativeLatitudeAudit(before);
  validateNativeLatitudeAudit(after);
  if (before.ephemeris.kernelContext !== after.ephemeris.kernelContext) {
    fail('E_LATITUDE_DIFF_KERNEL_CONTEXT', 'Both receipts must use the same declared kernel context');
  }

  const transitions = {bothSucceeded: 0, errorToSuccess: 0,
    successToError: 0, bothErrored: 0, errorCodesChanged: 0,
    successValuesChanged: 0};
  const scenarios = LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}, i) => {
    const old = before.scenarios[i];
    const current = after.scenarios[i];
    const oldOk = new Map(old.results.map(row => [row.houseSystem, row]));
    const newOk = new Map(current.results.map(row => [row.houseSystem, row]));
    const oldErrors = new Map(old.failures.map(row => [row.houseSystem, row]));
    const newErrors = new Map(current.failures.map(row => [row.houseSystem, row]));
    const counts = {bothSucceeded: 0, errorToSuccess: 0,
      successToError: 0, bothErrored: 0, errorCodesChanged: 0,
      successValuesChanged: 0};
    const methods = METHODS.map(houseSystem => {
      const a = oldOk.get(houseSystem);
      const b = newOk.get(houseSystem);
      let outcome;
      if (a && b) {
        const deltasArcsec = a.valuesDeg.map((deg, j) => circularDeltaArcsec(deg, b.valuesDeg[j]));
        const maxCuspDeltaArcsec = Math.max(...deltasArcsec);
        const worstCusp = deltasArcsec.indexOf(maxCuspDeltaArcsec) + 1;
        const changedCusps = a.valuesDeg.reduce((count, deg, j) =>
          count + Number(deg !== b.valuesDeg[j]), 0);
        counts.bothSucceeded++;
        if (changedCusps > 0) counts.successValuesChanged++;
        outcome = {houseSystem, transition: 'BOTH_SUCCEEDED',
          comparedCusps: a.valuesDeg.length, changedCusps,
          maxCuspDeltaArcsec, worstCusp};
      } else if (!a && b) {
        counts.errorToSuccess++;
        outcome = {houseSystem, transition: 'ERROR_TO_SUCCESS',
          previousErrorCode: oldErrors.get(houseSystem).code};
      } else if (a && !b) {
        counts.successToError++;
        outcome = {houseSystem, transition: 'SUCCESS_TO_ERROR',
          newErrorCode: newErrors.get(houseSystem).code};
      } else {
        const previousError = oldErrors.get(houseSystem);
        const newError = newErrors.get(houseSystem);
        counts.bothErrored++;
        if (previousError.code !== newError.code) counts.errorCodesChanged++;
        outcome = {houseSystem, transition: 'BOTH_ERRORED',
          previousErrorCode: previousError.code, newErrorCode: newError.code,
          errorMessageChanged: previousError.message !== newError.message};
      }
      return outcome;
    });
    for (const key of Object.keys(transitions)) transitions[key] += counts[key];
    const angleDeltaArcsec = old.sourceAngles && current.sourceAngles
      ? Object.fromEntries(ANGLES.map(name => [name,
        circularDeltaArcsec(old.sourceAngles[name], current.sourceAngles[name])]))
      : null;
    return {id, latitudeDeg,
      before: {passed: old.passed, failed: old.failed},
      after: {passed: current.passed, failed: current.failed},
      sourceAngleAvailabilityChanged: Boolean(old.sourceAngles) !== Boolean(current.sourceAngles),
      angleDeltaArcsec, ...counts, methods};
  });
  return Object.freeze({contract: 'VirgoStarsNativeHouseLatitudeDiffV1',
    status: 'VERSION_DIFFERENCES_RECORDED_NOT_CERTIFIED',
    scientificallyCertified: false, comparisonToIndependentReference: false,
    nativeBuildOriginIndependentlyVerified: false,
    methodAvailabilityIndependentlyVerified: false,
    before: {upstreamCommitSha: before.ephemeris.upstreamCommitSha,
      nativeAddonSha256: before.ephemeris.nativeAddonSha256,
      kernelContext: before.ephemeris.kernelContext, passed: before.passed, failed: before.failed},
    after: {upstreamCommitSha: after.ephemeris.upstreamCommitSha,
      nativeAddonSha256: after.ephemeris.nativeAddonSha256,
      kernelContext: after.ephemeris.kernelContext, passed: after.passed, failed: after.failed},
    sameAddonDigest: before.ephemeris.nativeAddonSha256 === after.ephemeris.nativeAddonSha256,
    attempted: before.attempted, scenarioCount: scenarios.length,
    ...transitions, scenarios});
}

/** Decode original receipt bytes without losing Windows UTF-16LE/BOM identity. */
export function parseNativeLatitudeDiffReceiptBytes(
  bytes, filename = 'receipt.json', maxBytes = MAX_RECEIPT_BYTES) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > maxBytes) {
    fail('E_LATITUDE_DIFF_FILE', `JSON receipt must be nonempty and <= ${maxBytes} bytes`);
  }
  const utf16le = bytes[0] === 0xff && bytes[1] === 0xfe;
  const json = (utf16le ? bytes.toString('utf16le') : bytes.toString('utf8'))
    .replace(/^\uFEFF/, '');
  try {
    return JSON.parse(json);
  } catch {
    fail('E_LATITUDE_DIFF_JSON', `Invalid UTF-8 or UTF-16LE/BOM JSON receipt: ${path.basename(filename)}`);
  }
}

/** Handle default PowerShell's UTF-16LE/BOM redirection as well as UTF-8. */
export function readNativeLatitudeDiffReceipt(filename, maxBytes = MAX_RECEIPT_BYTES) {
  const stat = statSync(filename);
  if (!stat.isFile() || stat.size === 0 || stat.size > maxBytes) {
    fail('E_LATITUDE_DIFF_FILE', `JSON receipt must be nonempty and <= ${maxBytes} bytes`);
  }
  return parseNativeLatitudeDiffReceiptBytes(readFileSync(filename), filename, maxBytes);
}

export const HELP_TEXT = `Offline, full-grid version-to-version diagnostic (7 latitudes × 23 methods).
Usage: node scripts/diff-native-house-latitudes.mjs --before OLD.json --after NEW.json [--json]

Both files must be complete VirgoStarsNativeHouseLatitudeAuditV1 receipts with
the identical synthetic observer fixtures and declared kernel context. UTF-8
and Windows PowerShell UTF-16LE/BOM JSON are accepted (<= 5 MB each).
Exit 0: valid comparison, even if new errors or cusp changes were observed.
Exit 1: invalid/incomplete input. This never certifies scientific parity,
method availability, numerical improvements or native binary provenance.`;

async function main() {
  try {
    const {values} = parseArgs({strict: true, options: {
      before: {type: 'string'}, after: {type: 'string'},
      json: {type: 'boolean'}, help: {type: 'boolean'},
    }});
    if (values.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    if (!values.before || !values.after) {
      fail('E_LATITUDE_DIFF_ARGS', '--before and --after receipt paths are required');
    }
    const result = diffNativeHouseLatitudes(
      readNativeLatitudeDiffReceipt(values.before),
      readNativeLatitudeDiffReceipt(values.after));
    if (values.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`Native latitude receipt changes: ${result.attempted} cases; ` +
        `${result.before.passed}/${result.attempted} before, ` +
        `${result.after.passed}/${result.attempted} after\n`);
      process.stdout.write(`Error to success: ${result.errorToSuccess}; success to error: ` +
        `${result.successToError}; error codes changed: ${result.errorCodesChanged}; ` +
        `successful cusp arrays changed: ${result.successValuesChanged}\n`);
      for (const row of result.scenarios) {
        const asc = row.angleDeltaArcsec?.ascendantDeg;
        process.stdout.write(`${row.id}: ${row.before.passed} -> ${row.after.passed} success; ` +
          `recovered ${row.errorToSuccess}, new errors ${row.successToError}; ` +
          `Asc delta ${asc === undefined ? 'missing' : `${asc.toFixed(6)} arcsec`}\n`);
      }
      process.stdout.write(`Addon SHA changed: ${!result.sameAddonDigest}. ` +
        'Version difference only; scientific and method parity NOT certified.\n');
    }
  } catch (caught) {
    process.stderr.write(`${String(caught?.message ?? caught)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
