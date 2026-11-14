/**
 * Experimental F3 guard: require caller-asserted planetary longitudes to have
 * a source context identical to BOTH house-method cusp contexts.
 * No positions, cusp geometry, or astronomical provenance are computed here.
 */
import { AstrologyError } from './index.mjs';
import { compareHousePlacementsWithPinnedSource } from './house-source-consistency.mjs';

const fail = (code, message) => { throw new AstrologyError(code, message); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const ROOT_KEYS = new Set(['birthTimeKnown','left','right','positions']);
const POSITIONS_KEYS = new Set(['source','points','provenanceStatus']);
const SOURCE_KEYS = new Set([
  'datetimeUtc','frame','longitudeBasis','observerType','observer',
  'engineVersion','kernelSetId','timeModel','corrections','calculationProfileId',
]);
const BASIS_KEYS = new Set(['type','ayanamsaId']);
const OBSERVER_KEYS = new Set(['latitudeDeg','longitudeDegEast']);
const REQUIRED_SOURCE_KEYS = Object.freeze(Array.from(SOURCE_KEYS));

function exactKeys(value, allowed) {
  return plain(value) && Object.keys(value).every(key => allowed.has(key));
}
function assertedSameSource(pointSource, houseSource) {
  if (!exactKeys(pointSource, SOURCE_KEYS) ||
      REQUIRED_SOURCE_KEYS.some(key => !Object.hasOwn(pointSource, key)) ||
      !exactKeys(pointSource.longitudeBasis, BASIS_KEYS) ||
      !exactKeys(pointSource.observer, OBSERVER_KEYS) ||
      !Object.hasOwn(pointSource.longitudeBasis, 'type') ||
      (pointSource.longitudeBasis.type !== 'TROPICAL' &&
       pointSource.longitudeBasis.type !== 'SIDEREAL') ||
      (pointSource.longitudeBasis.type === 'TROPICAL' &&
       Object.hasOwn(pointSource.longitudeBasis, 'ayanamsaId')) ||
      (pointSource.longitudeBasis.type === 'SIDEREAL' &&
       !Object.hasOwn(pointSource.longitudeBasis, 'ayanamsaId')) ||
      !Object.hasOwn(pointSource.observer, 'latitudeDeg') ||
      !Object.hasOwn(pointSource.observer, 'longitudeDegEast')) {
    fail('INVALID_POINT_SOURCE_CONTEXT', 'An explicit complete point source envelope is required');
  }
  const a = pointSource, b = houseSource;
  if (a.datetimeUtc !== b.datetimeUtc || a.frame !== b.frame ||
      a.longitudeBasis.type !== b.longitudeBasis.type ||
      a.longitudeBasis.ayanamsaId !== b.longitudeBasis.ayanamsaId ||
      a.observerType !== b.observerType ||
      a.observer.latitudeDeg !== b.observer.latitudeDeg ||
      a.observer.longitudeDegEast !== b.observer.longitudeDegEast ||
      a.engineVersion !== b.engineVersion ||
      a.kernelSetId !== b.kernelSetId || a.timeModel !== b.timeModel ||
      a.corrections !== b.corrections ||
      a.calculationProfileId !== b.calculationProfileId) {
    fail('INCOMPATIBLE_POINT_SOURCE_CONTEXT',
      'Planetary point coordinates and house cusps must declare exactly the same source');
  }
  // Return the already validated, deeply frozen house-source snapshot.
  return b;
}

/**
 * Narrow, opt-in SAME-SOURCE policy. Not a universal assumption about the
 * geocentric vs. topocentric reference center in all natal astrology.
 * For mixed-frame/center inputs, reject until a distinct vetted contract exists.
 */
export function compareHousePlacementsWithSourcedPoints(input) {
  if (!exactKeys(input, ROOT_KEYS)) {
    fail('INVALID_SOURCED_HOUSE_POINTS', 'Expected explicit house sides and a point snapshot');
  }
  if (input.birthTimeKnown !== true) {
    fail('BIRTH_TIME_UNKNOWN', 'Sourced house placements require an explicitly known birth time');
  }
  const positions = input.positions;
  if (!exactKeys(positions, POSITIONS_KEYS) ||
      !Object.hasOwn(positions, 'source') ||
      !Object.hasOwn(positions, 'points') ||
      positions.provenanceStatus !== 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED') {
    fail('INVALID_SOURCED_HOUSE_POINTS',
      'Point snapshot must explicitly declare a caller-asserted provenance status');
  }
  // Exactly one source of truth for cusp ordering, placements, point limits,
  // UTC validation and house-side provenance.
  const houseComparison = compareHousePlacementsWithPinnedSource({
    birthTimeKnown: true, left: input.left, right: input.right, points: positions.points,
  });
  const source = assertedSameSource(positions.source, houseComparison.source);
  return Object.freeze({
    contract: 'SourcedHousePointComparison',
    contractVersion: '0.1.0-experimental',
    status: 'MATCHING_CALLER_ASSERTED_HOUSE_AND_POINT_SOURCES_NOT_INDEPENDENTLY_VERIFIED',
    pointProvenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    source,
    pointCount: houseComparison.comparison.facts.length,
    houseComparison,
  });
}
