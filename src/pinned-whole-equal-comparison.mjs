/**
 * F3 experimental composition with two independently caller-declared sources.
 * Geometry comes from the existing Whole Sign/Equal Ascendant methods; all
 * source validation comes from the existing pinned-source comparator.
 * Neither this module nor identical declarations prove astronomical accuracy.
 */
import { AstrologyError } from './index.mjs';
import { calculateWholeSignHouseCusps } from './whole-sign-house-cusps.mjs';
import { calculateEqualHouseCusps } from './equal-house-cusps.mjs';
import { compareHousePlacementsWithPinnedSource } from './house-source-consistency.mjs';

const INPUT_KEYS = new Set([
  'birthTimeKnown', 'ascendantLongitudeDeg', 'datetimeUtc', 'frame',
  'longitudeBasis', 'points', 'wholeSignSource', 'equalAscendantSource',
]);
function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/**
 * Return immutable factual placements only when the two independent source
 * declarations match each other AND the generated cusp snapshots.
 *
 * Both methods receive the SAME caller-supplied ascendant, UTC, frame and
 * zodiac. The separate sources are not fabricated from that shared input.
 * Future callers must obtain them from an independently validated provider.
 */
export function compareWholeSignEqualWithPinnedSources(input) {
  if (!plain(input) || Object.keys(input).some(key => !INPUT_KEYS.has(key)))
    throw new AstrologyError('INVALID_HOUSE_COMPARISON',
      'Explicit whole-sign/equal-ascendant inputs without extra fields required');
  if (input.birthTimeKnown !== true)
    throw new AstrologyError('BIRTH_TIME_UNKNOWN', 'A known birth time is required');

  const shared = {
    ascendantLongitudeDeg: input.ascendantLongitudeDeg,
    datetimeUtc: input.datetimeUtc,
    frame: input.frame,
    longitudeBasis: input.longitudeBasis,
  };
  const wholeSign = calculateWholeSignHouseCusps({ ...shared, birthTimeKnown: true });
  const equalAscendant = calculateEqualHouseCusps(shared);

  return compareHousePlacementsWithPinnedSource({
    birthTimeKnown: true,
    left: { snapshot: wholeSign, source: input.wholeSignSource },
    right: { snapshot: equalAscendant, source: input.equalAscendantSource },
    points: input.points,
  });
}
