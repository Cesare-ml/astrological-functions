/**
 * Experimental facts-to-lots bridge. An independently implemented/pinned
 * VirgoStars-Ephemeris producer must supply the Sun's observed altitude and
 * the preceding new-Moon event. This module never computes astronomy or
 * calls Swiss Ephemeris and does not authenticate provider origin.
 */
import { AstrologyError, normalize360 } from './index.mjs';
import { calculateRegoloKleroi } from './regolo-kleroi.mjs';
import { calculateRegoloArabicParts } from './regolo-arabic-parts.mjs';

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PIN_KEYS = Object.freeze(['engineId', 'engineVersion', 'kernelSetId', 'timeModelId']);
const OBSERVER_KEYS = Object.freeze(['latitudeDeg', 'longitudeDegEast', 'elevationMeters']);
const NATAL_REQUIRED = Object.freeze([
  'birthTimeKnown', 'zodiac', 'chartContextId', 'ascendantLongitudeDeg', 'planetsLongitudeDeg',
]);
const NATAL_OPTIONAL = Object.freeze([
  'houseCuspsDeg', 'midheavenLongitudeDeg', 'descendantLongitudeDeg',
]);

function fail(code, message) { throw new AstrologyError(code, message); }
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function fields(value, required, optional, code) {
  if (!plain(value) || required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    fail(code, 'Missing, inherited, or unexpected fields');
  }
}

function identifier(value, field) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    fail('INVALID_EPHEMERIS_PIN', `${field} must be a bounded source identifier`);
  }
  return value;
}

function validUtc(value) {
  const match = typeof value === 'string'
    ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value)
    : null;
  const milliseconds = match ? Date.parse(value) : NaN;
  if (!Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString() !==
        `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`) {
    fail('INVALID_UTC', 'A genuine UTC calendar instant with seconds and Z is required');
  }
  return Object.freeze({value: new Date(milliseconds).toISOString(), milliseconds});
}

function expectedPin(value) {
  fields(value, PIN_KEYS, [], 'INVALID_EPHEMERIS_PIN');
  if (value.engineId !== 'VIRGOSTARS_EPHEMERIS') {
    fail('INVALID_EPHEMERIS_PIN', 'Only the pinned VirgoStars engine family is accepted');
  }
  return Object.freeze({engineId: value.engineId,
    engineVersion: identifier(value.engineVersion, 'engineVersion'),
    kernelSetId: identifier(value.kernelSetId, 'kernelSetId'),
    timeModelId: identifier(value.timeModelId, 'timeModelId')});
}

function observerFrom(value) {
  fields(value, OBSERVER_KEYS, [], 'INVALID_OBSERVER');
  const {latitudeDeg, longitudeDegEast, elevationMeters} = value;
  if (![latitudeDeg, longitudeDegEast, elevationMeters].every(Number.isFinite) ||
      Math.abs(latitudeDeg) > 90 || Math.abs(longitudeDegEast) > 180 ||
      elevationMeters < -500 || elevationMeters > 10000) {
    fail('INVALID_OBSERVER', 'Explicit finite observer coordinates and elevation required');
  }
  return Object.freeze({latitudeDeg, longitudeDegEast, elevationMeters});
}

function samePin(value, pin, code) {
  if (!PIN_KEYS.every(key => value[key] === pin[key])) {
    fail(code, 'Astronomical facts do not match the expected ephemeris identity');
  }
}

function sunSect(horizon, datetimeUtc, observer, pin) {
  const keys = [...PIN_KEYS, 'datetimeUtc', 'observer', 'altitudeType',
    'horizonModelId', 'sunAltitudeDeg', 'horizonAltitudeDeg', 'uncertaintyDeg', 'warnings'];
  fields(horizon, keys, [], 'INVALID_SUN_HORIZON');
  samePin(horizon, pin, 'INCOMPATIBLE_SUN_SOURCE');
  if (validUtc(horizon.datetimeUtc).value !== datetimeUtc ||
      horizon.altitudeType !== 'APPARENT_SUN_CENTER_TOPOCENTRIC' ||
      typeof horizon.horizonModelId !== 'string' ||
      !IDENTIFIER.test(horizon.horizonModelId) ||
      !Array.isArray(horizon.warnings) || horizon.warnings.length > 0) {
    fail('INCOMPATIBLE_SUN_SOURCE', 'Sun altitude must match birth epoch and model with no unresolved warnings');
  }
  const sourceObserver = observerFrom(horizon.observer);
  if (!OBSERVER_KEYS.every(key => sourceObserver[key] === observer[key])) {
    fail('INCOMPATIBLE_SUN_SOURCE', 'Sun altitude must match the birth observer');
  }
  const {sunAltitudeDeg, horizonAltitudeDeg, uncertaintyDeg} = horizon;
  if (![sunAltitudeDeg, horizonAltitudeDeg, uncertaintyDeg].every(Number.isFinite) ||
      Math.abs(sunAltitudeDeg) > 90 || Math.abs(horizonAltitudeDeg) > 10 ||
      uncertaintyDeg < 0 || uncertaintyDeg > 5) {
    fail('INVALID_SUN_HORIZON', 'Finite Sun altitude, horizon and uncertainty limits required');
  }
  const clearanceDeg = sunAltitudeDeg - horizonAltitudeDeg;
  if (Math.abs(clearanceDeg) <= uncertaintyDeg) {
    fail('AMBIGUOUS_SECT', 'Sun altitude does not resolve daytime versus nighttime at the supplied uncertainty');
  }
  return Object.freeze({sect: clearanceDeg > 0 ? 'DAY' : 'NIGHT',
    sunAltitudeDeg, horizonAltitudeDeg, uncertaintyDeg,
    horizonModelId: horizon.horizonModelId, clearanceDeg});
}

