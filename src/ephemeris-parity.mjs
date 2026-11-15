/**
 * Opt-in, read-only parity gate between two independently configured providers.
 * No Swiss Ephemeris dependency or astronomical calculations live here.
 * Experimental integration utility; not connected to production VirgoStars.
 */
import { signedAngularDistance } from './index.mjs';

export class EphemerisParityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'EphemerisParityError';
    this.code = code;
  }
}

function nonnegativeFinite(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new EphemerisParityError('INVALID_TOLERANCE', `${field} must be finite and nonnegative`);
  }
  return value;
}

function checkedTolerances(value) {
  if (!value || typeof value !== 'object') {
    throw new EphemerisParityError('INVALID_TOLERANCE', 'Explicit per-field tolerances are required');
  }
  return Object.freeze({
    longitudeArcsec: nonnegativeFinite(value.longitudeArcsec, 'longitudeArcsec'),
    latitudeArcsec: nonnegativeFinite(value.latitudeArcsec, 'latitudeArcsec'),
    longitudeSpeedArcsecPerDay: nonnegativeFinite(value.longitudeSpeedArcsecPerDay, 'longitudeSpeedArcsecPerDay'),
    latitudeSpeedArcsecPerDay: nonnegativeFinite(value.latitudeSpeedArcsecPerDay, 'latitudeSpeedArcsecPerDay'),
    distanceAu: nonnegativeFinite(value.distanceAu, 'distanceAu'),
    distanceSpeedAuPerDay: nonnegativeFinite(value.distanceSpeedAuPerDay, 'distanceSpeedAuPerDay'),
  });
}

function requiredMetadata(metadata, label) {
  if (!metadata || typeof metadata !== 'object') {
    throw new EphemerisParityError('INCOMPATIBLE_EPHEMERIS',
      `${label} must explicitly provide APPARENT/ECLIPTIC_OF_DATE/EARTH coordinates`);
  }
  // Snapshot untrusted provider metadata once before validating and returning it.
  const { center, frame, corrections, engineVersion, kernelSetId, timeModel } = metadata;
  if (center !== 'EARTH' || frame !== 'ECLIPTIC_OF_DATE' ||
      corrections !== 'APPARENT') {
    throw new EphemerisParityError('INCOMPATIBLE_EPHEMERIS',
      `${label} must explicitly provide APPARENT/ECLIPTIC_OF_DATE/EARTH coordinates`);
  }
  for (const [key, value] of Object.entries({ engineVersion, kernelSetId, timeModel })) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new EphemerisParityError('MISSING_PROVENANCE', `${label} requires metadata.${key}`);
    }
  }
  return Object.freeze({
    center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
    engineVersion,
    kernelSetId,
    timeModel,
  });
}

function checkedState(value, label) {
  if (!value || typeof value !== 'object') {
    throw new EphemerisParityError('INVALID_STATE', `${label} state is missing`);
  }
  const metadata = requiredMetadata(value.metadata, label);
  // Six polar coordinates/rates, corresponding to the Swiss apparent-position
  // output fields; an omitted speed must never turn into a false parity PASS.
  const fields = ['longitudeDeg', 'latitudeDeg', 'longitudeSpeedDegPerDay',
    'latitudeSpeedDegPerDay', 'distanceAu', 'distanceSpeedAuPerDay'];
  const numeric = {};
  for (const field of fields) {
    const number = value[field];
    if (typeof number !== 'number' || !Number.isFinite(number)) {
      throw new EphemerisParityError('INVALID_STATE', `${label}.${field} must be finite`);
    }
    numeric[field] = number;
  }
  if (numeric.longitudeDeg < 0 || numeric.longitudeDeg >= 360 ||
      Math.abs(numeric.latitudeDeg) > 90 || numeric.distanceAu <= 0) {
    throw new EphemerisParityError('INVALID_STATE', `${label} position outside coordinate bounds`);
  }
  return Object.freeze({ ...numeric, metadata });
}

