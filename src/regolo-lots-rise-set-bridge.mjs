/**
 * Experimental Regolo lot calculation from VirgoStars-Ephemeris Node's
 * Engine.riseTransUt API. This module does not compute solar astronomy,
 * authenticate an injected engine, or invent a preceding new Moon.
 *
 * Solar sect here follows the APPARENT REFRACTED DISC CENTRE crossing, not
 * first/last visibility of the disc and not a caller-supplied solar altitude.
 */
import { AstrologyError, normalize360 } from './index.mjs';
import { calculateRegoloKleroi } from './regolo-kleroi.mjs';
import { calculateRegoloArabicParts } from './regolo-arabic-parts.mjs';

const PIN_KEYS = ['engineId', 'engineVersion', 'kernelSetId', 'timeModelId'];
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const OBSERVER_KEYS = ['latitudeDeg', 'longitudeDegEast', 'elevationMeters'];
const NATAL_KEYS = ['birthTimeKnown', 'zodiac', 'chartContextId',
  'ascendantLongitudeDeg', 'planetsLongitudeDeg'];
const NATAL_OPTIONAL = ['houseCuspsDeg', 'midheavenLongitudeDeg', 'descendantLongitudeDeg'];
const UTC_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/;
const UNIX_EPOCH_JD = 2440587.5;
const SE_SUN = 0;
const SE_CALC_RISE = 1;
const SE_CALC_SET = 2;
const SE_BIT_DISC_CENTER = 256;
const SEARCH_DAYS = 3;

function fail(code, message) { throw new AstrologyError(code, message); }

function record(value, required, optional = [], code = 'INVALID_ARGUMENT') {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    fail(code, 'Missing, inherited, or unexpected fields');
  }
}

function utc(value) {
  const match = typeof value === 'string' ? UTC_PATTERN.exec(value) : null;
  const milliseconds = match ? Date.parse(value) : NaN;
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !==
      `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`) {
    fail('INVALID_UTC', 'Real UTC date/time with seconds and explicit Z required');
  }
  return Object.freeze({value: new Date(milliseconds).toISOString(), milliseconds});
}

function source(value) {
  record(value, PIN_KEYS, [], 'INVALID_EPHEMERIS_PIN');
  if (value.engineId !== 'VIRGOSTARS_EPHEMERIS' || PIN_KEYS.slice(1).some(key =>
    typeof value[key] !== 'string' || !IDENTIFIER.test(value[key]))) {
    fail('INVALID_EPHEMERIS_PIN', 'A complete VirgoStars-Ephemeris source pin is required');
  }
  return Object.freeze({...value});
}

function observer(value) {
  record(value, OBSERVER_KEYS, [], 'INVALID_OBSERVER');
  if (!OBSERVER_KEYS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key])) ||
      Math.abs(value.latitudeDeg) > 90 || Math.abs(value.longitudeDegEast) > 180 ||
      value.elevationMeters < -500 || value.elevationMeters > 10000) {
    fail('INVALID_OBSERVER', 'Finite WGS84 observer coordinates and elevation required');
  }
  return Object.freeze({...value});
}

