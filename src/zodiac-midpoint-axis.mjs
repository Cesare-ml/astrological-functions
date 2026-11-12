/**
 * Pure zodiac longitude geometry. Does not calculate astronomical positions,
 * choose a zodiac, or infer symbolic / causal interpretations.
 */
import { AstrologyError, normalize360 } from './index.mjs';

/**
 * Return the two antipodal midpoint-axis solutions of supplied longitudes.
 * A unique shortest-arc midpoint exists except at exact opposition (180°),
 * where neither solution is silently privileged.
 *
 * This is order-invariant: exchanging the endpoints does not change the axis.
 * No numerical opposition tolerance is applied or implied.
 *
 * @param {{firstLongitudeDeg: number, secondLongitudeDeg: number}} input
 */
export function calculateZodiacMidpointAxis(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Object.hasOwn(input, 'firstLongitudeDeg') ||
      !Object.hasOwn(input, 'secondLongitudeDeg')) {
    throw new AstrologyError('INVALID_MIDPOINT_INPUT',
      'Explicit firstLongitudeDeg and secondLongitudeDeg are required');
  }

  // Reuse the canonical validation and [0°, 360°) normalization.
  const firstLongitudeDeg = normalize360(input.firstLongitudeDeg);
  const secondLongitudeDeg = normalize360(input.secondLongitudeDeg);
  const forwardArcDeg = normalize360(secondLongitudeDeg - firstLongitudeDeg);
  const forwardMidpointDeg = normalize360(firstLongitudeDeg + forwardArcDeg / 2);
  const otherMidpointDeg = normalize360(forwardMidpointDeg + 180);
  const axisLongitudesDeg = Object.freeze(
    [forwardMidpointDeg, otherMidpointDeg].sort((a, b) => a - b)
  );
  const separationDeg = Math.min(forwardArcDeg, 360 - forwardArcDeg);
  const hasUniqueShortArcMidpoint = forwardArcDeg !== 180;
  const shortArcMidpointDeg = !hasUniqueShortArcMidpoint ? null
    : forwardArcDeg < 180 ? forwardMidpointDeg : otherMidpointDeg;
  const opposingMidpointDeg = shortArcMidpointDeg === null ? null
    : normalize360(shortArcMidpointDeg + 180);

  return Object.freeze({
    contract: 'ZodiacMidpointAxis',
    contractVersion: '0.1.0-experimental',
    inputs: Object.freeze({ firstLongitudeDeg, secondLongitudeDeg }),
    separationDeg,
    axisLongitudesDeg,
    hasUniqueShortArcMidpoint,
    shortArcMidpointDeg,
    opposingMidpointDeg,
    calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY',
    interpretation: 'FACTS_ONLY',
  });
}