function precedingNewMoonFrom(event, datetime, pin) {
  if (!plain(event)) fail('INVALID_LUNATION', 'Explicit available or unavailable lunation required');
  if (event.availability === 'UNAVAILABLE') {
    fields(event, ['availability', 'reason'], [], 'INVALID_LUNATION');
    if (!['NOT_COMPUTED', 'OUT_OF_RANGE', 'NON_CONVERGENT'].includes(event.reason)) {
      fail('INVALID_LUNATION', 'Unknown new-Moon unavailability reason');
    }
    return Object.freeze({availability: event.availability, reason: event.reason});
  }
  const keys = [...PIN_KEYS, 'availability', 'relation', 'eventDatetimeUtc',
    'moonLongitudeDeg', 'center', 'frame', 'corrections', 'zodiac', 'warnings'];
  fields(event, keys, [], 'INVALID_LUNATION');
  samePin(event, pin, 'INCOMPATIBLE_LUNATION_SOURCE');
  if (event.availability !== 'AVAILABLE' || event.relation !== 'LATEST_PRECEDING_NEW_MOON' ||
      event.center !== 'EARTH' || event.frame !== 'ECLIPTIC_OF_DATE' ||
      event.corrections !== 'APPARENT' || event.zodiac !== 'TROPICAL' ||
      !Array.isArray(event.warnings) || event.warnings.length > 0) {
    fail('INCOMPATIBLE_LUNATION_SOURCE', 'A pinned, apparent tropical preceding new-Moon event is required');
  }
  const eventDatetime = validUtc(event.eventDatetimeUtc);
  const ageDays = (datetime.milliseconds - eventDatetime.milliseconds) / 86400000;
  if (ageDays < 0 || ageDays > 31) {
    fail('INCOMPATIBLE_LUNATION_EPOCH', 'Preceding new Moon must be no later than birth and within 31 days');
  }
  const longitudeDeg = normalize360(event.moonLongitudeDeg);
  return Object.freeze({availability: 'AVAILABLE', eventDatetimeUtc: eventDatetime.value,
    moonLongitudeDeg: longitudeDeg, ageDays});
}

/**
 * Inject genuinely sourced astronomical facts and keep their provenance
 * explicitly caller-asserted. An unavailable lunation leaves only dependent
 * Arabic parts unavailable; unresolved sect is a hard error.
 */
export function calculateRegoloLotsFromAstronomicalFacts(input) {
  fields(input, ['datetimeUtc', 'observer', 'expectedEphemeris',
    'natal', 'sunHorizon', 'precedingNewMoon'], [], 'INVALID_ARGUMENT');
  const datetime = validUtc(input.datetimeUtc);
  const observer = observerFrom(input.observer);
  const pin = expectedPin(input.expectedEphemeris);
  fields(input.natal, NATAL_REQUIRED, NATAL_OPTIONAL, 'INVALID_NATAL_CHART');
  if (input.natal.zodiac !== 'TROPICAL') {
    fail('UNSUPPORTED_ZODIAC', 'Astronomical Regolo bridge is tropical-only pending sidereal position validation');
  }
  const horizon = sunSect(input.sunHorizon, datetime.value, observer, pin);
  const newMoon = precedingNewMoonFrom(input.precedingNewMoon, datetime, pin);
  // Explicitly reconstruct only allowed fields so an application-provided
  // sect cannot override the validated horizon decision.
  const natal = {
    birthTimeKnown: input.natal.birthTimeKnown,
    zodiac: input.natal.zodiac,
    chartContextId: input.natal.chartContextId,
    ascendantLongitudeDeg: input.natal.ascendantLongitudeDeg,
    planetsLongitudeDeg: input.natal.planetsLongitudeDeg,
  };
  for (const key of NATAL_OPTIONAL) {
    if (Object.hasOwn(input.natal, key)) natal[key] = input.natal[key];
  }
  const core = {...natal, sect: horizon.sect};
  if (newMoon.availability === 'AVAILABLE') core.newMoonLongitudeDeg = newMoon.moonLongitudeDeg;
  const kleroi = calculateRegoloKleroi(core);
  const arabicParts = calculateRegoloArabicParts(core);
  return Object.freeze({contract: 'RegoloLotsAstronomyBridgeResult',
    contractVersion: '0.1.0-experimental', datetimeUtc: datetime.value,
    observer, expectedEphemeris: pin, sect: horizon.sect, horizon,
    precedingNewMoon: newMoon, kleroi, arabicParts,
    scientificEvidence: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    warnings: Object.freeze([
      'SUN_HORIZON_AND_EPHEMERIS_ORIGIN_CALLER_ASSERTED_NOT_VERIFIED',
      'NATAL_POSITIONS_ASCENDANT_AND_FRAME_CALLER_ASSERTED',
      'LATEST_PRECEDING_NEW_MOON_EVENT_SELECTION_NOT_INDEPENDENTLY_VERIFIED',
    ])});
}
