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
  if (!record(value) || !identifier(value.snapshotId)) {
    throw new AstrologyError('INVALID_DECLINATION_SNAPSHOT', `${label} requires a nonempty snapshotId`);
  }
  const datetimeUtc = requireUtc(value.datetimeUtc, `${label}.datetimeUtc`);
  const axes = value.coordinates;
  if (!record(axes) || axes.origin !== 'EARTH_GEOCENTER' ||
      axes.kind !== 'EQUATORIAL_DECLINATION' || !FRAMES.has(axes.frame) ||
      !CORRECTIONS.has(axes.corrections)) {
    throw new AstrologyError('INVALID_DECLINATION_FRAME', `${label} requires explicit geocentric equatorial frame and correction semantics`);
  }
  if ((axes.frame === 'ICRS' && axes.frameEpochUtc !== null) ||
      (axes.frame === 'TRUE_EQUATOR_OF_DATE' && axes.frameEpochUtc !== datetimeUtc)) {
    throw new AstrologyError('INVALID_DECLINATION_FRAME', `${label} frameEpochUtc must be null for ICRS or exactly its UTC instant for TRUE_EQUATOR_OF_DATE`);
  }
  const provenance = value.provenance;
  if (!record(provenance) || provenance.providerId !== 'VIRGOSTARS_EPHEMERIS' ||
      PROVENANCE_FIELDS.some(field => !identifier(provenance[field]))) {
    throw new AstrologyError('INVALID_DECLINATION_PROVENANCE', `${label} requires pinned VirgoStars Ephemeris engine, kernel and time-model identifiers`);
  }
  return Object.freeze({
    snapshotId: value.snapshotId,
    datetimeUtc,
    coordinates: Object.freeze({
      origin: axes.origin,
      kind: axes.kind,
      frame: axes.frame,
      frameEpochUtc: axes.frameEpochUtc,
      corrections: axes.corrections,
    }),
    provenance: Object.freeze({
      providerId: provenance.providerId,
      engineVersion: provenance.engineVersion,
      kernelSetId: provenance.kernelSetId,
      timeModelId: provenance.timeModelId,
    }),
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
  const sourceContext = snapshotContext(options.sourceSnapshot, 'sourceSnapshot');
  const targetContext = snapshotContext(options.targetSnapshot, 'targetSnapshot');
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
    direction: options.direction,
    sourcePoints: options.sourceSnapshot.points,
    targetPoints: options.targetSnapshot.points,
    contactDefinitions: options.contactDefinitions,
  });
  return Object.freeze({
    contract: 'SourcedDeclinationContactsResult',
    methodVersion: 'SOURCED_DECLINATION_CONTACTS_V1',
    sourceContext,
    targetContext,
    facts,
  });
}
