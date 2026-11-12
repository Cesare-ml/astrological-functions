import { AstrologyError, normalize360 } from './index.mjs';

const REQUIRED_CONTEXT = Object.freeze({
  zodiac: 'TROPICAL',
  center: 'EARTH',
  frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT',
});

/**
 * Pure tropical solstitial symmetry, not an ephemeris calculation.
 * The supplied coordinate context is caller-asserted, not independently verified.
 */
export function calculateSolstitialMirrors(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AstrologyError('INVALID_ARGUMENT', 'An explicit longitude and coordinate context are required');
  }
  const { longitudeDeg, context } = input;
  if (!context || typeof context !== 'object' || Array.isArray(context) ||
      Object.keys(context).length !== Object.keys(REQUIRED_CONTEXT).length ||
      Object.entries(REQUIRED_CONTEXT).some(([key, value]) =>
        !Object.hasOwn(context, key) || context[key] !== value)) {
    throw new AstrologyError('INVALID_COORDINATE_CONTEXT',
      'Antiscia require explicitly asserted tropical, Earth-centered, apparent ecliptic-of-date longitude');
  }
  const longitude = normalize360(longitudeDeg);
  const antiscia = normalize360(180 - longitude);
  const contraAntiscia = normalize360(antiscia + 180);
  return Object.freeze({
    contract: 'SolstitialMirrorFacts',
    contractVersion: '0.1.0-experimental',
    longitudeDeg: longitude,
    antisciaLongitudeDeg: antiscia,
    contraAntisciaLongitudeDeg: contraAntiscia,
    coordinateContext: Object.freeze({ ...REQUIRED_CONTEXT }),
    coordinateContextStatus: 'CALLER_ASSERTED_NOT_VERIFIED',
  });
}
