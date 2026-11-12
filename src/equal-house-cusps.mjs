/**
 * Experimental F3 pure geometry: equal houses measured from a caller-provided
 * ascendant. This function does not calculate an ascendant or an ephemeris.
 */
import { AstrologyError, normalize360 } from './index.mjs';

const INPUT_KEYS = new Set(['ascendantLongitudeDeg', 'datetimeUtc', 'frame', 'longitudeBasis']);
const BASIS_KEYS = new Set(['type', 'ayanamsaId']);

function fail(code, message) {
  throw new AstrologyError(code, message);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function requireKnownKeys(value, keys, label) {
  if (Object.keys(value).some(key => !keys.has(key))) {
    fail('INVALID_EQUAL_HOUSE_INPUT', `${label} contains unrecognized fields`);
  }
}

function requireUtcInstant(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    fail('INVALID_UTC', 'datetimeUtc must be an explicit UTC ISO instant (up to millisecond precision)');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().replace(/\.000Z$/, 'Z') !==
      value.replace(/\.(\d{1,3})Z$/, (_, n) => `.${n.padEnd(3, '0')}Z`).replace(/\.000Z$/, 'Z')) {
    fail('INVALID_UTC', 'datetimeUtc must be a real UTC calendar instant');
  }
}

/**
 * Returns twelve starting house cusps, with cusp 1 at the supplied ascendant,
 * progressing in 30-degree longitude intervals. Not a whole-sign system.
 * Input provenance/frame/zodiac is caller-asserted, never verified here.
 */
export function calculateEqualHouseCusps(input) {
  if (!plainObject(input)) fail('INVALID_EQUAL_HOUSE_INPUT', 'Expected a plain input object');
  requireKnownKeys(input, INPUT_KEYS, 'Input');
  const { ascendantLongitudeDeg, datetimeUtc, frame, longitudeBasis } = input;

  if (typeof ascendantLongitudeDeg !== 'number' || !Number.isFinite(ascendantLongitudeDeg)) {
    fail('INVALID_ANGLE', 'ascendantLongitudeDeg must be a finite number');
  }
  requireUtcInstant(datetimeUtc);
  if (frame !== 'ECLIPTIC_OF_DATE') {
    fail('INVALID_FRAME', 'Explicit ECLIPTIC_OF_DATE longitude frame is required');
  }
  if (!plainObject(longitudeBasis)) {
    fail('INVALID_ZODIAC', 'Explicit longitudeBasis is required');
  }
  requireKnownKeys(longitudeBasis, BASIS_KEYS, 'longitudeBasis');
  if (longitudeBasis.type !== 'TROPICAL' && longitudeBasis.type !== 'SIDEREAL') {
    fail('INVALID_ZODIAC', 'longitudeBasis.type must be TROPICAL or SIDEREAL');
  }
  if (longitudeBasis.type === 'TROPICAL') {
    if (Object.hasOwn(longitudeBasis, 'ayanamsaId')) {
      fail('INVALID_ZODIAC', 'Tropical longitude must not declare an ayanamsa');
    }
  } else if (typeof longitudeBasis.ayanamsaId !== 'string' ||
             !longitudeBasis.ayanamsaId.trim()) {
    fail('INVALID_ZODIAC', 'Sidereal longitude requires a nonblank ayanamsaId');
  }

  const ascendant = normalize360(ascendantLongitudeDeg);
  const basis = Object.freeze(longitudeBasis.type === 'SIDEREAL'
    ? { type: 'SIDEREAL', ayanamsaId: longitudeBasis.ayanamsaId }
    : { type: 'TROPICAL' });
  const cuspsDeg = Object.freeze(Array.from({ length: 12 }, (_, i) =>
    normalize360(ascendant + i * 30)));

  return Object.freeze({
    contract: 'EqualHouseCusps',
    contractVersion: '0.1.0-experimental',
    houseSystem: 'EQUAL_ASCENDANT',
    datetimeUtc,
    frame,
    longitudeBasis: basis,
    ascendantLongitudeDeg: ascendant,
    cuspsDeg,
    provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  });
}
