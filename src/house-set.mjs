/** Compose the experimental Rust angle provider and five house geometries. */
import { AstrologyError } from './index.mjs';
import { parseUtcGregorianInstant, UtcInputError } from './utc-calendar-contract.mjs';
import { calculateVehlowHouseCusps } from './vehlow-houses.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { calculatePlacidusHouseCusps } from './placidus-houses.mjs';
import { calculateRegiomontanusHouseCusps } from './regiomontanus-houses.mjs';
import { calculateKochHouseCusps } from './koch-houses.mjs';

const INPUT_FIELDS = Object.freeze([
  'datetimeUtc', 'birthTimeKnown', 'ut1JulianDay', 'ttJulianDay',
  'latitudeDeg', 'longitudeDegEast', 'engineVersion', 'kernelSetId', 'timeModel',
]);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const identifier = value => typeof value === 'string' &&
  value.length > 0 && value.length <= 128 && value.trim() === value;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (code, message) => { throw new AstrologyError(code, message); };

function snapshotInput(input) {
  if (!record(input)) fail('INVALID_INPUT', 'Explicit house-set input object is required');
  const snapshot = {};
  for (const field of INPUT_FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !Object.hasOwn(descriptor, 'value'))
      fail('INVALID_INPUT', `House-set input requires own data property ${field}`);
    snapshot[field] = descriptor.value;
  }
  return snapshot;
}

function validateUtc(datetimeUtc) {
  if (typeof datetimeUtc !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(datetimeUtc))
    fail('INVALID_UTC', 'A real UTC instant ending Z with up to millisecond precision is required');
  try {
    parseUtcGregorianInstant({
      datetimeUtc,
      calendar: 'PROLEPTIC_GREGORIAN',
      timeScale: 'UTC',
    });
  } catch (error) {
    if (error instanceof UtcInputError)
      fail('INVALID_UTC', 'A real proleptic Gregorian UTC instant is required');
    throw error;
  }
}

function validateInput(input) {
  const value = snapshotInput(input);
  validateUtc(value.datetimeUtc);
  if (value.birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'Known birth time is required');
  if (!finite(value.ut1JulianDay) || !finite(value.ttJulianDay))
    fail('INVALID_INPUT', 'Explicit finite UT1 and TT Julian days are required');
  if (!finite(value.latitudeDeg) || value.latitudeDeg <= -90 || value.latitudeDeg >= 90)
    fail('INVALID_COORDINATES', 'A finite nonpolar geographic latitude strictly between -90 and +90 degrees is required');
  if (!finite(value.longitudeDegEast) ||
      value.longitudeDegEast < -180 || value.longitudeDegEast > 180)
    fail('INVALID_COORDINATES', 'Geographic longitude east must be within [-180, +180] degrees');
  if (!identifier(value.engineVersion) || !identifier(value.kernelSetId) || !identifier(value.timeModel))
    fail('INVALID_HOUSE_METADATA', 'Nonempty, trimmed engineVersion, kernelSetId and timeModel are required');
  return Object.freeze(value);
}

function validateProvider(provider) {
  if (!record(provider)) fail('INVALID_INPUT', 'Explicit house-angle provider is required');
  // Read once so a provider accessor cannot validate one method and execute another.
  const descriptor = (() => {
    let current = provider;
    while (current !== null) {
      const found = Object.getOwnPropertyDescriptor(current, 'calculateHouseAngles');
      if (found) return found;
      current = Object.getPrototypeOf(current);
    }
    return null;
  })();
  if (!descriptor || !Object.hasOwn(descriptor, 'value') ||
      typeof descriptor.value !== 'function')
    fail('INVALID_INPUT', 'Provider must expose a data-method calculateHouseAngles');
  return descriptor.value;
}

function validateAngles(angles, input) {
  if (!record(angles) ||
      angles.model !== 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME' ||
      angles.ut1JulianDay !== input.ut1JulianDay ||
      angles.ttJulianDay !== input.ttJulianDay ||
      angles.latitudeDeg !== input.latitudeDeg ||
      angles.longitudeDegEast !== input.longitudeDegEast)
    fail('INCOMPATIBLE_ANGLE_SOURCE', 'Angle provider metadata must match the validated request');
  if (!finite(angles.armcDeg) || !finite(angles.ascendantDeg) ||
      angles.ascendantDeg < 0 || angles.ascendantDeg > 360 ||
      !finite(angles.midheavenDeg) ||
      !finite(angles.trueObliquityDeg) ||
      angles.trueObliquityDeg <= 0 || angles.trueObliquityDeg >= 90)
    fail('INVALID_ANGLE_SOURCE', 'Provider must return finite ARMC, valid Ascendant/MC and physical true obliquity');
}

/**
 * Validate civil time, observer site and pinned source identifiers before
 * invoking the external angle provider. The provider supplies angles only;
 * this function composes the five pure house geometries.
 */
export function calculateHouseSet(input, provider) {
  const request = validateInput(input);
  const calculateHouseAngles = validateProvider(provider);
  const requestAngles = Object.freeze({
    ut1JulianDay: request.ut1JulianDay,
    ttJulianDay: request.ttJulianDay,
    latitudeDeg: request.latitudeDeg,
    longitudeDegEast: request.longitudeDegEast,
  });
  const angles = calculateHouseAngles.call(provider, requestAngles);
  validateAngles(angles, request);

  const source = Object.freeze({
    engineVersion: request.engineVersion,
    kernelSetId: request.kernelSetId,
    timeModel: request.timeModel,
    center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE',
    corrections: 'IAU2006_2000B_APPROXIMATE',
    zodiac: 'TROPICAL',
    observerType: 'TOPOCENTRIC',
    observer: Object.freeze({
      latitudeDeg: request.latitudeDeg,
      longitudeDegEast: request.longitudeDegEast,
    }),
  });
  const common = {
    datetimeUtc: request.datetimeUtc,
    birthTimeKnown: true,
    ascendantDeg: angles.ascendantDeg,
    midheavenDeg: angles.midheavenDeg,
    armcDeg: angles.armcDeg,
    trueObliquityDeg: angles.trueObliquityDeg,
    source,
  };
  const houses = Object.freeze({
    vehlow: calculateVehlowHouseCusps({ ...common, profile: 'VEHLOW_ASC_CENTERED_V1' }),
    porphyry: calculatePorphyryHouseCusps(common),
    placidus: calculatePlacidusHouseCusps(common),
    regiomontanus: calculateRegiomontanusHouseCusps(common),
    koch: calculateKochHouseCusps(common),
  });
  return Object.freeze({
    contract: 'ExperimentalHouseSet',
    contractVersion: '0.1.0-experimental',
    houses,
    validation: 'CALLER_ASSERTED_INPUTS_NOT_INDEPENDENTLY_VERIFIED',
  });
}
