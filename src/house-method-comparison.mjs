/**
 * Compare previously computed house placements without computing astronomy or
 * an astrological house system. All inputs are caller assertions, not proof of
 * common observer/kernel/correction provenance.
 */
import { AstrologyError, locateLongitudeInHouses, normalize360 } from './index.mjs';

const METHODS = new Set(['WHOLE_SIGN', 'EQUAL_ASCENDANT', 'PORPHYRY']);
const STATUSES = new Set([
  'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
]);
const fail = (code, message) => { throw new AstrologyError(code, message); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function validUtc(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    fail('INVALID_UTC', 'An explicit UTC instant ending Z is required');
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('INVALID_UTC', 'Invalid calendar instant');
  const canonical = new Date(ms).toISOString().replace(/\.000Z$/, 'Z');
  const normalized = value.replace(/\.(\d{1,3})Z$/, (_, part) =>
    `.${part.padEnd(3, '0')}Z`).replace(/\.000Z$/, 'Z');
  if (canonical !== normalized) fail('INVALID_UTC', 'Invalid calendar instant');
  return value;
}

function basis(value) {
  if (!plain(value)) fail('INVALID_ZODIAC', 'Explicit longitudeBasis required');
  if (Object.keys(value).some(k => k !== 'type' && k !== 'ayanamsaId'))
    fail('INVALID_ZODIAC', 'Unknown zodiac basis fields');
  if (value.type === 'TROPICAL' && !Object.hasOwn(value, 'ayanamsaId'))
    return Object.freeze({ type: 'TROPICAL' });
  if (value.type === 'SIDEREAL' && typeof value.ayanamsaId === 'string' &&
      value.ayanamsaId.length > 0 && value.ayanamsaId.length <= 128 &&
      value.ayanamsaId.trim() === value.ayanamsaId)
    return Object.freeze({ type: 'SIDEREAL', ayanamsaId: value.ayanamsaId });
  fail('INVALID_ZODIAC', 'Explicit TROPICAL or SIDEREAL with named ayanamsa required');
}

function cuspSnapshot(value) {
  if (!plain(value)) fail('INVALID_HOUSE_SNAPSHOT', 'A house snapshot is required');
  // Snapshot every caller-controlled field once. In particular the cusp array
  // must be a trusted detached numeric array before the core house locator
  // checks its geometry; never call caller .map / iterator / species.
  const {houseSystem,provenanceStatus,birthTimeKnown,frame,
    datetimeUtc:rawDatetime,longitudeBasis:rawBasis,cuspsDeg:rawCusps} = value;
  if (!METHODS.has(houseSystem) || !STATUSES.has(provenanceStatus))
    fail('INVALID_HOUSE_SNAPSHOT', 'Supported method and caller-asserted provenance required');
  if (birthTimeKnown === false) fail('BIRTH_TIME_UNKNOWN', 'Houses require known birth time');
  if (frame !== 'ECLIPTIC_OF_DATE')
    fail('INVALID_FRAME', 'Both sets must use ECLIPTIC_OF_DATE');
  const datetimeUtc = validUtc(rawDatetime);
  const longitudeBasis = basis(rawBasis);
  if (!Array.isArray(rawCusps) || rawCusps.length !== 12)
    fail('INVALID_CUSPS', 'Exactly twelve finite cusp longitudes required');
  const cuspValues = [];
  for (let i = 0; i < 12; i++) {
    if (!Object.hasOwn(rawCusps, i))
      fail('INVALID_CUSPS', 'Sparse cusp sets are unsupported');
    const rawLongitude = rawCusps[i];
    if (typeof rawLongitude !== 'number' || !Number.isFinite(rawLongitude))
      fail('INVALID_CUSPS', 'Finite cusp longitudes required');
    cuspValues.push(normalize360(rawLongitude));
  }
  const cuspsDeg = Object.freeze(cuspValues);
  // The real core locator validates forward ordering, including with no points.
  locateLongitudeInHouses(cuspsDeg[0], cuspsDeg);
  return Object.freeze({houseSystem,datetimeUtc,frame,longitudeBasis,cuspsDeg,provenanceStatus});
}

function validatedPoints(points) {
  if (!Array.isArray(points) || points.length > 128)
    fail('INVALID_POINTS', '0..128 explicitly named points are required');
  const ids = new Set();
  const result = [];
  for (let i = 0; i < points.length; i++) {
    if (!Object.hasOwn(points, i))
      fail('INVALID_POINTS', 'Sparse point arrays are unsupported');
    const point = points[i];
    if (!plain(point)) fail('INVALID_POINTS', 'Each point must be a plain object');
    const {id:pointId,longitudeDeg:rawLongitude} = point;
    if (typeof pointId !== 'string' || !pointId.length ||
        pointId.length > 128 || pointId.trim() !== pointId || ids.has(pointId) ||
        typeof rawLongitude !== 'number' || !Number.isFinite(rawLongitude))
      fail('INVALID_POINTS', 'Unique nonblank point IDs and finite longitudes required');
    ids.add(pointId);
    result.push(Object.freeze({id:pointId,longitudeDeg:normalize360(rawLongitude)}));
  }
  return Object.freeze(result);
}

/**
 * This comparison does NOT certify that snapshots came from the same observer,
 * kernel or astrology profile; those checks must be performed by consumers.
 * It never recalculates the cusps, astronomical Ascendant or Midheaven.
 */
export function compareHouseMethodPlacements(input) {
  if (!plain(input) || Object.keys(input).some(k =>
      !['birthTimeKnown', 'left', 'right', 'points'].includes(k))) {
    fail('INVALID_HOUSE_COMPARISON', 'Explicit left/right snapshots and named points required');
  }
  if (input.birthTimeKnown !== true) {
    fail('BIRTH_TIME_UNKNOWN', 'Do not compare house placements without a known birth time');
  }
  const left = cuspSnapshot(input.left);
  const right = cuspSnapshot(input.right);
  if (left.houseSystem === right.houseSystem)
    fail('INVALID_HOUSE_COMPARISON', 'Comparison requires two distinct house systems');
  if (left.datetimeUtc !== right.datetimeUtc ||
      left.longitudeBasis.type !== right.longitudeBasis.type ||
      left.longitudeBasis.ayanamsaId !== right.longitudeBasis.ayanamsaId) {
    fail('INCOMPATIBLE_HOUSE_CONTEXT', 'UTC and zodiac basis must match exactly');
  }
  const points = validatedPoints(input.points);
  const facts = Object.freeze(points.map(point => {
    const leftHouse = locateLongitudeInHouses(point.longitudeDeg, left.cuspsDeg).house;
    const rightHouse = locateLongitudeInHouses(point.longitudeDeg, right.cuspsDeg).house;
    return Object.freeze({ ...point, leftHouse, rightHouse, changed: leftHouse !== rightHouse });
  }));
  const changedCount = facts.reduce((count, fact) => count + Number(fact.changed), 0);
  return Object.freeze({ contract: 'HouseMethodPlacementComparison',
    contractVersion: '0.1.0-experimental',
    status: 'CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED',
    datetimeUtc: left.datetimeUtc, frame: left.frame,
    longitudeBasis: left.longitudeBasis, left, right, facts, changedCount });
}
