/**
 * Deterministic pairwise midpoint axes for supplied named zodiac longitudes.
 * This module reuses existing midpoint geometry and performs no astronomy.
 */
import { AstrologyError, normalize360 } from './index.mjs';
import { calculateZodiacMidpointAxis } from './zodiac-midpoint-axis.mjs';

/**
 * Build all unordered distinct-name pairs of 2..32 caller-supplied points.
 * The result is sorted by exact (case-sensitive) name code-unit order, not
 * input order or environment-dependent locale collation.
 *
 * @param {{points: ReadonlyArray<{name: string, longitudeDeg: number}>}} input
 */
export function calculateZodiacMidpointCatalog(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Array.isArray(input.points) || input.points.length < 2 || input.points.length > 32) {
    throw new AstrologyError('INVALID_MIDPOINT_CATALOG',
      'A dense array of 2..32 named points is required');
  }

  const seen = new Set();
  const points = [];
  for (let index = 0; index < input.points.length; index++) {
    if (!Object.hasOwn(input.points, index)) {
      throw new AstrologyError('INVALID_MIDPOINT_CATALOG', 'Sparse point arrays are not accepted');
    }
    const item = input.points[index];
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name !== item.name.trim()) {
      throw new AstrologyError('INVALID_MIDPOINT_POINT',
        'Each point requires a nonblank, already-trimmed name');
    }
    if (seen.has(item.name)) {
      throw new AstrologyError('DUPLICATE_MIDPOINT_POINT',
        'Point names must be unique within one catalog');
    }
    seen.add(item.name);
    const longitudeDeg = normalize360(item.longitudeDeg);
    points.push(Object.freeze({ name: item.name, longitudeDeg }));
  }
  points.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  const pairs = [];
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const first = points[i], second = points[j];
      pairs.push(Object.freeze({
        firstName: first.name,
        secondName: second.name,
        midpointAxis: calculateZodiacMidpointAxis({
          firstLongitudeDeg: first.longitudeDeg,
          secondLongitudeDeg: second.longitudeDeg,
        }),
      }));
    }
  }
  return Object.freeze({
    contract: 'ZodiacMidpointCatalog',
    contractVersion: '0.1.0-experimental',
    points: Object.freeze(points),
    pairs: Object.freeze(pairs),
    pairCount: pairs.length,
    calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY',
    interpretation: 'FACTS_ONLY',
  });
}
