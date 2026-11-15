/**
 * Apply one previously defined midpoint-axis contact policy to a bounded,
 * named list of candidate longitudes. No ephemeris or interpretation.
 */
import { AstrologyError, normalize360 } from './index.mjs';
import { calculateZodiacMidpointContacts } from './zodiac-midpoint-contact.mjs';

/**
 * For one pair of source longitudes, screen 1..32 unique named targets.
 * A target is included in matches if its longitude lies within maxOrbDeg
 * (inclusive) of either of the two antipodal midpoint-axis longitudes.
 *
 * @param {{firstLongitudeDeg:number,secondLongitudeDeg:number,
 *   targetPoints:readonly {name:string,longitudeDeg:number}[],maxOrbDeg:number}} input
 */
export function calculateZodiacMidpointTargetSweep(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Object.hasOwn(input,'firstLongitudeDeg') ||
      !Object.hasOwn(input,'secondLongitudeDeg') ||
      !Object.hasOwn(input,'maxOrbDeg')) {
    throw new AstrologyError('INVALID_MIDPOINT_TARGET_SWEEP',
      'Two source longitudes, explicit orb, and 1..32 dense targets are required');
  }
  // Pin caller fields once before looping over target pairs.
  const {firstLongitudeDeg,secondLongitudeDeg,maxOrbDeg,targetPoints:rawTargets} = input;
  if (!Array.isArray(rawTargets) || rawTargets.length < 1 || rawTargets.length > 32) {
    throw new AstrologyError('INVALID_MIDPOINT_TARGET_SWEEP',
      'Two source longitudes, explicit orb, and 1..32 dense targets are required');
  }

  const seen = new Set();
  const targetPoints = [];
  for (let i = 0; i < rawTargets.length; i++) {
    if (!Object.hasOwn(rawTargets, i)) {
      throw new AstrologyError('INVALID_MIDPOINT_TARGET_SWEEP',
        'Sparse target arrays are not allowed');
    }
    const p = rawTargets[i];
    if (!p || typeof p !== 'object' || Array.isArray(p))
      throw new AstrologyError('INVALID_MIDPOINT_TARGET','Each target needs a nonblank already-trimmed name');
    const {name, longitudeDeg:rawLongitudeDeg} = p;
    if (typeof name !== 'string' || !name.trim() || name !== name.trim())
      throw new AstrologyError('INVALID_MIDPOINT_TARGET','Each target needs a nonblank already-trimmed name');
    if (seen.has(name))
      throw new AstrologyError('DUPLICATE_MIDPOINT_TARGET','Target names must be unique and are case-sensitive');
    seen.add(name);
    targetPoints.push(Object.freeze({name,longitudeDeg:normalize360(rawLongitudeDeg)}));
  }
  targetPoints.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  // Delegate orb validation and the geometry to the existing single-target
  // primitive, rather than constructing a competing midpoint rule here.
  let firstFact;
  const targets = Object.freeze(targetPoints.map(({name, longitudeDeg}) => {
    const fact = calculateZodiacMidpointContacts({
      firstLongitudeDeg,
      secondLongitudeDeg,
      targetLongitudeDeg:longitudeDeg,
      maxOrbDeg,
    });
    if (!firstFact) firstFact = fact;
    return Object.freeze({
      name,
      longitudeDeg,
      contacts:fact.contacts,
      matchingAxisLongitudesDeg:fact.matchingAxisLongitudesDeg,
      nearestAxisSeparationDeg:Math.min(...fact.contacts.map(c => c.separationDeg)),
      hasContact:fact.hasContact,
    });
  }));
  const matchedTargetNames = Object.freeze(targets.filter(t => t.hasContact).map(t => t.name));
  return Object.freeze({
    contract:'ZodiacMidpointTargetSweep',
    contractVersion:'0.1.0-experimental',
    midpointAxis:firstFact.midpointAxis,
    maxOrbDeg:firstFact.maxOrbDeg,
    targets,
    matchedTargetNames,
    targetCount:targets.length,
    matchCount:matchedTargetNames.length,
    hasContact:matchedTargetNames.length > 0,
    calculationBasis:'ECLIPTIC_LONGITUDE_GEOMETRY',
    interpretation:'FACTS_ONLY',
  });
}
