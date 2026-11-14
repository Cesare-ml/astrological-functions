import { AstrologyError } from './index.mjs';
import { calculateDodecatemoriaFacts } from './dodecatemoria-methods.mjs';

/**
 * Apply one explicitly selected symbolic dodecatemoria convention to a bounded,
 * ordered collection of already-projected zodiac longitudes.
 * This is not an ephemeris lookup or natal chart calculation.
 */
export function calculateDodecatemoriaBatchFacts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Dodecatemoria batch input must be an object');

  const { points, zodiac, method } = input;
  if (!Array.isArray(points) || points.length < 1 || points.length > 64 ||
      !Array.from({ length: points.length }, (_, index) =>
        Object.prototype.hasOwnProperty.call(points, index)).every(Boolean))
    throw new AstrologyError('INVALID_POINTS', 'Provide a dense array of 1..64 points');

  // Validate shared options even before processing point payloads, with no duplicate formula.
  calculateDodecatemoriaFacts({ longitudeDeg: 0, zodiac, method });

  const seen = new Set();
  const transformed = points.map((point) => {
    if (!point || typeof point !== 'object' || Array.isArray(point))
      throw new AstrologyError('INVALID_POINT', 'Each point needs a trimmed unique id up to 128 characters');
    // Read each caller-controlled property once. Re-reading an accessor during
    // validation, uniqueness checking or result construction could change ids.
    const id = point.id;
    if (typeof id !== 'string' || !id.trim() ||
        id !== id.trim() || id.length > 128)
      throw new AstrologyError('INVALID_POINT', 'Each point needs a trimmed unique id up to 128 characters');
    if (seen.has(id))
      throw new AstrologyError('DUPLICATE_POINT', 'Point ids must be unique in a batch');
    seen.add(id);

    const longitudeDeg = point.longitudeDeg;
    const facts = calculateDodecatemoriaFacts({ longitudeDeg, zodiac, method });
    // Copy only approved facts, never metadata possibly supplied by a caller.
    return Object.freeze({ id, facts });
  });

  return Object.freeze({
    contract: 'DodecatemoriaBatchFacts',
    contractVersion: '1',
    method,
    zodiac,
    points: Object.freeze(transformed),
  });
}
