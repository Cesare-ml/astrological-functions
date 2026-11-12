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
  if (!Array.isArray(points) || points.length > MAX_POINTS) {
    throw new AstrologyError('INVALID_POINTS', `points must be an array with at most ${MAX_POINTS} entries`);
  }
  const ids = new Set();
  return Array.from(points, (point) => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) {
      throw new AstrologyError('INVALID_POINT', 'Each point must be an object');
    }
    const id = identifier(point.id, 'point.id', 'INVALID_POINT');
    if (ids.has(id)) {
      throw new AstrologyError('DUPLICATE_POINT', `Duplicate point id: ${id}`);
    }
    ids.add(id);
    finite(point.longitudeDeg, 'point.longitudeDeg', 'INVALID_POINT');
    return Object.freeze({ id, longitudeDeg: normalize360(point.longitudeDeg) });
  });
}

function validateDefinitions(aspectDefinitions) {
  if (!Array.isArray(aspectDefinitions) || aspectDefinitions.length > MAX_DEFINITIONS) {
    throw new AstrologyError('INVALID_ASPECTS',
      `aspectDefinitions must be an array with at most ${MAX_DEFINITIONS} entries`);
  }
  const ids = new Set();
  return Array.from(aspectDefinitions, (definition) => {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new AstrologyError('INVALID_ASPECT', 'Each aspect definition must be an object');
    }
    const id = identifier(definition.id, 'aspect.id', 'INVALID_ASPECT');
    if (ids.has(id)) {
      throw new AstrologyError('DUPLICATE_ASPECT', `Duplicate aspect id: ${id}`);
    }
    ids.add(id);
    const angleDeg = finite(definition.angleDeg, 'aspect.angleDeg', 'INVALID_ASPECT');
    const maxOrbDeg = finite(definition.maxOrbDeg, 'aspect.maxOrbDeg', 'INVALID_ASPECT');
    if (angleDeg < 0 || angleDeg > 180 || maxOrbDeg < 0 || maxOrbDeg > 180) {
      throw new AstrologyError('INVALID_ASPECT', 'angleDeg and maxOrbDeg must be in [0, 180]');
    }
    return Object.freeze({ id, angleDeg, maxOrbDeg });
  });
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
