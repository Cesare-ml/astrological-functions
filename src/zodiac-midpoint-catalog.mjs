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
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AstrologyError('INVALID_MIDPOINT_CATALOG', 'A dense array of 2..32 named points is required');
  }
  // Exactly one read of caller-controlled points; never invoke its iterator.
  const rawPoints = input.points;
  if (!Array.isArray(rawPoints) || rawPoints.length < 2 || rawPoints.length > 32) {
    throw new AstrologyError('INVALID_MIDPOINT_CATALOG', 'A dense array of 2..32 named points is required');
  }

  const seen = new Set();
  const points = [];
  for (let index = 0; index < rawPoints.length; index++) {
    if (!Object.hasOwn(rawPoints, index)) {
      throw new AstrologyError('INVALID_MIDPOINT_CATALOG', 'Sparse point arrays are not accepted');
    }
    const item = rawPoints[index];
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new AstrologyError('INVALID_MIDPOINT_POINT', 'Each point requires a nonblank, already-trimmed name');
    const {name:rawName,longitudeDeg:rawLongitudeDeg} = item;
    if (typeof rawName !== 'string' || !rawName.trim() || rawName !== rawName.trim())
      throw new AstrologyError('INVALID_MIDPOINT_POINT', 'Each point requires a nonblank, already-trimmed name');
    if (seen.has(rawName))
      throw new AstrologyError('DUPLICATE_MIDPOINT_POINT', 'Point names must be unique within one catalog');
    seen.add(rawName);
    const longitudeDeg = normalize360(rawLongitudeDeg);
    points.push(Object.freeze({name:rawName,longitudeDeg}));
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