export function checkedBodyNames(bodyNames) {
  if (!Array.isArray(bodyNames) || bodyNames.length < 1 || bodyNames.length > 32) {
    throw new EphemerisParityError('INVALID_BODIES', '1..32 body names required');
  }
  const names = [];
  const seen = new Set();
  for (let index = 0; index < bodyNames.length; index++) {
    if (!Object.hasOwn(bodyNames, index)) {
      throw new EphemerisParityError('INVALID_BODIES', 'Sparse body lists are unsupported');
    }
    const name = bodyNames[index];
    if (typeof name !== 'string' || !name.trim() || seen.has(name)) {
      throw new EphemerisParityError('INVALID_BODIES', 'Body names must be unique nonempty strings');
    }
    seen.add(name);
    names.push(name);
  }
  return Object.freeze(names);
}

/**
 * Run equal APPARENT geocentric-of-date requests against two injected backends.
 * Each backend must have getGeocentricEcliptic({datetimeUtc,bodyName,frame,corrections}).
 * No fallback on failure and no outbound network/database/file side effects here.
 * The caller selects and justifies every tolerance; a PASS is only parity with
 * the caller's reference, never a standalone NASA/JPL accuracy certification.
 */
export async function compareApparentEphemerisProviders({
  datetimeUtc, bodyNames, referenceProvider, candidateProvider, tolerances,
}) {
  if (typeof datetimeUtc !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(datetimeUtc) ||
      Number.isNaN(Date.parse(datetimeUtc)) ||
      // Date.parse normalizes impossible civil dates (e.g. Feb 30) silently.
      // Match the whole-second calendar portion after roundtrip; preserve
      // higher-precision fractional seconds in the original provider request.
      new Date(Date.parse(datetimeUtc)).toISOString().slice(0, 19) !==
        datetimeUtc.slice(0, 19)) {
    throw new EphemerisParityError('INVALID_UTC', 'A valid ISO UTC instant ending Z is required');
  }
  const names = checkedBodyNames(bodyNames);
  const limits = checkedTolerances(tolerances);
  // Pin provider callables once: mutable getters must not redirect a validated request.
  const referenceMethod = referenceProvider?.getGeocentricEcliptic;
  const candidateMethod = candidateProvider?.getGeocentricEcliptic;
  if (!referenceProvider || typeof referenceMethod !== 'function' ||
      !candidateProvider || typeof candidateMethod !== 'function' ||
      referenceProvider === candidateProvider) {
    throw new EphemerisParityError('INVALID_PROVIDER', 'Two distinct configured ephemeris providers are required');
  }

  const comparisons = [];
  for (const bodyName of names) {
    const request = Object.freeze({
      datetimeUtc, bodyName, corrections: 'APPARENT', frame: 'ECLIPTIC_OF_DATE',
    });
    const reference = checkedState(await Reflect.apply(referenceMethod, referenceProvider, [request]), 'reference');
    const candidate = checkedState(await Reflect.apply(candidateMethod, candidateProvider, [request]), 'candidate');
    const residual = Object.freeze({
      longitudeArcsec: signedAngularDistance(reference.longitudeDeg, candidate.longitudeDeg) * 3600,
      latitudeArcsec: (candidate.latitudeDeg - reference.latitudeDeg) * 3600,
      longitudeSpeedArcsecPerDay:
        (candidate.longitudeSpeedDegPerDay - reference.longitudeSpeedDegPerDay) * 3600,
      latitudeSpeedArcsecPerDay:
        (candidate.latitudeSpeedDegPerDay - reference.latitudeSpeedDegPerDay) * 3600,
      distanceAu: candidate.distanceAu - reference.distanceAu,
      distanceSpeedAuPerDay:
        candidate.distanceSpeedAuPerDay - reference.distanceSpeedAuPerDay,
    });
    const passed = Object.keys(limits).every(field => Math.abs(residual[field]) <= limits[field]);
    comparisons.push(Object.freeze({
      bodyName, passed, residual,
      reference: reference.metadata, candidate: candidate.metadata,
    }));
  }
  const failed = comparisons.filter(row => !row.passed).length;
  return Object.freeze({
    contract: 'APPARENT_EPHEMERIS_PARITY_V2', datetimeUtc,
    tolerances: limits, total: comparisons.length, passed: comparisons.length - failed,
    failed, status: failed === 0 ? 'PASS' : 'FAIL',
    comparisons: Object.freeze(comparisons),
  });
}
