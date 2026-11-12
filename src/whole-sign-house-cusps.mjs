/**
 * Experimental F3 whole-sign zodiac house geometry. The caller provides an
 * already-calculated ascendant in a declared zodiac, not astronomical data.
 */
import { AstrologyError, normalize360 } from './index.mjs';

const INPUT_KEYS = new Set(['ascendantLongitudeDeg', 'birthTimeKnown', 'datetimeUtc', 'frame', 'longitudeBasis']);
const BASIS_KEYS = new Set(['type', 'ayanamsaId']);
function fail(code, message) { throw new AstrologyError(code, message); }
function plainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function knownKeys(v, allowed, label) {
  if (Object.keys(v).some(k => !allowed.has(k)))
    fail('INVALID_WHOLE_SIGN_INPUT', `${label} contains unrecognized fields`);
}
function validUtc(value) {
  if (typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
    fail('INVALID_UTC', 'datetimeUtc must be a UTC ISO instant with at most 3 fractional digits');
  const d = new Date(value);
  if (!Number.isFinite(d.getTime()))
    fail('INVALID_UTC', 'datetimeUtc must be a valid calendar instant');
  const canonical = d.toISOString();
  const supplied = value.replace(/\.(\d{1,3})Z$/, (_, digits) => `.${digits.padEnd(3, '0')}Z`)
    .replace(/\.000Z$/, 'Z');
  if (canonical.replace(/\.000Z$/, 'Z') !== supplied)
    fail('INVALID_UTC', 'datetimeUtc must be a real UTC calendar instant');
}

/**
 * Houses begin at 0°,30°... of the ascendant's own zodiac sign and proceed
 * by sign. This is not EQUAL_ASCENDANT (cusp 1 equals ascendant), nor Vehlow.
 */
export function calculateWholeSignHouseCusps(input) {
  if (!plainObject(input)) fail('INVALID_WHOLE_SIGN_INPUT', 'Expected a plain input object');
  knownKeys(input, INPUT_KEYS, 'Input');
  const { ascendantLongitudeDeg, birthTimeKnown, datetimeUtc, frame, longitudeBasis } = input;
  if (birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'Whole-sign houses require an explicitly known birth time');
  if (typeof ascendantLongitudeDeg !== 'number' || !Number.isFinite(ascendantLongitudeDeg))
    fail('INVALID_ANGLE', 'ascendantLongitudeDeg must be a finite number');
  validUtc(datetimeUtc);
  if (frame !== 'ECLIPTIC_OF_DATE')
    fail('INVALID_FRAME', 'Explicit ECLIPTIC_OF_DATE frame required');
  if (!plainObject(longitudeBasis)) fail('INVALID_ZODIAC', 'Explicit longitudeBasis required');
  knownKeys(longitudeBasis, BASIS_KEYS, 'longitudeBasis');
  if (longitudeBasis.type === 'TROPICAL') {
    if (Object.hasOwn(longitudeBasis, 'ayanamsaId'))
      fail('INVALID_ZODIAC', 'Tropical basis may not have ayanamsaId');
  } else if (longitudeBasis.type === 'SIDEREAL') {
    if (typeof longitudeBasis.ayanamsaId !== 'string' || !longitudeBasis.ayanamsaId.trim())
      fail('INVALID_ZODIAC', 'Sidereal basis requires a nonblank ayanamsaId');
  } else fail('INVALID_ZODIAC', 'Zodiac must be TROPICAL or SIDEREAL');

  const ascendant = normalize360(ascendantLongitudeDeg);
  const ascendantSignIndex = Math.floor(ascendant / 30);
  const firstCusp = ascendantSignIndex * 30;
  const basis = Object.freeze(longitudeBasis.type === 'TROPICAL'
    ? { type: 'TROPICAL' }
    : { type: 'SIDEREAL', ayanamsaId: longitudeBasis.ayanamsaId });
  const cuspsDeg = Object.freeze(Array.from({ length: 12 }, (_, i) => normalize360(firstCusp + i * 30)));
  return Object.freeze({
    contract: 'WholeSignHouseCusps', contractVersion: '0.1.0-experimental',
    houseSystem: 'WHOLE_SIGN', datetimeUtc, birthTimeKnown: true,
    frame, longitudeBasis: basis, ascendantLongitudeDeg: ascendant,
    ascendantSignIndex, cuspsDeg,
    provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  });
}
