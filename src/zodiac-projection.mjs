/**
 * Pure zodiac-coordinate projection of a caller-supplied apparent longitude.
 * The provider owns astronomy and calculation of the dated ayanamsa.
 */
import { AstrologyError, normalize360, zodiacSignIndex } from './index.mjs';
import { parseUtcGregorianInstant } from './utc-calendar-contract.mjs';

function fail(code, message) {
  throw new AstrologyError(code, message);
}
function canonicalUtc(value) {
  if (typeof value !== 'string') return false;
  // Keep this API's millisecond precision limit while delegating civil-date
  // validity to the shared proleptic-Gregorian UTC contract. Date.parse()
  // accepts year 0000 and can normalize invalid calendar dates.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  try {
    parseUtcGregorianInstant({
      datetimeUtc: value,
      calendar: 'PROLEPTIC_GREGORIAN',
      timeScale: 'UTC',
    });
    return true;
  } catch {
    return false;
  }
}
function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function identifier(value) {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

/**
 * No hidden ayanamsa, no own precession and no Swiss fallback.
 * Ayanamsa is a caller-asserted, dated, frame-matched angular offset.
 * @param {object} input Explicit projection request.
 */
export function projectZodiacLongitude(input) {
  if (!isPlainRecord(input)) fail('INVALID_ZODIAC_INPUT', 'Explicit zodiac projection input is required');
  const { longitudeDeg, datetimeUtc, frame, corrections, center, zodiac, ayanamsa } = input;
  if (typeof longitudeDeg !== 'number' || !Number.isFinite(longitudeDeg))
    fail('INVALID_ZODIAC_LONGITUDE', 'Finite apparent ecliptic longitude in degrees is required');
  if (!canonicalUtc(datetimeUtc)) fail('INVALID_UTC', 'A valid UTC instant ending Z is required (up to millisecond precision)');
  if (frame !== 'ECLIPTIC_OF_DATE' || corrections !== 'APPARENT' || center !== 'EARTH')
    fail('INCOMPATIBLE_EPHEMERIS', 'Require apparent Earth-centered ecliptic-of-date longitude');
  if (zodiac !== 'TROPICAL' && zodiac !== 'SIDEREAL')
    fail('INVALID_ZODIAC_TYPE', 'Explicit TROPICAL or SIDEREAL zodiac is required');

  const tropicalLongitudeDeg = normalize360(longitudeDeg);
  let offsetDeg = 0;
  let resolvedAyanamsa = null;
  if (zodiac === 'TROPICAL') {
    if (Object.hasOwn(input, 'ayanamsa'))
      fail('UNEXPECTED_AYANAMSA', 'Tropical zodiac must not receive an ayanamsa');
  } else {
    if (!isPlainRecord(ayanamsa) || !identifier(ayanamsa.id) || !identifier(ayanamsa.version))
      fail('INVALID_AYANAMSA', 'Sidereal zodiac requires a named, versioned ayanamsa');
    if (!canonicalUtc(ayanamsa.datetimeUtc) || ayanamsa.datetimeUtc !== datetimeUtc ||
        ayanamsa.frame !== frame)
      fail('INCOMPATIBLE_AYANAMSA', 'Ayanamsa instant and frame must exactly match the longitude');
    if (typeof ayanamsa.offsetDeg !== 'number' || !Number.isFinite(ayanamsa.offsetDeg) ||
        ayanamsa.offsetDeg < 0 || ayanamsa.offsetDeg >= 360)
      fail('INVALID_AYANAMSA', 'Ayanamsa offset must be finite in [0, 360) degrees');
    offsetDeg = ayanamsa.offsetDeg;
    resolvedAyanamsa = Object.freeze({
      id: ayanamsa.id,
      version: ayanamsa.version,
      datetimeUtc,
      frame,
      offsetDeg,
    });
  }
  const zodiacLongitudeDeg = normalize360(tropicalLongitudeDeg - offsetDeg);
  return Object.freeze({
    contract: 'ZodiacProjectionFact',
    contractVersion: '0.1.0-experimental',
    datetimeUtc,
    reference: Object.freeze({ center, frame, corrections }),
    zodiac,
    tropicalLongitudeDeg,
    zodiacLongitudeDeg,
    zodiacSignIndex: zodiacSignIndex(zodiacLongitudeDeg),
    ayanamsa: resolvedAyanamsa,
    validation: 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED',
    interpretation: 'FACTS_ONLY',
  });
}
