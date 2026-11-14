/**
 * Experimental, purely symbolic F3 whole-sign house geometry.
 * The caller must supply an already-computed ascendant in a declared zodiac
 * basis. This module never derives astronomy, local time, or an ayanamsa.
 */
import { AstrologyError, normalize360, zodiacSignIndex } from './index.mjs';

const ROOT_KEYS = new Set([
  'ascendantLongitudeDeg', 'birthTimeKnown', 'datetimeUtc', 'frame', 'longitudeBasis',
]);
const BASIS_KEYS = new Set(['type', 'ayanamsaId']);

function fail(code, message) {
  throw new AstrologyError(code, message);
}

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function rejectUnknownKeys(value, allowed, label) {
  if (Object.keys(value).some(key => !allowed.has(key))) {
    fail('INVALID_WHOLE_SIGN_INPUT', `${label} has unrecognized fields`);
  }
}

function validateUtc(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    fail('INVALID_UTC', 'datetimeUtc must be an explicit UTC instant with at most millisecond precision');
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    fail('INVALID_UTC', 'datetimeUtc must be a real UTC calendar instant');
  }
  const canonical = new Date(timestamp).toISOString().replace(/\.000Z$/, 'Z');
  const supplied = value.replace(/\.(\d{1,3})Z$/, (_, fraction) =>
    `.${fraction.padEnd(3, '0')}Z`).replace(/\.000Z$/, 'Z');
  if (canonical !== supplied) {
    fail('INVALID_UTC', 'datetimeUtc must be a real UTC calendar instant');
  }
}

function validateBasis(value) {
  if (!isPlainRecord(value)) {
    fail('INVALID_ZODIAC', 'An explicit tropical or sidereal longitudeBasis is required');
  }
  rejectUnknownKeys(value, BASIS_KEYS, 'longitudeBasis');
  if (value.type === 'TROPICAL') {
    if (Object.hasOwn(value, 'ayanamsaId')) {
      fail('INVALID_ZODIAC', 'Tropical coordinates must not declare an ayanamsa');
    }
    return Object.freeze({ type: 'TROPICAL' });
  }
  if (value.type === 'SIDEREAL' &&
      typeof value.ayanamsaId === 'string' && value.ayanamsaId.length <= 128 &&
      value.ayanamsaId.length > 0 && value.ayanamsaId.trim() === value.ayanamsaId) {
    return Object.freeze({ type: 'SIDEREAL', ayanamsaId: value.ayanamsaId });
  }
  fail('INVALID_ZODIAC', 'Sidereal coordinates require a nonblank, unpadded ayanamsaId');
}

/**
 * House 1 begins at 0° of the ascendant's sign; all other houses are exactly
 * 30° sign spans. This is NOT equal houses anchored at the ascendant degree.
 * Every input position used with the result must share its zodiac basis.
 */
export function calculateWholeSignHouseCusps(input) {
  if (!isPlainRecord(input)) {
    fail('INVALID_WHOLE_SIGN_INPUT', 'Expected a plain input object');
  }
  rejectUnknownKeys(input, ROOT_KEYS, 'Input');
  if (input.birthTimeKnown === false) {
    fail('BIRTH_TIME_UNKNOWN', 'Whole-sign houses require a known birth time and supplied ascendant');
  }
  if (input.birthTimeKnown !== true) {
    fail('INVALID_WHOLE_SIGN_INPUT', 'birthTimeKnown: true must be asserted explicitly');
  }
  const { ascendantLongitudeDeg, datetimeUtc, frame } = input;
  if (typeof ascendantLongitudeDeg !== 'number' || !Number.isFinite(ascendantLongitudeDeg)) {
    fail('INVALID_ANGLE', 'ascendantLongitudeDeg must be a finite number');
  }
  validateUtc(datetimeUtc);
  if (frame !== 'ECLIPTIC_OF_DATE') {
    fail('INVALID_FRAME', 'ECLIPTIC_OF_DATE is required');
  }
  const longitudeBasis = validateBasis(input.longitudeBasis);
  const ascendant = normalize360(ascendantLongitudeDeg);
  const ascendantSignIndex = zodiacSignIndex(ascendant);
  const firstCuspDeg = ascendantSignIndex * 30;
  const cuspsDeg = Object.freeze(Array.from({ length: 12 }, (_, index) =>
    normalize360(firstCuspDeg + index * 30)));

  return Object.freeze({
    contract: 'WholeSignHouseCusps',
    contractVersion: '0.1.0-experimental',
    houseSystem: 'WHOLE_SIGN',
    datetimeUtc,
    frame,
    longitudeBasis,
    birthTimeKnown: true,
    ascendantLongitudeDeg: ascendant,
    ascendantSignIndex,
    cuspsDeg,
    provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  });
}
