/**
 * Synthetic, directionless aspect facts between unique points in one chart.
 * Astronomical positions and aspect definitions must be supplied by the caller.
 * This module does not compute ephemerides or infer interpretive meaning.
 */
import { AstrologyError, angularSeparation, normalize360 } from './index.mjs';

const MAX_POINTS = 128;
const MAX_DEFINITIONS = 64;

function identifier(value, field, errorCode) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128 ||
      value.trim() !== value || !value.trim()) {
    throw new AstrologyError(errorCode, `${field} must be a nonblank, unpadded string of at most 128 characters`);
  }
  return value;
}

function finite(value, field, errorCode) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AstrologyError(errorCode, `${field} must be a finite number`);
  }
  return value;
}

function validatePoints(points) {
  if (!Array.isArray(points) || points.length > MAX_POINTS)
    throw new AstrologyError('INVALID_POINTS', `points must be an array with at most ${MAX_POINTS} entries`);
  const ids = new Set(), result = [];
  // Only dense own indexed slots; never consult caller Array iterators, map or species.
  for (let i = 0; i < points.length; i++) {
    if (!Object.hasOwn(points, i))
      throw new AstrologyError('INVALID_POINT', 'Sparse point arrays are unsupported');
    const point = points[i];
    if (!point || typeof point !== 'object' || Array.isArray(point))
      throw new AstrologyError('INVALID_POINT', 'Each point must be an object');
    const { id: rawId, longitudeDeg: rawLongitudeDeg } = point;
    const id = identifier(rawId, 'point.id', 'INVALID_POINT');
    if (ids.has(id)) throw new AstrologyError('DUPLICATE_POINT', 'Duplicate point id');
    ids.add(id);
    const longitudeDeg = finite(rawLongitudeDeg, 'point.longitudeDeg', 'INVALID_POINT');
    result.push(Object.freeze({ id, longitudeDeg: normalize360(longitudeDeg) }));
  }
  return result;
}

function validateDefinitions(aspectDefinitions) {
  if (!Array.isArray(aspectDefinitions) || aspectDefinitions.length > MAX_DEFINITIONS)
    throw new AstrologyError('INVALID_ASPECTS', `aspectDefinitions must be an array with at most ${MAX_DEFINITIONS} entries`);
  const ids = new Set(), result = [];
  for (let i = 0; i < aspectDefinitions.length; i++) {
    if (!Object.hasOwn(aspectDefinitions, i))
      throw new AstrologyError('INVALID_ASPECT', 'Sparse aspect definition arrays are unsupported');
    const definition = aspectDefinitions[i];
    if (!definition || typeof definition !== 'object' || Array.isArray(definition))
      throw new AstrologyError('INVALID_ASPECT', 'Each aspect definition must be an object');
    const { id: rawId, angleDeg: rawAngleDeg, maxOrbDeg: rawMaxOrbDeg } = definition;
    const id = identifier(rawId, 'aspect.id', 'INVALID_ASPECT');
    if (ids.has(id)) throw new AstrologyError('DUPLICATE_ASPECT', 'Duplicate aspect id');
    ids.add(id);
    const angleDeg = finite(rawAngleDeg, 'aspect.angleDeg', 'INVALID_ASPECT');
    const maxOrbDeg = finite(rawMaxOrbDeg, 'aspect.maxOrbDeg', 'INVALID_ASPECT');
    if (angleDeg < 0 || angleDeg > 180 || maxOrbDeg < 0 || maxOrbDeg > 180)
      throw new AstrologyError('INVALID_ASPECT', 'angleDeg and maxOrbDeg must be in [0, 180]');
    result.push(Object.freeze({ id, angleDeg, maxOrbDeg }));
  }
  return result;
}

/**
 * Returns frozen undirected pair facts in input-point order (i < j), then in
 * aspect-definition order. Overlapping definitions intentionally yield multiple
 * facts. No aspect definitions or orbs are assumed.
 *
 * signedOrbDeg = actualAngleDeg - exactAngleDeg, not approaching/separating.
 */
export function calculateIntraChartAspects({ points, aspectDefinitions } = {}) {
  const chartPoints = validatePoints(points);
  const definitions = validateDefinitions(aspectDefinitions);
  const facts = [];
  for (let i = 0; i < chartPoints.length; i++) {
    for (let j = i + 1; j < chartPoints.length; j++) {
      const actualAngleDeg = angularSeparation(
        chartPoints[i].longitudeDeg, chartPoints[j].longitudeDeg);
      for (const definition of definitions) {
        const signedOrbDeg = actualAngleDeg - definition.angleDeg;
        const absoluteOrbDeg = Math.abs(signedOrbDeg);
        if (absoluteOrbDeg <= definition.maxOrbDeg) {
          facts.push(Object.freeze({
            pointAId: chartPoints[i].id,
            pointBId: chartPoints[j].id,
            aspectId: definition.id,
            exactAngleDeg: definition.angleDeg,
            actualAngleDeg,
            signedOrbDeg,
            absoluteOrbDeg,
            configuredMaxOrbDeg: definition.maxOrbDeg,
          }));
        }
      }
    }
  }
  return Object.freeze(facts);
}
