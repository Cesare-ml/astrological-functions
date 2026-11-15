/**
 * Strict comparison-context gate for the experimental declination contacts API.
 * The Rust/WASM ephemeris provider supplies equatorial coordinates; this
 * wrapper only validates caller-declared, pinned coordinate semantics.
 */
import { AstrologyError } from './index.mjs';
import { calculateDeclinationContacts } from './declination-contacts.mjs';

const FRAMES = new Set(['ICRS', 'TRUE_EQUATOR_OF_DATE']);
const CORRECTIONS = new Set(['GEOMETRIC', 'APPARENT']);
const PROVENANCE_FIELDS = ['engineVersion', 'kernelSetId', 'timeModelId'];

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function identifier(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 &&
    value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
}
function requireUtc(utc, label) {
  const m = typeof utc === 'string' &&
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/.exec(utc);
  if (!m) throw new AstrologyError('INVALID_DECLINATION_UTC', `${label} requires an ISO-8601 UTC instant ending Z`);
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthDays[month - 1] ||
      hour > 23 || minute > 59 || second > 59) {
    throw new AstrologyError('INVALID_DECLINATION_UTC', `${label} must use a valid Gregorian date and UTC clock time`);
  }
  return utc;
}
function snapshotContext(value, label) {
  if (!record(value)) {
    throw new AstrologyError('INVALID_DECLINATION_SNAPSHOT', `${label} requires a nonempty snapshotId`);
  }
  const {snapshotId, datetimeUtc: rawUtc, coordinates: axes, provenance: rawProvenance} = value;
  if (!identifier(snapshotId)) {
    throw new AstrologyError('INVALID_DECLINATION_SNAPSHOT', `${label} requires a nonempty snapshotId`);
  }
  const datetimeUtc = requireUtc(rawUtc, `${label}.datetimeUtc`);
  if (!record(axes)) {
    throw new AstrologyError('INVALID_DECLINATION_FRAME', `${label} requires explicit geocentric equatorial frame and correction semantics`);
  }
  const {origin, kind, frame, corrections, frameEpochUtc} = axes;
  if (origin !== 'EARTH_GEOCENTER' || kind !== 'EQUATORIAL_DECLINATION' ||
      !FRAMES.has(frame) || !CORRECTIONS.has(corrections)) {
    throw new AstrologyError('INVALID_DECLINATION_FRAME', `${label} requires explicit geocentric equatorial frame and correction semantics`);
  }
  if ((frame === 'ICRS' && frameEpochUtc !== null) ||
      (frame === 'TRUE_EQUATOR_OF_DATE' && frameEpochUtc !== datetimeUtc)) {
    throw new AstrologyError('INVALID_DECLINATION_FRAME', `${label} frameEpochUtc must be null for ICRS or exactly its UTC instant for TRUE_EQUATOR_OF_DATE`);
  }
  if (!record(rawProvenance)) {
    throw new AstrologyError('INVALID_DECLINATION_PROVENANCE', `${label} requires pinned VirgoStars Ephemeris engine, kernel and time-model identifiers`);
  }
  const {providerId, engineVersion, kernelSetId, timeModelId} = rawProvenance;
  if (providerId !== 'VIRGOSTARS_EPHEMERIS' ||
      !identifier(engineVersion) || !identifier(kernelSetId) || !identifier(timeModelId)) {
    throw new AstrologyError('INVALID_DECLINATION_PROVENANCE', `${label} requires pinned VirgoStars Ephemeris engine, kernel and time-model identifiers`);
  }
  return Object.freeze({
    snapshotId, datetimeUtc,
    coordinates: Object.freeze({origin, kind, frame, frameEpochUtc, corrections}),
    provenance: Object.freeze({providerId, engineVersion, kernelSetId, timeModelId}),
  });
}

/**
 * Fail closed on differences in reference frame, correction model or source
 * identity. A true-equator-of-date comparison requires the SAME instant.
 * ICRS allows distinct instants because its declared frame is fixed.
 * Neither the metadata nor the positions are independently certified here.
 */
export function calculateSourcedDeclinationContacts(options) {
  if (!record(options)) {
    throw new AstrologyError('INVALID_DECLINATION_ARGUMENT', 'An explicit options object is required');
  }
  const {sourceSnapshot, targetSnapshot, direction, contactDefinitions} = options;
  const sourcePoints = sourceSnapshot?.points;
  const targetPoints = targetSnapshot?.points;
  const sourceContext = snapshotContext(sourceSnapshot, 'sourceSnapshot');
  const targetContext = snapshotContext(targetSnapshot, 'targetSnapshot');
  const a = sourceContext.coordinates;
  const b = targetContext.coordinates;
  if (a.frame !== b.frame || a.corrections !== b.corrections ||
      a.frameEpochUtc !== b.frameEpochUtc) {
    throw new AstrologyError('INCOMPATIBLE_DECLINATION_FRAMES', 'Source and target declinations require identical frame, epoch and correction semantics');
  }
  for (const field of ['providerId', ...PROVENANCE_FIELDS]) {
    if (sourceContext.provenance[field] !== targetContext.provenance[field]) {
      throw new AstrologyError('INCONSISTENT_DECLINATION_PROVENANCE', `Source and target differ in ${field}`);
    }
  }
  const facts = calculateDeclinationContacts({
    direction, sourcePoints, targetPoints, contactDefinitions,
  });
  return Object.freeze({
    contract: 'SourcedDeclinationContactsResult',
    methodVersion: 'SOURCED_DECLINATION_CONTACTS_V1',
    sourceContext,
    targetContext,
    facts,
  });
}
