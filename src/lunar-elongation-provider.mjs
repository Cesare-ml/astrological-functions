/**
 * Experimental Sun/Moon provider gate for the F5 longitude-sector method.
 * This module performs NO astronomical calculations and accepts no Swiss fallback.
 * Provider metadata is checked, not proof of real-kernel scientific accuracy.
 */
import { AstrologyError, normalize360 } from './index.mjs';
import { calculateLunarElongationSectors } from './lunar-elongation.mjs';

const CONTEXT = Object.freeze({
  center: 'EARTH',
  frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT',
  zodiac: 'TROPICAL',
});

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AstrologyError('INVALID_EPHEMERIS_PIN', `${field} must be a nonempty string`);
  }
  return value;
}

function validateUtc(datetimeUtc) {
  // Explicit second-or-millisecond precision prevents coercion of local dates.
  if (typeof datetimeUtc !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(datetimeUtc)) {
    throw new AstrologyError('INVALID_UTC', 'Explicit ISO UTC instant with Z is required');
  }
  const timestamp = Date.parse(datetimeUtc);
  if (!Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 19) !== datetimeUtc.slice(0, 19)) {
    throw new AstrologyError('INVALID_UTC', 'Invalid UTC calendar instant');
  }
}

function validatedExpectedPin(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AstrologyError('INVALID_EPHEMERIS_PIN', 'An explicit ephemeris pin is required');
  }
  return Object.freeze({
    engineVersion: requiredString(value.engineVersion, 'engineVersion'),
    kernelSetId: requiredString(value.kernelSetId, 'kernelSetId'),
    timeModelId: requiredString(value.timeModelId, 'timeModelId'),
  });
}

function validatePosition(state, bodyName, datetimeUtc, pin) {
  const metadata = state?.metadata;
  if (!state || !metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new AstrologyError('INCOMPATIBLE_EPHEMERIS',
      `Provider returned incompatible ${bodyName} position/metadata`);
  }
  // Validate and use exactly one snapshot of caller-controlled metadata.
  const {
    bodyName: reportedBody, datetimeUtc: reportedUtc,
    center, frame, corrections, zodiac, observer,
    engineVersion, kernelSetId, timeModelId, warnings: metadataWarnings,
  } = metadata;
  if (reportedBody !== bodyName || reportedUtc !== datetimeUtc ||
      center !== CONTEXT.center || frame !== CONTEXT.frame ||
      corrections !== CONTEXT.corrections ||
      (zodiac !== undefined && zodiac !== 'TROPICAL') ||
      (observer !== undefined && observer !== null) ||
      engineVersion !== pin.engineVersion || kernelSetId !== pin.kernelSetId ||
      timeModelId !== pin.timeModelId) {
    throw new AstrologyError('INCOMPATIBLE_EPHEMERIS',
      `Provider returned incompatible ${bodyName} position/metadata`);
  }
  const stateWarnings = state.warnings;
  for (const warnings of [stateWarnings, metadataWarnings]) {
    if (warnings !== undefined && (!Array.isArray(warnings) || warnings.length !== 0)) {
      throw new AstrologyError('EPHEMERIS_WARNINGS_UNSUPPORTED',
        `Provider reported unresolved ${bodyName} ephemeris warnings`);
    }
  }
  const latitudeDeg = state.latitudeDeg;
  const rawLongitudeDeg = state.longitudeDeg;
  if (typeof latitudeDeg !== 'number' || !Number.isFinite(latitudeDeg) ||
      Math.abs(latitudeDeg) > 90) {
    throw new AstrologyError('INVALID_PROVIDER_POSITION', `Invalid ${bodyName} ecliptic latitude`);
  }
  let longitudeDeg;
  try {
    longitudeDeg = normalize360(rawLongitudeDeg);
  } catch {
    throw new AstrologyError('INVALID_PROVIDER_POSITION', `Invalid ${bodyName} ecliptic longitude`);
  }
  return Object.freeze({bodyName, longitudeDeg, latitudeDeg});
}

/**
 * Obtain two matching apparent geocentric ecliptic-of-date tropical positions.
 * The injected provider must implement the same name-based request boundary as
 * calculateNatalWithProvider; callers must pin provenance and the UTC instant.
 */
export async function calculateLunarElongationWithProvider(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AstrologyError('INVALID_ARGUMENT', 'Provider calculation input is required');
  }
  // Snapshot the caller's instant before the first async provider boundary.
  // Re-reading input.datetimeUtc after await could mix two different instants.
  const datetimeUtc = input.datetimeUtc;
  validateUtc(datetimeUtc);
  if (input.zodiac !== 'TROPICAL') {
    throw new AstrologyError('UNSUPPORTED_LUNAR_ZODIAC',
      'Provider gate is tropical-only until sidereal projection is validated');
  }
  const pin = validatedExpectedPin(input.expectedEphemeris);
  // Snapshot provider identity and method: an async callback or caller must not
  // switch the Sun and Moon to different provider instances during this call.
  const provider = input.provider;
  const getPosition = provider?.getGeocentricEcliptic;
  if (typeof getPosition !== 'function') {
    throw new AstrologyError('MISSING_PROVIDER', 'Explicit EphemerisProvider required');
  }
  const positions = {};
  for (const bodyName of ['Sun', 'Moon']) {
    const request = Object.freeze({
      datetimeUtc,
      bodyName,
      center: CONTEXT.center,
      kernelSetId: pin.kernelSetId,
      timeModelId: pin.timeModelId,
      frame: CONTEXT.frame,
      corrections: CONTEXT.corrections,
    });
    let state;
    try {
      state = await Reflect.apply(getPosition, provider, [request]);
    } catch {
      throw new AstrologyError('EPHEMERIS_PROVIDER_FAILED',
        `Provider failed to obtain ${bodyName} position`);
    }
    positions[bodyName] = validatePosition(state, bodyName, datetimeUtc, pin);
  }
  const sectors = calculateLunarElongationSectors({
    sunLongitudeDeg: positions.Sun.longitudeDeg,
    moonLongitudeDeg: positions.Moon.longitudeDeg,
    context: CONTEXT,
  });
  return Object.freeze({
    contract: 'LunarElongationWithProvider',
    contractVersion: '0.1.0-experimental',
    datetimeUtc,
    ephemeris: pin,
    positions: Object.freeze(positions),
    sectors,
  });
}
