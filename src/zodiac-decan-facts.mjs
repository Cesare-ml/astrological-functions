import { AstrologyError, normalize360 } from './index.mjs';

/**
 * Classifies an already-projected zodiac longitude into one of 36 half-open
 * ten-degree sectors. It does not calculate astronomical coordinates, ayanamsa
 * offsets, decan rulers, or interpretive meaning.
 */
export function classifyZodiacDecan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AstrologyError('INVALID_ARGUMENT', 'A zodiac decan input object is required');
  }

  const { longitudeDeg, zodiac } = input;
  if (!zodiac || typeof zodiac !== 'object' || Array.isArray(zodiac)) {
    throw new AstrologyError('INVALID_ZODIAC', 'An explicit zodiac coordinate policy is required');
  }
  if (zodiac.type !== 'TROPICAL' && zodiac.type !== 'SIDEREAL') {
    throw new AstrologyError('INVALID_ZODIAC', 'Zodiac type must be TROPICAL or SIDEREAL');
  }
  if (zodiac.type === 'SIDEREAL' &&
      (typeof zodiac.ayanamsaId !== 'string' || !zodiac.ayanamsaId.trim())) {
    throw new AstrologyError('INVALID_ZODIAC', 'Sidereal coordinates require an ayanamsaId');
  }
  if (zodiac.type === 'TROPICAL' && zodiac.ayanamsaId !== undefined) {
    throw new AstrologyError('INVALID_ZODIAC', 'Tropical coordinates must not declare an ayanamsaId');
  }

  // The shared math core validates number type/finiteness and handles 360°.
  const normalizedLongitudeDeg = normalize360(longitudeDeg);
  const globalDecanIndex = Math.floor(normalizedLongitudeDeg / 10);
  const signIndex = Math.floor(globalDecanIndex / 3);
  const decanNumber = (globalDecanIndex % 3) + 1;
  const startDeg = globalDecanIndex * 10;
  const endDeg = (startDeg + 10) % 360;
  const distanceFromStartDeg = normalizedLongitudeDeg - startDeg;
  const coordinatePolicy = Object.freeze(zodiac.type === 'TROPICAL'
    ? { type: 'TROPICAL' }
    : { type: 'SIDEREAL', ayanamsaId: zodiac.ayanamsaId.trim() });

  return Object.freeze({
    contract: 'ZodiacDecanFact',
    contractVersion: '1-experimental',
    zodiac: coordinatePolicy,
    normalizedLongitudeDeg,
    signIndex,
    decanNumber,
    globalDecanIndex,
    startDeg,
    endDeg,
    distanceFromStartDeg,
  });
}
