/**
 * Experimental F3 integration: compose existing independent house methods.
 * No ephemeris, observer, Ascendant or ayanamsa is computed here.
 */
import { AstrologyError } from './index.mjs';
import { calculateWholeSignHouseCusps } from './whole-sign-house-cusps.mjs';
import { calculateEqualHouseCusps } from './equal-house-cusps.mjs';
import { compareHouseMethodPlacements } from './house-method-comparison.mjs';

const INPUT_KEYS = new Set([
  'ascendantLongitudeDeg', 'birthTimeKnown', 'datetimeUtc', 'frame', 'longitudeBasis', 'points',
]);
function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/**
 * Caller supplies an Ascendant already computed in the SAME explicit zodiac
 * as points. Both methods receive exactly the same frame/time/longitude.
 * The comparison remains CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED.
 */
export function compareWholeSignAndEqualFromAscendant(input) {
  if (!plain(input) || Object.keys(input).some(key => !INPUT_KEYS.has(key)))
    throw new AstrologyError('INVALID_HOUSE_COMPARISON', 'Expected explicit comparison inputs without extra fields');
  if (input.birthTimeKnown !== true)
    throw new AstrologyError('BIRTH_TIME_UNKNOWN', 'Known birth time is required for house placement');

  const shared = {
    ascendantLongitudeDeg: input.ascendantLongitudeDeg,
    datetimeUtc: input.datetimeUtc,
    frame: input.frame,
    longitudeBasis: input.longitudeBasis,
  };
  const wholeSign = calculateWholeSignHouseCusps({ ...shared, birthTimeKnown: true });
  const equalAscendant = calculateEqualHouseCusps(shared);

  return compareHouseMethodPlacements({
    birthTimeKnown: true,
    left: wholeSign,
    right: equalAscendant,
    points: input.points,
  });
}