function newMoonFact(event, birth, pin) {
  if (event?.availability === 'UNAVAILABLE') {
    record(event, ['availability', 'reason'], [], 'INVALID_LUNATION');
    if (!['NOT_COMPUTED', 'OUT_OF_RANGE', 'NON_CONVERGENT'].includes(event.reason)) {
      fail('INVALID_LUNATION', 'Unsupported explicit unavailability reason');
    }
    return Object.freeze({...event});
  }
  const keys = [...PIN_KEYS, 'availability', 'relation', 'eventDatetimeUtc',
    'moonLongitudeDeg', 'center', 'frame', 'corrections', 'zodiac', 'warnings'];
  record(event, keys, [], 'INVALID_LUNATION');
  if (!PIN_KEYS.every(key => event[key] === pin[key]) ||
      event.availability !== 'AVAILABLE' ||
      event.relation !== 'LATEST_PRECEDING_NEW_MOON' || event.center !== 'EARTH' ||
      event.frame !== 'ECLIPTIC_OF_DATE' || event.corrections !== 'APPARENT' ||
      event.zodiac !== 'TROPICAL' || !Array.isArray(event.warnings) ||
      event.warnings.length !== 0) {
    fail('INCOMPATIBLE_LUNATION_SOURCE', 'Pinned tropical apparent new Moon required');
  }
  const eventTime = utc(event.eventDatetimeUtc);
  const ageDays = (birth.milliseconds - eventTime.milliseconds) / 86400000;
  if (ageDays < 0 || ageDays > 31) {
    fail('INCOMPATIBLE_LUNATION_EPOCH', 'Lunation must precede birth by at most 31 days');
  }
  return Object.freeze({availability: 'AVAILABLE', eventDatetimeUtc: eventTime.value,
    moonLongitudeDeg: normalize360(event.moonLongitudeDeg), ageDays});
}

function eventCursor(engine, startJdUt, birthJdUt, flag, geographic, weather) {
  let cursor = startJdUt;
  let last = null;
  let next = null;
  let exhausted = true;
  for (let count = 0; count < 16; count += 1) {
    let event;
    try {
      event = engine.riseTransUt(cursor, SE_SUN, flag | SE_BIT_DISC_CENTER,
        geographic.longitudeDegEast, geographic.latitudeDeg, geographic.elevationMeters,
        weather.pressureHpa, weather.temperatureC, SEARCH_DAYS);
    } catch (cause) {
      fail('EPHEMERIS_EVENT_FAILURE', `Solar event provider failed: ${String(cause?.code ?? cause?.message ?? cause)}`);
    }
    if (event === null) { exhausted = false; break; }
    if (typeof event !== 'number' || !Number.isFinite(event) ||
        event < cursor - 1e-9 || event > cursor + SEARCH_DAYS + 1e-9) {
      fail('INVALID_EPHEMERIS_EVENT', 'Provider returned an impossible rise/set instant');
    }
    if (event > birthJdUt) {
      next = event;
      exhausted = false;
      break;
    }
    if (last !== null && event <= last) {
      fail('INVALID_EPHEMERIS_EVENT', 'Solar event search did not progress');
    }
    last = event;
    // One UT second protects against providers that return the same root
    // when a new search begins at the previous event's exact instant.
    cursor = event + 1 / 86400;
  }
  if (exhausted) {
    fail('INVALID_EPHEMERIS_EVENT', 'Solar event search exceeded its iteration budget');
  }
  return Object.freeze({last, next});
}

/**
 * Resolve Sun-centre sect using the actual Engine.riseTransUt signature. The
 * engine object and source pin are injected, not cryptographically verified.
 * Birth UTC is explicitly converted to UT1 by the caller's asserted offset.
 */
