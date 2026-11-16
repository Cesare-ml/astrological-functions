/**
 * Immutable, astronomy-free adjacency index over canonical intra-chart facts.
 * Designed for selecting one chart point and inspecting its existing aspects;
 * no zodiac calculation, aspect matching, interpretation or UI state lives here.
 */
import { AstrologyError } from './index.mjs';

const MAX_POINTS = 128;
const MAX_FACTS = 65536;
const FACT_FIELDS = Object.freeze([
  'pointAId', 'pointBId', 'aspectId', 'exactAngleDeg', 'actualAngleDeg',
  'configuredMaxOrbDeg', 'signedOrbDeg', 'absoluteOrbDeg',
]);

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
 * Read an own data slot without invoking a caller-supplied getter.
 * This also rejects holes and accessor-backed array indexes.
 */
function readOwnDataSlot(array, index, code, label) {
  const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
  if (!descriptor || !Object.hasOwn(descriptor, 'value'))
    fail(code, `${label} must contain own data slots`);
  return descriptor.value;
}

/**
 * Detach every consumed fact value through property descriptors. Destructuring
 * is deliberately avoided because it would execute getters on untrusted facts.
 */
function snapshotFact(fact) {
  if (!fact || typeof fact !== 'object' || Array.isArray(fact))
    fail('INVALID_ASPECT_FACT', 'Each aspect fact must be an object');

  const snapshot = {};
  for (const field of FACT_FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(fact, field);
    if (!descriptor || !Object.hasOwn(descriptor, 'value'))
      fail('INVALID_ASPECT_FACT', `Each aspect fact requires own data property ${field}`);
    snapshot[field] = descriptor.value;
  }
  return snapshot;
}

/**
 * Creates bidirectional, read-only point lookup facts without manufacturing
 * A_TO_B/B_TO_A directions or recomputing any geometry.
 */
export function indexIntraChartAspects({ pointIds, facts } = {}) {
  // Capture the caller's bounded lengths once, before reading any fact fields.
  // All indexed reads below are descriptor-based and never invoke accessors.
  const pointCount = Array.isArray(pointIds) ? pointIds.length : -1;
  const factCount = Array.isArray(facts) ? facts.length : -1;
  if (pointCount < 0 || pointCount > MAX_POINTS)
    fail('INVALID_ASPECT_INDEX', `pointIds must be an array of at most ${MAX_POINTS}`);
  if (factCount < 0 || factCount > MAX_FACTS)
    fail('INVALID_ASPECT_INDEX', `facts must be an array of at most ${MAX_FACTS}`);

  const graph = new Map();
  for (let i = 0; i < pointCount; i++) {
    const pointId = id(readOwnDataSlot(pointIds, i, 'INVALID_ASPECT_INDEX', 'pointIds'), 'pointId');
    if (graph.has(pointId)) fail('DUPLICATE_POINT', `Duplicate point id: ${pointId}`);
    graph.set(pointId, []);
  }
  if (facts.length !== factCount)
    fail('INVALID_ASPECT_INDEX', 'facts array length changed during point validation');

  const seenFacts = new Set();
  let indexedFactCount = 0;
  for (let i = 0; i < factCount; i++) {
    const fact = snapshotFact(readOwnDataSlot(facts, i, 'INVALID_ASPECT_FACT', 'facts'));
    const {pointAId,pointBId,aspectId,exactAngleDeg,actualAngleDeg,
      configuredMaxOrbDeg,signedOrbDeg,absoluteOrbDeg} = fact;
    const a = id(pointAId, 'pointAId');
    const b = id(pointBId, 'pointBId');
    const aspect = id(aspectId, 'aspectId');
    if (a === b) fail('INVALID_ASPECT_FACT', 'Self-aspect facts are forbidden');
    if (!graph.has(a) || !graph.has(b))
      fail('UNKNOWN_POINT', 'Every fact endpoint must appear in pointIds');

    finiteRange(exactAngleDeg, 'exactAngleDeg', 0, 180);
    finiteRange(actualAngleDeg, 'actualAngleDeg', 0, 180);
    finiteRange(configuredMaxOrbDeg, 'configuredMaxOrbDeg', 0, 180);
    finiteRange(signedOrbDeg, 'signedOrbDeg', -180, 180);
    finiteRange(absoluteOrbDeg, 'absoluteOrbDeg', 0, 180);
    if (signedOrbDeg !== actualAngleDeg - exactAngleDeg ||
        absoluteOrbDeg !== Math.abs(signedOrbDeg) ||
        absoluteOrbDeg > configuredMaxOrbDeg)
      fail('INVALID_ASPECT_FACT', 'Inconsistent aspect geometry or out-of-orb fact');

    const endpoints = compareId(a, b) < 0 ? [a, b] : [b, a];
    const key = JSON.stringify([endpoints[0], endpoints[1], aspect]);
    if (seenFacts.has(key)) fail('DUPLICATE_ASPECT_FACT', 'Repeated unordered pair/aspect id');
    seenFacts.add(key);

    const base = {aspectId:aspect,exactAngleDeg,actualAngleDeg,signedOrbDeg,
      absoluteOrbDeg,configuredMaxOrbDeg};
    graph.get(a).push(Object.freeze({otherPointId:b,...base}));
    graph.get(b).push(Object.freeze({otherPointId:a,...base}));
    indexedFactCount++;
  }
  if (facts.length !== factCount)
    fail('INVALID_ASPECT_INDEX', 'facts array length changed during indexing');

  const nodes = [...graph.entries()].sort((a, b) => compareId(a[0], b[0])).map(([pointId, connections]) =>
    Object.freeze({pointId,connections: Object.freeze(connections.sort((a, b) =>
      compareId(a.otherPointId, b.otherPointId) || compareId(a.aspectId, b.aspectId)))}));
  return Object.freeze({
    contract:'IntraChartAspectIndex',contractVersion:'0.1.0-experimental',
    validationStatus:'CALLER_SUPPLIED_FACTS_NOT_ASTRONOMICALLY_VERIFIED',
    pointCount:graph.size,factCount:indexedFactCount,nodes:Object.freeze(nodes),
  });
}


