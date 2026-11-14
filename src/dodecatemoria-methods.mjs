import { AstrologyError, normalize360, zodiacSignIndex, dodecatemoriaLongitude } from './index.mjs';

/**
 * Versioned, pure astrological transformations of an already zodiac-projected longitude.
 * No astronomical conversion or implicit tropical/sidereal preference occurs here.
 *
 * PAULUS_13_V1: longitude * 13 modulo 360 (the existing experimental 13-fold convention).
 * TWELVE_EQUAL_PARTS_V1: sign start + 12 * position within the sign.
 * These are different historical conventions and must never be silently interchanged.
 */
export function calculateDodecatemoriaFacts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Dodecatemoria input must be an object');
  const { longitudeDeg, zodiac, method } = input;
  if (zodiac !== 'TROPICAL' && zodiac !== 'SIDEREAL')
    throw new AstrologyError('INVALID_ZODIAC', 'Explicit TROPICAL or SIDEREAL zodiac is required');
  if (method !== 'PAULUS_13_V1' && method !== 'TWELVE_EQUAL_PARTS_V1')
    throw new AstrologyError('INVALID_DODECATEMORIA_METHOD', 'An explicit supported dodecatemoria method is required');

  const sourceLongitudeDeg = normalize360(longitudeDeg);
  const sourceSignIndex = zodiacSignIndex(sourceLongitudeDeg);
  const sourceDegreesInSign = sourceLongitudeDeg - sourceSignIndex * 30;
  const partIndex = method === 'TWELVE_EQUAL_PARTS_V1'
    ? Math.floor(sourceDegreesInSign / 2.5)
    : null;
  const projectedLongitudeDeg = method === 'PAULUS_13_V1'
    ? dodecatemoriaLongitude(sourceLongitudeDeg)
    : normalize360(sourceSignIndex * 30 + 12 * sourceDegreesInSign);

  return Object.freeze({
    contract: 'DodecatemoriaFacts',
    contractVersion: '1',
    zodiac,
    method,
    sourceLongitudeDeg,
    sourceSignIndex,
    sourceDegreesInSign,
    projectedLongitudeDeg,
    projectedSignIndex: zodiacSignIndex(projectedLongitudeDeg),
    partIndex,
  });
}
