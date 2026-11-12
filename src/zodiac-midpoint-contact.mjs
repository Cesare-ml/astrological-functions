/**
 * Geometry-only contacts of a supplied longitude with both zodiac midpoint
 * axis solutions. No astronomical calculations or interpretation.
 */
import { AstrologyError, normalize360, angularSeparation } from './index.mjs';
import { calculateZodiacMidpointAxis } from './zodiac-midpoint-axis.mjs';

/**
 * A midpoint-axis contact means conjunction to either antipodal axis point,
 * equivalently conjunction/opposition to a chosen midpoint. The orb applies
 * inclusively, without an implicit numerical fudge factor.
 *
 * @param {{firstLongitudeDeg:number,secondLongitudeDeg:number,
 *   targetLongitudeDeg:number,maxOrbDeg:number}} input
 */
export function calculateZodiacMidpointContacts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !['firstLongitudeDeg', 'secondLongitudeDeg', 'targetLongitudeDeg', 'maxOrbDeg']
        .every(key => Object.hasOwn(input, key))) {
    throw new AstrologyError('INVALID_MIDPOINT_CONTACT_INPUT',
      'Two endpoints, target longitude and explicit maximum orb are required');
  }
  const { maxOrbDeg } = input;
  if (typeof maxOrbDeg !== 'number' || !Number.isFinite(maxOrbDeg) ||
      maxOrbDeg < 0 || maxOrbDeg > 90) {
    throw new AstrologyError('INVALID_MIDPOINT_CONTACT_ORB',
      'Explicit finite maximum axis-contact orb in [0, 90] degrees is required');
  }
  const targetLongitudeDeg = normalize360(input.targetLongitudeDeg);
  const midpointAxis = calculateZodiacMidpointAxis(input);
  const contacts = Object.freeze(midpointAxis.axisLongitudesDeg.map(longitudeDeg => {
    const separationDeg = angularSeparation(longitudeDeg, targetLongitudeDeg);
    return Object.freeze({ longitudeDeg, separationDeg, withinOrb: separationDeg <= maxOrbDeg });
  }));
  const matchingAxisLongitudesDeg = Object.freeze(contacts
    .filter(contact => contact.withinOrb).map(contact => contact.longitudeDeg));
  return Object.freeze({
    contract: 'ZodiacMidpointContacts',
    contractVersion: '0.1.0-experimental',
    midpointAxis,
    targetLongitudeDeg,
    maxOrbDeg,
    contacts,
    matchingAxisLongitudesDeg,
    hasContact: matchingAxisLongitudesDeg.length > 0,
    calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY',
    interpretation: 'FACTS_ONLY',
  });
}
