/**
 * Experimental, geometry-only lunar longitude-phase sectors.
 *
 * Requires caller-supplied Sun/Moon longitudes from the SAME instant and
 * coordinate convention. This is not a physical illumination model or an
 * astronomical phase-event finder, and it is NOT D1/R2/R3/D4 synodic motion.
 */
import { AstrologyError, normalize360, signedAngularDistance } from './index.mjs';

const SECTOR_IDS = Object.freeze([
  'NEW', 'WAXING_CRESCENT', 'FIRST_QUARTER', 'WAXING_GIBBOUS',
  'FULL', 'WANING_GIBBOUS', 'LAST_QUARTER', 'WANING_CRESCENT',
]);

function validatedContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AstrologyError('INVALID_LUNAR_CONTEXT', 'Explicit context is required');
  }
  // Capture untrusted input fields once; accessors must not change the zodiac
  // between validation and the output snapshot.
  const {center, frame, corrections, zodiac, ayanamsaId} = value;
  if (center !== 'EARTH' || frame !== 'ECLIPTIC_OF_DATE' ||
      corrections !== 'APPARENT' || !['TROPICAL', 'SIDEREAL'].includes(zodiac)) {
    throw new AstrologyError('INVALID_LUNAR_CONTEXT',
      'Explicit Earth-centered apparent ecliptic-of-date zodiac context is required');
  }
  if (zodiac === 'SIDEREAL') {
    if (typeof ayanamsaId !== 'string' || !ayanamsaId.trim()) {
      throw new AstrologyError('INVALID_LUNAR_CONTEXT',
        'Sidereal longitude requires an explicit nonempty ayanamsaId');
    }
  } else if (ayanamsaId !== undefined) {
    throw new AstrologyError('INVALID_LUNAR_CONTEXT',
      'Tropical longitude cannot carry a sidereal ayanamsaId');
  }
  return Object.freeze({
    center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE',
    corrections: 'APPARENT',
    zodiac,
    ...(zodiac === 'SIDEREAL' ? {ayanamsaId} : {}),
  });
}

/**
 * Eight adjacent 45° sectors centered on 0,45,...,315 degrees of directed
 * Moon-minus-Sun longitude. Boundary ties go to the next sector in the
 * increasing-angle direction. Names are conventional sector labels only.
 */
export function calculateLunarElongationSectors(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AstrologyError('INVALID_ARGUMENT', 'A lunar elongation input object is required');
  }
  const context = validatedContext(input.context);
  // Reuse canonical angular validation/normalization; do not recompute astronomy.
  const sunLongitudeDeg = normalize360(input.sunLongitudeDeg);
  const moonLongitudeDeg = normalize360(input.moonLongitudeDeg);
  const directedElongationDeg = normalize360(moonLongitudeDeg - sunLongitudeDeg);
  // Compare against half-sector cusps directly. Adding 22.5 before the
  // division can round the representable value immediately below a cusp
  // onto the cusp (e.g. 22.499999999999996 + 22.5 === 45).
  // Boundary ties belong to the next sector in increasing-angle direction.
  const halfSectorBoundaries = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
  let sectorIndex = 0;
  for (let i = 0; i < halfSectorBoundaries.length; i++) {
    if (directedElongationDeg < halfSectorBoundaries[i]) break;
    sectorIndex = (i + 1) % SECTOR_IDS.length;
  }
  const sectorCenterDeg = sectorIndex * 45;
  return Object.freeze({
    contract: 'LunarElongationSectors',
    contractVersion: '0.1.0-experimental',
    method: 'DIRECTED_LONGITUDE_EIGHT_SECTORS',
    context,
    sunLongitudeDeg,
    moonLongitudeDeg,
    directedElongationDeg,
    sectorIndex,
    sectorId: SECTOR_IDS[sectorIndex],
    sectorCenterDeg,
    signedDistanceFromSectorCenterDeg:
      signedAngularDistance(sectorCenterDeg, directedElongationDeg),
  });
}
