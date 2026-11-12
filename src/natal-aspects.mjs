/**
 * Experimental, astronomy-free aspects within one chart.
 * Positions must already share a caller-established zodiac, epoch and frame;
 * this function cannot independently verify their physical provenance.
 */
import { AstrologyError, angularSeparation, normalize360 } from './index.mjs';

function fail(code, message) {
  throw new AstrologyError(code, message);
}

function normalizePoints(points) {
  if (!Array.isArray(points) || points.length < 1 || points.length > 32)
    fail('INVALID_POINTS', 'Explicit array of 1..32 chart points required');

  const names = new Set();
  const result = [];
  for (const point of points) {
    if (!point || typeof point !== 'object' || Array.isArray(point) ||
        typeof point.name !== 'string' || !point.name.trim() ||
        point.name !== point.name.trim())
      fail('INVALID_POINT', 'Each point requires a nonempty, trimmed name');
    if (names.has(point.name))
      fail('DUPLICATE_POINT', `Duplicate chart point: ${point.name}`);
    if (typeof point.longitudeDeg !== 'number' || !Number.isFinite(point.longitudeDeg))
      fail('INVALID_POINT', `Nonfinite longitude for ${point.name}`);
    names.add(point.name);
    result.push(Object.freeze({ name: point.name, longitudeDeg: normalize360(point.longitudeDeg) }));
  }
  return result.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

function normalizeDefinitions(definitions) {
  if (!Array.isArray(definitions) || definitions.length > 32)
    fail('INVALID_ASPECTS', 'Explicit array of at most 32 aspect definitions required');
  const ids = new Set();
  const result = [];
  for (const aspect of definitions) {
    if (!aspect || typeof aspect !== 'object' || Array.isArray(aspect) ||
        typeof aspect.id !== 'string' || !aspect.id.trim() ||
        aspect.id !== aspect.id.trim())
      fail('INVALID_ASPECT', 'Each aspect requires a nonempty, trimmed id');
    if (ids.has(aspect.id))
      fail('DUPLICATE_ASPECT', `Duplicate aspect id: ${aspect.id}`);
    if (typeof aspect.angleDeg !== 'number' || !Number.isFinite(aspect.angleDeg) ||
        aspect.angleDeg < 0 || aspect.angleDeg > 180 ||
        typeof aspect.maxOrbDeg !== 'number' || !Number.isFinite(aspect.maxOrbDeg) ||
        aspect.maxOrbDeg < 0 || aspect.maxOrbDeg > 180)
      fail('INVALID_ASPECT', 'Aspect angle and orb must be finite, angle 0..180, orb 0..180');
    ids.add(aspect.id);
    result.push(Object.freeze({ id: aspect.id, angleDeg: aspect.angleDeg, maxOrbDeg: aspect.maxOrbDeg }));
  }
  return result.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * A unique unordered pair i<j is evaluated once, without self-pairs.
 * An aspect exactly on its configured orb boundary is included.
 * Multiple named aspect definitions may match the same pair; never select
 * one implicitly or infer applying/separating without velocities.
 */
export function calculateNatalAspects({ points, aspectDefinitions } = {}) {
  const chartPoints = normalizePoints(points);
  const definitions = normalizeDefinitions(aspectDefinitions);
  const aspects = [];
  for (let i = 0; i < chartPoints.length; i++) {
    for (let j = i + 1; j < chartPoints.length; j++) {
      const pointA = chartPoints[i];
      const pointB = chartPoints[j];
      const actualAngleDeg = angularSeparation(pointA.longitudeDeg, pointB.longitudeDeg);
      for (const definition of definitions) {
        const signedOrbDeg = actualAngleDeg - definition.angleDeg;
        if (Math.abs(signedOrbDeg) <= definition.maxOrbDeg) {
          aspects.push(Object.freeze({
            pointA, pointB, aspectId: definition.id,
            exactAngleDeg: definition.angleDeg, actualAngleDeg,
            signedOrbDeg, absoluteOrbDeg: Math.abs(signedOrbDeg),
            configuredMaxOrbDeg: definition.maxOrbDeg,
          }));
        }
      }
    }
  }
  return Object.freeze({
    contract: 'NatalAspectFacts', contractVersion: '0.1.0-experimental',
    validationStatus: 'SOURCE_POSITIONS_NOT_INDEPENDENTLY_VERIFIED',
    pairsConsidered: chartPoints.length * (chartPoints.length - 1) / 2,
    aspects: Object.freeze(aspects),
  });
}
