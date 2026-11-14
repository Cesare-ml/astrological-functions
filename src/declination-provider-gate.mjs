/**
 * Experimental asynchronous bridge from a caller-injected declination provider
 * into the source-pinned declination contact calculator.
 * This adapter does not calculate astronomy or promise a Rust/WASM binding.
 */
import { AstrologyError } from './index.mjs';
import { calculateSourcedDeclinationContacts } from './sourced-declination-contacts.mjs';

const FRAMES = new Set(['ICRS', 'TRUE_EQUATOR_OF_DATE']);
const CORRECTIONS = new Set(['GEOMETRIC', 'APPARENT']);
const PROVENANCE_FIELDS = ['providerId', 'engineVersion', 'kernelSetId', 'timeModelId'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 &&
    value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
}
function validateUtc(value) {
  const m = typeof value === 'string' &&
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/.exec(value);
  if (!m) throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', 'Snapshot datetimeUtc must be strict ISO UTC');
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] ||
      hour > 23 || minute > 59 || second > 59)
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', 'Invalid UTC calendar date or clock time');
  return value;
}
function validateSelection(selection, name) {
  if (!isRecord(selection))
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', `${name} requires a snapshotId`);
  const snapshotId = selection.snapshotId;
  if (!validId(snapshotId))
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', `${name} requires a snapshotId`);
  const datetimeUtc = validateUtc(selection.datetimeUtc);
  // Snapshot the list *before* validation: an accessor must not substitute a
  // different body sequence after unique IDs have been checked.
  const inputIds = selection.bodyIds;
  if (!Array.isArray(inputIds) || inputIds.length < 1 || inputIds.length > 32)
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', `${name} requires 1..32 unique bodyIds`);
  const bodyIds = Array.from(inputIds);
  if (bodyIds.some(id => !validId(id)) || new Set(bodyIds).size !== bodyIds.length)
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', `${name} requires 1..32 unique bodyIds`);
  return Object.freeze({ snapshotId, datetimeUtc, bodyIds: Object.freeze(bodyIds) });
}
function validateCoordinates(value) {
  if (!isRecord(value))
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', 'Explicit supported geocentric equatorial coordinates are required');
  const { origin, kind, frame, corrections } = value;
  if (origin !== 'EARTH_GEOCENTER' || kind !== 'EQUATORIAL_DECLINATION' ||
      !FRAMES.has(frame) || !CORRECTIONS.has(corrections)) {
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', 'Explicit supported geocentric equatorial coordinates are required');
  }
  return Object.freeze({ origin, kind, frame, corrections });
}
function validateProvenance(value) {
  if (!isRecord(value))
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', 'Pinned VirgoStars Ephemeris provenance is required');
  const { providerId, engineVersion, kernelSetId, timeModelId } = value;
  const pinned = { providerId, engineVersion, kernelSetId, timeModelId };
  if (providerId !== 'VIRGOSTARS_EPHEMERIS' ||
      PROVENANCE_FIELDS.some(field => !validId(pinned[field]))) {
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', 'Pinned VirgoStars Ephemeris provenance is required');
  }
  return Object.freeze(pinned);
}
function snapshotCoordinates(coordinates, datetimeUtc) {
  return Object.freeze({ ...coordinates,
    frameEpochUtc: coordinates.frame === 'ICRS' ? null : datetimeUtc });
}
function assertResponse(result, request) {
  if (!isRecord(result))
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_RESULT', 'Provider response identity or declination is invalid');
  // A provider result may expose accessors. Validate the exact value we use,
  // not a value that can change between the range check and frozen output.
  const { snapshotId, bodyId, datetimeUtc, declinationDeg,
    coordinates: actualCoordinates, provenance: actualProvenance } = result;
  if (snapshotId !== request.snapshotId || bodyId !== request.bodyId ||
      datetimeUtc !== request.datetimeUtc ||
      typeof declinationDeg !== 'number' || !Number.isFinite(declinationDeg) ||
      Math.abs(declinationDeg) > 90) {
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_RESULT', 'Provider response identity or declination is invalid');
  }
  const expectedCoordinates = request.coordinates;
  if (!isRecord(actualCoordinates) ||
      Object.keys(expectedCoordinates).some(field => actualCoordinates[field] !== expectedCoordinates[field])) {
    throw new AstrologyError('INCOMPATIBLE_DECLINATION_PROVIDER_FRAME', 'Provider response has different coordinate or correction semantics');
  }
  if (!isRecord(actualProvenance) ||
      PROVENANCE_FIELDS.some(field => actualProvenance[field] !== request.expectedProvenance[field])) {
    throw new AstrologyError('INCOMPATIBLE_DECLINATION_PROVIDER_PROVENANCE', 'Provider response differs from pinned provenance');
  }
  return Object.freeze({ name: request.bodyId,
    declinationDeg: declinationDeg === 0 ? 0 : declinationDeg });
}

