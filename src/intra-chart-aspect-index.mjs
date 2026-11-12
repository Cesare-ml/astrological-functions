/**
 * Immutable, astronomy-free adjacency index over canonical intra-chart facts.
 * Designed for selecting one chart point and inspecting its existing aspects;
 * no zodiac calculation, aspect matching, interpretation or UI state lives here.
 */
import { AstrologyError } from './index.mjs';

const MAX_POINTS = 128;
const MAX_FACTS = 65536;

function fail(code, message) {
  throw new AstrologyError(code, message);
}
function id(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128 ||
      !value.trim() || value.trim() !== value)
    fail('INVALID_ASPECT_INDEX', `${field} must be a trimmed nonempty id of at most 128 characters`);
  return value;
}
function finiteRange(value, field, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    fail('INVALID_ASPECT_FACT', `${field} must be finite within ${min}..${max}`);
}
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;

/**
 * Creates bidirectional, read-only point lookup facts without manufacturing
 * A_TO_B/B_TO_A directions or recomputing any geometry.
 */
export function indexIntraChartAspects({ pointIds, facts } = {}) {
  if (!Array.isArray(pointIds) || pointIds.length > MAX_POINTS)
    fail('INVALID_ASPECT_INDEX', `pointIds must be an array of at most ${MAX_POINTS}`);
  if (!Array.isArray(facts) || facts.length > MAX_FACTS)
    fail('INVALID_ASPECT_INDEX', `facts must be an array of at most ${MAX_FACTS}`);

  const graph = new Map();
  for (const pointId of pointIds) {
    id(pointId, 'pointId');
    if (graph.has(pointId)) fail('DUPLICATE_POINT', `Duplicate point id: ${pointId}`);
    graph.set(pointId, []);
  }

  const seenFacts = new Set();
  for (const fact of facts) {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact))
      fail('INVALID_ASPECT_FACT', 'Each aspect fact must be an object');
    const a = id(fact.pointAId, 'pointAId');
    const b = id(fact.pointBId, 'pointBId');
    const aspectId = id(fact.aspectId, 'aspectId');
    if (a === b) fail('INVALID_ASPECT_FACT', 'Self-aspect facts are forbidden');
    if (!graph.has(a) || !graph.has(b))
      fail('UNKNOWN_POINT', 'Every fact endpoint must appear in pointIds');

    finiteRange(fact.exactAngleDeg, 'exactAngleDeg', 0, 180);
    finiteRange(fact.actualAngleDeg, 'actualAngleDeg', 0, 180);
    finiteRange(fact.configuredMaxOrbDeg, 'configuredMaxOrbDeg', 0, 180);
    finiteRange(fact.signedOrbDeg, 'signedOrbDeg', -180, 180);
    finiteRange(fact.absoluteOrbDeg, 'absoluteOrbDeg', 0, 180);
    if (fact.signedOrbDeg !== fact.actualAngleDeg - fact.exactAngleDeg ||
        fact.absoluteOrbDeg !== Math.abs(fact.signedOrbDeg) ||
        fact.absoluteOrbDeg > fact.configuredMaxOrbDeg)
      fail('INVALID_ASPECT_FACT', 'Inconsistent aspect geometry or out-of-orb fact');

    const endpoints = compareId(a, b) < 0 ? [a, b] : [b, a];
    const key = JSON.stringify([endpoints[0], endpoints[1], aspectId]);
    if (seenFacts.has(key)) fail('DUPLICATE_ASPECT_FACT', 'Repeated unordered pair/aspect id');
    seenFacts.add(key);

    const base = {
      aspectId, exactAngleDeg: fact.exactAngleDeg, actualAngleDeg: fact.actualAngleDeg,
      signedOrbDeg: fact.signedOrbDeg, absoluteOrbDeg: fact.absoluteOrbDeg,
      configuredMaxOrbDeg: fact.configuredMaxOrbDeg,
    };
    graph.get(a).push(Object.freeze({ otherPointId: b, ...base }));
    graph.get(b).push(Object.freeze({ otherPointId: a, ...base }));
  }

  const nodes = [...graph.entries()].sort((a, b) => compareId(a[0], b[0])).map(([pointId, connections]) =>
    Object.freeze({
      pointId,
      connections: Object.freeze(connections.sort((a, b) =>
        compareId(a.otherPointId, b.otherPointId) || compareId(a.aspectId, b.aspectId))),
    }));

  return Object.freeze({
    contract: 'IntraChartAspectIndex', contractVersion: '0.1.0-experimental',
    validationStatus: 'CALLER_SUPPLIED_FACTS_NOT_ASTRONOMICALLY_VERIFIED',
    pointCount: graph.size, factCount: facts.length,
    nodes: Object.freeze(nodes),
  });
}