export function calculateRegoloLotsFromVirgoStarsRiseSet(input) {
  record(input, ['datetimeUtc', 'ut1MinusUtcSeconds', 'observer', 'expectedEphemeris',
    'natal', 'precedingNewMoon', 'solarModel', 'engine']);
  const birth = utc(input.datetimeUtc);
  const pin = source(input.expectedEphemeris);
  const geographic = observer(input.observer);
  record(input.natal, NATAL_KEYS, NATAL_OPTIONAL, 'INVALID_NATAL_CHART');
  if (input.natal.zodiac !== 'TROPICAL') fail('UNSUPPORTED_ZODIAC', 'Only tropical charts validated');
  if (input.natal.birthTimeKnown !== true) fail('BIRTH_TIME_REQUIRED', 'Known birth time required');
  record(input.solarModel, ['pressureHpa', 'temperatureC', 'boundaryUncertaintySeconds'],
    [], 'INVALID_SOLAR_MODEL');
  const weather = input.solarModel;
  if (![weather.pressureHpa, weather.temperatureC, weather.boundaryUncertaintySeconds,
    input.ut1MinusUtcSeconds].every(value => typeof value === 'number' && Number.isFinite(value)) ||
      weather.pressureHpa < 0 || weather.pressureHpa > 1100 ||
      weather.temperatureC < -90 || weather.temperatureC > 60 ||
      weather.boundaryUncertaintySeconds < 1 || weather.boundaryUncertaintySeconds > 300 ||
      Math.abs(input.ut1MinusUtcSeconds) > 1) {
    fail('INVALID_SOLAR_MODEL', 'Explicit, bounded atmosphere, UT1 offset and uncertainty required');
  }
  if (!input.engine || typeof input.engine.riseTransUt !== 'function') {
    fail('INVALID_EPHEMERIS_PROVIDER', 'Injected VirgoStars Engine.riseTransUt function required');
  }
  const moon = newMoonFact(input.precedingNewMoon, birth, pin);
  const birthJdUt = UNIX_EPOCH_JD +
    (birth.milliseconds + input.ut1MinusUtcSeconds * 1000) / 86400000;
  const firstSearchJdUt = birthJdUt - 2.25;
  const rise = eventCursor(input.engine, firstSearchJdUt, birthJdUt, SE_CALC_RISE,
    geographic, weather);
  const set = eventCursor(input.engine, firstSearchJdUt, birthJdUt, SE_CALC_SET,
    geographic, weather);
  if (rise.last === null || set.last === null || rise.last === set.last) {
    fail('SECT_UNAVAILABLE', 'Recent paired sunrise and sunset unavailable (possibly polar conditions)');
  }
  const nearest = Math.min(...[rise.last, rise.next, set.last, set.next]
    .filter(value => value !== null).map(value => Math.abs(value - birthJdUt) * 86400));
  if (nearest <= weather.boundaryUncertaintySeconds) {
    fail('AMBIGUOUS_SECT', 'Birth falls within the uncertain Sun-centre horizon crossing');
  }
  const sect = rise.last > set.last ? 'DAY' : 'NIGHT';
  const natal = {...input.natal, sect};
  if (moon.availability === 'AVAILABLE') natal.newMoonLongitudeDeg = moon.moonLongitudeDeg;
  const kleroi = calculateRegoloKleroi(natal);
  const arabicParts = calculateRegoloArabicParts(natal);
  const solarEvents = Object.freeze({
    lastRiseJdUt: rise.last, lastSetJdUt: set.last,
    nextRiseJdUt: rise.next, nextSetJdUt: set.next,
    nearestBoundarySeconds: nearest,
    model: 'APPARENT_REFRACTED_SUN_DISC_CENTRE',
    pressureHpa: weather.pressureHpa, temperatureC: weather.temperatureC,
    boundaryUncertaintySeconds: weather.boundaryUncertaintySeconds,
    ut1MinusUtcSeconds: input.ut1MinusUtcSeconds,
  });
  return Object.freeze({contract: 'RegoloLotsRiseSetBridgeResult',
    contractVersion: '0.1.0-experimental', datetimeUtc: birth.value,
    observer: geographic, expectedEphemeris: pin, sect, solarEvents,
    precedingNewMoon: moon, kleroi, arabicParts,
    scientificEvidence: 'INJECTED_EPHEMERIS_ENGINE_NOT_AUTHENTICATED',
    warnings: Object.freeze([
      'ENGINE_ID_VERSION_KERNEL_AND_UT1_OFFSET_CALLER_ASSERTED',
      'NATAL_POSITIONS_ASCENDANT_AND_FRAME_CALLER_ASSERTED',
      'PRECEDING_NEW_MOON_SELECTION_NOT_INDEPENDENTLY_VERIFIED',
      'NO_TERRAIN_OR_LOCAL_OBSTRUCTION_MODEL',
    ])});
}