/**
 * Every requested body has its own immutable request/validated response.
 * First validate both sides before the initial await; fetch in deterministic
 * source-then-target order. Reject mismatches immediately, without fallback.
 */
export async function calculateDeclinationContactsWithProvider(options) {
  if (!isRecord(options))
    throw new AstrologyError('INVALID_DECLINATION_PROVIDER_INPUT', 'Explicit options object required');
  const source = validateSelection(options.source, 'source');
  const target = validateSelection(options.target, 'target');
  const coordinates = validateCoordinates(options.coordinates);
  const expectedProvenance = validateProvenance(options.expectedProvenance);
  if (coordinates.frame === 'TRUE_EQUATOR_OF_DATE' && source.datetimeUtc !== target.datetimeUtc)
    throw new AstrologyError('INCOMPATIBLE_DECLINATION_FRAMES', 'True-equator-of-date requires identical instants');
  // Read the provider method exactly once before any await. Re-resolving a mutable
  // method during the loop can silently mix ephemeris implementations.
  const provider = options.provider;
  const getGeocentricEquatorialDeclination = provider?.getGeocentricEquatorialDeclination;
  if (typeof getGeocentricEquatorialDeclination !== 'function')
    throw new AstrologyError('MISSING_DECLINATION_PROVIDER', 'Injected declination provider required');

  // Validate the rest of the contract *before* requesting astronomy, too.
  // Reuse the existing facts module to check direction, names and orb policy
  // without inventing any placeholder positions: pass the required real numeric
  // coordinates only after provider checks below. Inputs here are structural.
  const direction = options.direction;
  if (!['A_TO_B', 'B_TO_A', 'SKY_TO_NATAL'].includes(direction))
    throw new AstrologyError('INVALID_DECLINATION_DIRECTION', 'Explicit declination direction required');
  const suppliedDefinitions = options.contactDefinitions;
  if (!Array.isArray(suppliedDefinitions) || suppliedDefinitions.length < 1 ||
      suppliedDefinitions.length > 2)
    throw new AstrologyError('INVALID_DECLINATION_CONTACT', 'Explicit unique parallel/contra-parallel definitions and finite orbs required');
  // Read each definition value once, then check and freeze that same snapshot.
  const definitions = Array.from(suppliedDefinitions, d => isRecord(d) ?
    { id: d.id, maxOrbDeg: d.maxOrbDeg } : null);
  if (new Set(definitions.map(d => d?.id)).size !== definitions.length ||
      definitions.some(d => !d || !['PARALLEL', 'CONTRA_PARALLEL'].includes(d.id) ||
        typeof d.maxOrbDeg !== 'number' || !Number.isFinite(d.maxOrbDeg) ||
        d.maxOrbDeg < 0 || d.maxOrbDeg > 90))
    throw new AstrologyError('INVALID_DECLINATION_CONTACT', 'Explicit unique parallel/contra-parallel definitions and finite orbs required');
  const contactDefinitions = Object.freeze(definitions.map(d => Object.freeze(d)));
  async function acquire(selection) {
    const frameCoordinates = snapshotCoordinates(coordinates, selection.datetimeUtc);
    const points = [];
    for (const bodyId of selection.bodyIds) {
      const request = Object.freeze({
        snapshotId: selection.snapshotId,
        datetimeUtc: selection.datetimeUtc,
        bodyId,
        coordinates: frameCoordinates,
        expectedProvenance,
      });
      // Provider failures deliberately propagate; no substitute value is used.
      // Preserve the original receiver for stateful Rust/WASM adapters.
      const result = await getGeocentricEquatorialDeclination.call(provider, request);
      points.push(assertResponse(result, request));
    }
    return Object.freeze({
      snapshotId: selection.snapshotId,
      datetimeUtc: selection.datetimeUtc,
      coordinates: frameCoordinates,
      provenance: expectedProvenance,
      points: Object.freeze(points),
    });
  }
  const sourceSnapshot = await acquire(source);
  const targetSnapshot = await acquire(target);
  return calculateSourcedDeclinationContacts({
    direction, sourceSnapshot, targetSnapshot, contactDefinitions,
  });
}
