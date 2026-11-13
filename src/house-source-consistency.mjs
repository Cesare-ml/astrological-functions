/**
 * An optional strict caller-declared provenance gate for house comparisons.
 * Neither matching metadata nor a configured kernel ID proves JPL or
 * ephemeris accuracy. This module does not call or implement astronomy.
 */
import { AstrologyError } from './index.mjs';
import { compareHouseMethodPlacements } from './house-method-comparison.mjs';

const SOURCE_KEYS = new Set([
  'datetimeUtc', 'frame', 'longitudeBasis', 'observerType', 'observer',
  'engineVersion', 'kernelSetId', 'timeModel', 'corrections', 'calculationProfileId',
]);
const OBSERVER_KEYS = new Set(['latitudeDeg', 'longitudeDegEast']);
const BASIS_KEYS = new Set(['type', 'ayanamsaId']);
const SIDE_KEYS = new Set(['snapshot', 'source']);
const INPUT_KEYS = new Set(['birthTimeKnown', 'left', 'right', 'points']);
const fail = (code, detail) => { throw new AstrologyError(code, detail); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === 'number' && Number.isFinite(value);
function knownKeys(value, keys, label) {
  if (Object.keys(value).some(key => !keys.has(key)))
    fail('INVALID_SOURCE_CONTEXT', `${label} contains unsupported keys`);
}
function pinnedId(value, name) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 ||
      value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    fail('INVALID_SOURCE_CONTEXT', `${name} must be an explicit bounded nonblank identifier`);
  }
  return value;
}
function declaredSource(value) {
  if (!plain(value)) fail('INVALID_SOURCE_CONTEXT', 'Source must be a plain object');
  knownKeys(value, SOURCE_KEYS, 'Source');
  if (value.frame !== 'ECLIPTIC_OF_DATE' || value.corrections !== 'APPARENT' ||
      value.observerType !== 'TOPOCENTRIC')
    fail('INVALID_SOURCE_CONTEXT', 'Explicit apparent, ecliptic-of-date, topocentric source required');
  if (!plain(value.longitudeBasis))
    fail('INVALID_SOURCE_CONTEXT', 'Source longitudeBasis must be explicit');
  knownKeys(value.longitudeBasis, BASIS_KEYS, 'Source longitudeBasis');
  const basis = value.longitudeBasis;
  if (basis.type !== 'TROPICAL' && basis.type !== 'SIDEREAL')
    fail('INVALID_SOURCE_CONTEXT', 'Unsupported source zodiac basis');
  if (basis.type === 'TROPICAL' && Object.hasOwn(basis, 'ayanamsaId'))
    fail('INVALID_SOURCE_CONTEXT', 'Tropical source cannot provide an ayanamsa');
  if (basis.type === 'SIDEREAL') pinnedId(basis.ayanamsaId, 'ayanamsaId');
  if (!plain(value.observer))
    fail('INVALID_SOURCE_CONTEXT', 'Source observer must be explicit');
  knownKeys(value.observer, OBSERVER_KEYS, 'Observer');
  const { latitudeDeg, longitudeDegEast } = value.observer;
  if (!finite(latitudeDeg) || !finite(longitudeDegEast) ||
      Math.abs(latitudeDeg) >= 90 || Math.abs(longitudeDegEast) > 180)
    fail('INVALID_SOURCE_CONTEXT', 'Nonpolar observer latitude and bounded east longitude required');
  // The base comparator validates the UTC as a real calendar instant.
  if (typeof value.datetimeUtc !== 'string')
    fail('INVALID_SOURCE_CONTEXT', 'Source datetimeUtc must be explicit');
  return Object.freeze({
    datetimeUtc: value.datetimeUtc,
    frame: 'ECLIPTIC_OF_DATE',
    longitudeBasis: Object.freeze(basis.type === 'TROPICAL'
      ? { type: 'TROPICAL' }
      : { type: 'SIDEREAL', ayanamsaId: basis.ayanamsaId }),
    observerType: 'TOPOCENTRIC',
    observer: Object.freeze({latitudeDeg, longitudeDegEast}),
    engineVersion: pinnedId(value.engineVersion, 'engineVersion'),
    kernelSetId: pinnedId(value.kernelSetId, 'kernelSetId'),
    timeModel: pinnedId(value.timeModel, 'timeModel'),
    corrections: 'APPARENT',
    calculationProfileId: pinnedId(value.calculationProfileId, 'calculationProfileId'),
  });
}
function side(value, label) {
  if (!plain(value)) fail('INVALID_SOURCE_CONTEXT', `${label} must be a plain object`);
  knownKeys(value, SIDE_KEYS, label);
  if (!Object.hasOwn(value, 'snapshot'))
    fail('INVALID_SOURCE_CONTEXT', `${label} snapshot missing`);
  return Object.freeze({ snapshot: value.snapshot, source: declaredSource(value.source) });
}
function equalBasis(a, b) {
  return a.type === b.type && a.ayanamsaId === b.ayanamsaId;
}
function matchesSnapshot(source, snapshot) {
  return source.datetimeUtc === snapshot.datetimeUtc &&
    source.frame === snapshot.frame && equalBasis(source.longitudeBasis, snapshot.longitudeBasis);
}
function sameSource(a, b) {
  return a.datetimeUtc === b.datetimeUtc && a.frame === b.frame &&
    equalBasis(a.longitudeBasis, b.longitudeBasis) &&
    a.engineVersion === b.engineVersion && a.kernelSetId === b.kernelSetId &&
    a.timeModel === b.timeModel && a.corrections === b.corrections &&
    a.calculationProfileId === b.calculationProfileId &&
    a.observerType === b.observerType &&
    a.observer.latitudeDeg === b.observer.latitudeDeg &&
    a.observer.longitudeDegEast === b.observer.longitudeDegEast;
}
/**
 * Strict metadata parity wrapper for the existing F3 comparison API.
 * This is a matching **declaration** gate, not a scientific certification.
 */
export function compareHousePlacementsWithPinnedSource(input) {
  if (!plain(input)) fail('INVALID_SOURCE_CONTEXT', 'Comparison must be a plain object');
  knownKeys(input, INPUT_KEYS, 'Comparison');
  if (input.birthTimeKnown !== true)
    fail('BIRTH_TIME_UNKNOWN', 'Birth time must be explicitly known');
  const left = side(input.left, 'left');
  const right = side(input.right, 'right');
  // Validates the cusp geometry, UTC, frame, zodiac and points once using the
  // canonical existing comparison; we deliberately do not duplicate it.
  const comparison = compareHouseMethodPlacements({
    birthTimeKnown: true,
    left: left.snapshot,
    right: right.snapshot,
    points: input.points,
  });
  if (!matchesSnapshot(left.source, comparison.left) ||
      !matchesSnapshot(right.source, comparison.right) ||
      !sameSource(left.source, right.source))
    fail('INCOMPATIBLE_SOURCE_CONTEXT', 'Both house systems require the same declared source context');
  return Object.freeze({
    contract: 'PinnedHouseMethodComparison',
    contractVersion: '0.1.0-experimental',
    status: 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED',
    source: left.source,
    comparison,
  });
}
