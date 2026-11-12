/**
 * Compares two independently supplied, versioned symbolic house cusp results.
 * No astronomical position, ascendant or ephemeris calculation occurs here.
 */
import { AstrologyError, normalize360, angularSeparation, locateLongitudeInHouses } from './index.mjs';

const VERSION = '0.1.0-experimental';
const STATUS = 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
const ROOT_KEYS = new Set(['birthTimeKnown', 'wholeSign', 'equalAscendant', 'points']);

function fail(code, message) { throw new AstrologyError(code, message); }
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function utc(value) {
  if (typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
    fail('INVALID_UTC', 'House instants must be explicit UTC timestamps with <=3 fractional digits');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) fail('INVALID_UTC', 'Invalid calendar instant');
  const canonical = date.toISOString().replace(/\.000Z$/, 'Z');
  const supplied = value.replace(/\.(\d{1,3})Z$/, (_, d) => '.' + d.padEnd(3, '0') + 'Z')
    .replace(/\.000Z$/, 'Z');
  if (canonical !== supplied) fail('INVALID_UTC', 'Invalid calendar instant');
}
function basis(value) {
  if (!record(value)) fail('INVALID_ZODIAC', 'Missing longitudeBasis');
  const keys = Object.keys(value);
  if (keys.some(k => k !== 'type' && k !== 'ayanamsaId'))
    fail('INVALID_ZODIAC', 'Unknown zodiac parameter');
  if (value.type === 'TROPICAL' && !Object.hasOwn(value, 'ayanamsaId'))
    return Object.freeze({ type: 'TROPICAL' });
  if (value.type === 'SIDEREAL' && typeof value.ayanamsaId === 'string' &&
      value.ayanamsaId.length > 0 && value.ayanamsaId.length <= 128 &&
      value.ayanamsaId.trim() === value.ayanamsaId)
    return Object.freeze({ type: 'SIDEREAL', ayanamsaId: value.ayanamsaId });
  fail('INVALID_ZODIAC', 'Invalid tropical/sidereal basis');
}
function snapshot(value, system, contract) {
  if (!record(value) || value.contract !== contract || value.contractVersion !== VERSION ||
      value.houseSystem !== system || value.provenanceStatus !== STATUS)
    fail('INVALID_HOUSE_SNAPSHOT', 'Expected experimental ' + system + ' cusp result');
  if (system === 'WHOLE_SIGN' && value.birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'Whole Sign must record a known birth time');
  utc(value.datetimeUtc);
  if (value.frame !== 'ECLIPTIC_OF_DATE')
    fail('INVALID_FRAME', 'House cusps must use ECLIPTIC_OF_DATE');
  if (typeof value.ascendantLongitudeDeg !== 'number' || !Number.isFinite(value.ascendantLongitudeDeg))
    fail('INVALID_ASCENDANT', 'Missing finite ascendant');
  const longitudeBasis = basis(value.longitudeBasis);
  if (!Array.isArray(value.cuspsDeg) || value.cuspsDeg.length !== 12 ||
      Array.from({ length: 12 }, (_, i) => i).some(i => !Object.hasOwn(value.cuspsDeg, i)))
    fail('INVALID_CUSPS', 'Exactly twelve dense cusps required');
  const ascendant = normalize360(value.ascendantLongitudeDeg);
  const first = system === 'WHOLE_SIGN' ? Math.floor(ascendant / 30) * 30 : ascendant;
  const cuspsDeg = Object.freeze(value.cuspsDeg.map((cusp, i) => {
    if (typeof cusp !== 'number' || !Number.isFinite(cusp))
      fail('INVALID_CUSPS', 'Cusps must be finite numbers');
    const normalized = normalize360(cusp);
    if (angularSeparation(normalized, normalize360(first + 30 * i)) > 1e-9)
      fail('INVALID_CUSPS', 'Cusp ' + (i + 1) + ' violates ' + system + ' geometry');
    return normalized;
  }));
  // Reuse the existing canonical geometric locator for interval consistency.
  locateLongitudeInHouses(ascendant, cuspsDeg);
  return Object.freeze({ system, datetimeUtc: value.datetimeUtc, frame: value.frame,
    ascendant, longitudeBasis, cuspsDeg });
}
function pointsSnapshot(points) {
  if (!Array.isArray(points) || points.length === 0 || points.length > 32)
    fail('INVALID_POINTS', '1..32 selected points required');
  const names = new Set();
  return Object.freeze(Array.from({ length: points.length }, (_, i) => {
    if (!Object.hasOwn(points, i) || !record(points[i]))
      fail('INVALID_POINTS', 'Points must be a dense array of records');
    const { id, longitudeDeg } = points[i];
    if (Object.keys(points[i]).some(k => k !== 'id' && k !== 'longitudeDeg') ||
        typeof id !== 'string' || id.length === 0 || id.length > 128 || id.trim() !== id || names.has(id) ||
        typeof longitudeDeg !== 'number' || !Number.isFinite(longitudeDeg))
      fail('INVALID_POINTS', 'Every point needs a unique id and finite longitude');
    names.add(id);
    return Object.freeze({ id, longitudeDeg: normalize360(longitudeDeg) });
  }));
}

/** Explicitly compares Whole Sign versus Equal Ascendant, never legacy Vehlow. */
export function compareWholeSignAndEqualAscendant(input) {
  if (!record(input) || Object.keys(input).some(k => !ROOT_KEYS.has(k)))
    fail('INVALID_ARGUMENT', 'Unexpected comparison input');
  if (input.birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'House comparison requires known birth time');
  const whole = snapshot(input.wholeSign, 'WHOLE_SIGN', 'WholeSignHouseCusps');
  const equal = snapshot(input.equalAscendant, 'EQUAL_ASCENDANT', 'EqualHouseCusps');
  if (whole.datetimeUtc !== equal.datetimeUtc || whole.frame !== equal.frame ||
      whole.ascendant !== equal.ascendant || whole.longitudeBasis.type !== equal.longitudeBasis.type ||
      whole.longitudeBasis.ayanamsaId !== equal.longitudeBasis.ayanamsaId)
    fail('INCOMPATIBLE_HOUSE_CONTEXT', 'Cusp sets must share UTC, ascendant, frame and zodiac');
  const points = pointsSnapshot(input.points);
  const placements = Object.freeze(points.map(point => {
    const wholeSign = locateLongitudeInHouses(point.longitudeDeg, whole.cuspsDeg);
    const equalAscendant = locateLongitudeInHouses(point.longitudeDeg, equal.cuspsDeg);
    return Object.freeze({ id: point.id, longitudeDeg: point.longitudeDeg,
      wholeSign, equalAscendant, houseChanged: wholeSign.house !== equalAscendant.house });
  }));
  return Object.freeze({
    contract: 'HouseMethodComparison', contractVersion: VERSION, factsOnly: true,
    datetimeUtc: whole.datetimeUtc, frame: whole.frame,
    longitudeBasis: whole.longitudeBasis, ascendantLongitudeDeg: whole.ascendant,
    comparedHouseSystems: Object.freeze(['WHOLE_SIGN', 'EQUAL_ASCENDANT']),
    provenanceStatus: STATUS, placements,
    changedPointIds: Object.freeze(placements.filter(p => p.houseChanged).map(p => p.id)),
  });
}
