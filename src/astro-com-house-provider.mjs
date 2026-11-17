/**
 * Opt-in adapter between a pinned, externally supplied house-angle provider
 * and the 24 isolated Astro.com house methods. No sidereal time, ephemeris,
 * obliquity, ayanamsa or Sun position is computed in this module.
 */
import { AstrologyError } from './index.mjs';
import { ASTRO_COM_HOUSE_SYSTEM_IDS, calculateAstroComHouseMethod } from './astro-com-house-selector.mjs';

const ERROR = (code, message) => { throw new AstrologyError(code, message); };
const EXPECTED_MODEL = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
const INPUT_KEYS = new Set(['houseSystem', 'datetimeUtc', 'birthTimeKnown',
  'ut1JulianDay', 'ttJulianDay', 'latitudeDeg', 'longitudeDegEast', 'expectedProvider', 'sun']);
const IDENTITIES = ['engineVersion', 'kernelSetId', 'timeModel'];
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 128 &&
  value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);

function utc(value) {
  const match = typeof value === 'string'
    ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value)
    : null;
  const milliseconds = match ? Date.parse(value) : NaN;
  const canonical = match ? `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z` : '';
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== canonical) {
    ERROR('INVALID_UTC', 'A real UTC instant with explicit seconds (up to milliseconds) is required');
  }
  return { datetimeUtc: new Date(milliseconds).toISOString(), milliseconds };
}

function validateRequest(request, provider) {
  if (!plain(request) || Object.keys(request).some(key => !INPUT_KEYS.has(key))) {
    ERROR('INVALID_HOUSE_PROVIDER_REQUEST', 'A plain request with only known fields is required');
  }
  if (!ASTRO_COM_HOUSE_SYSTEM_IDS.includes(request.houseSystem)) {
    ERROR('UNSUPPORTED_HOUSE_SYSTEM', 'An explicit canonical Astro.com house method is required');
  }
  if (request.birthTimeKnown !== true) {
    ERROR('BIRTH_TIME_REQUIRED', 'The provider-backed house path requires a known birth time');
  }
  const date = utc(request.datetimeUtc);
  const {ut1JulianDay, ttJulianDay, latitudeDeg, longitudeDegEast} = request;
  if (![ut1JulianDay, ttJulianDay, latitudeDeg, longitudeDegEast].every(Number.isFinite) ||
      Math.abs(latitudeDeg) >= 90 || Math.abs(longitudeDegEast) > 180) {
    ERROR('INVALID_HOUSE_PROVIDER_REQUEST', 'Explicit finite UT1/TT and nonpolar observer coordinates are required');
  }
  // Modern-instant coherency only: these are ASSERTIONS, not UTC->UT1/TT conversions.
  const utcJulianDay = date.milliseconds / 86400000 + 2440587.5;
  if (Math.abs(ut1JulianDay - utcJulianDay) * 86400 > 2 ||
      Math.abs(ttJulianDay - utcJulianDay) > 1) {
    ERROR('INCOHERENT_EPOCH', 'UT1 must match UTC within two seconds and TT must belong to the same day');
  }
  if (!plain(request.expectedProvider) ||
      Object.keys(request.expectedProvider).some(key => !IDENTITIES.includes(key)) ||
      !IDENTITIES.every(key => identifier(request.expectedProvider[key]))) {
    ERROR('INCOMPATIBLE_ANGLE_SOURCE', 'Pin engineVersion, kernelSetId and timeModel explicitly');
  }
  if (request.houseSystem === 'SUNSHINE') {
    if (!plain(request.sun)) ERROR('INCOMPATIBLE_SUN_SOURCE', 'Sunshine requires an externally sourced apparent Sun declination');
  } else if (Object.hasOwn(request, 'sun')) {
    ERROR('INVALID_HOUSE_PROVIDER_REQUEST', 'Only Sunshine accepts a Sun declination source');
  }
  if (provider === null || (typeof provider !== 'object' && typeof provider !== 'function') ||
      typeof provider.calculateHouseAngles !== 'function') {
    ERROR('INVALID_HOUSE_PROVIDER', 'An explicit external calculateHouseAngles provider is required');
  }
  return date.datetimeUtc;
}

function verifyAngles(angles, input) {
  if (!plain(angles) || angles.model !== EXPECTED_MODEL ||
      angles.ut1JulianDay !== input.ut1JulianDay ||
      angles.ttJulianDay !== input.ttJulianDay ||
      angles.latitudeDeg !== input.latitudeDeg ||
      angles.longitudeDegEast !== input.longitudeDegEast ||
      !IDENTITIES.every(key => angles[key] === input.expectedProvider[key]) ||
      !['armcDeg', 'ascendantDeg', 'midheavenDeg', 'trueObliquityDeg'].every(key =>
        Number.isFinite(angles[key])) ||
      angles.trueObliquityDeg <= 0 || angles.trueObliquityDeg >= 90) {
    ERROR('INCOMPATIBLE_ANGLE_SOURCE',
      'House angles must match the pinned model, provider identity, observer and UT1/TT epoch');
  }
  return Object.freeze({ model: EXPECTED_MODEL,
    engineVersion: angles.engineVersion, kernelSetId: angles.kernelSetId,
    timeModel: angles.timeModel, ut1JulianDay: angles.ut1JulianDay,
    ttJulianDay: angles.ttJulianDay, latitudeDeg: angles.latitudeDeg,
    longitudeDegEast: angles.longitudeDegEast, armcDeg: angles.armcDeg,
    ascendantDeg: angles.ascendantDeg, midheavenDeg: angles.midheavenDeg,
    trueObliquityDeg: angles.trueObliquityDeg });
}

function methodInput(houseSystem, request, angleSource, datetimeUtc) {
  const {ascendantDeg, midheavenDeg, armcDeg, trueObliquityDeg} = angleSource;
  const {latitudeDeg, longitudeDegEast, expectedProvider} = request;
  const source = Object.freeze({ ...expectedProvider, center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE', corrections: 'IAU2006_2000B_APPROXIMATE',
    zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
    observer: Object.freeze({latitudeDeg, longitudeDegEast}) });
  const base = {datetimeUtc, ascendantDeg, midheavenDeg, source};
  const withTime = {...base, birthTimeKnown: true};
  const withSidereal = {...withTime, armcDeg, trueObliquityDeg};
  const geometry = {...withSidereal, angleModel: angleSource.model};
  const zodiac = {datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis: {type: 'TROPICAL'}};
  switch (houseSystem) {
    case 'PORPHYRY': case 'SRIPATI': return base;
    case 'PULLEN_SD': case 'PULLEN_SR': return withTime;
    case 'PLACIDUS': case 'KOCH': case 'REGIOMONTANUS': return withSidereal;
    case 'VEHLOW': return {...withTime, profile: 'VEHLOW_ASC_CENTERED_V1'};
    case 'EQUAL_ASCENDANT': return {...zodiac, ascendantLongitudeDeg: ascendantDeg};
    case 'EQUAL_MIDHEAVEN': return {...zodiac, birthTimeKnown: true,
      midheavenLongitudeDeg: midheavenDeg};
    case 'WHOLE_SIGN': return {...zodiac, birthTimeKnown: true,
      ascendantLongitudeDeg: ascendantDeg};
    case 'WHOLE_ARIES': return zodiac;
    case 'MERIDIAN': return {datetimeUtc, birthTimeKnown: true, armcDeg,
      trueObliquityDeg, angleModel: angleSource.model, source, midheavenDeg};
    case 'MORINUS': return {datetimeUtc, birthTimeKnown: true, armcDeg,
      trueObliquityDeg, angleModel: angleSource.model, source};
    case 'CARTER_POLI_EQUATORIAL': return {datetimeUtc, birthTimeKnown: true, armcDeg,
      trueObliquityDeg, angleModel: angleSource.model, source, ascendantDeg};
    case 'SUNSHINE': return {...geometry, sun: request.sun};
    case 'CAMPANUS': case 'ALCABITIUS': case 'POLICH_PAGE':
    case 'KRUSINSKI_PISA_GOELZER': case 'AZIMUTH': case 'APC':
    case 'GAUQUELIN_36': case 'ALBATEGNIUS': return geometry;
    default: ERROR('UNSUPPORTED_HOUSE_SYSTEM', 'No explicit provider mapping for this method');
  }
}

/**
 * Provider call may be synchronous or asynchronous. The adapter never guesses
 * missing angles, changes method, substitutes polar cusps or queries Swiss.
 */
export async function calculateAstroComHouseFromProvider(request, provider) {
  const datetimeUtc = validateRequest(request, provider);
  const {ut1JulianDay, ttJulianDay, latitudeDeg, longitudeDegEast} = request;
  const geometry = await provider.calculateHouseAngles({ut1JulianDay, ttJulianDay,
    latitudeDeg, longitudeDegEast});
  const angleSource = verifyAngles(geometry, request);
  const result = calculateAstroComHouseMethod({houseSystem: request.houseSystem,
    input: methodInput(request.houseSystem, request, angleSource, request.datetimeUtc)});
  return Object.freeze({contract: 'AstroComProviderHouseResult',
    contractVersion: '0.1.0-experimental', datetimeUtc,
    houseSystem: request.houseSystem, angleSource, result,
    validation: 'CALLER_ASSERTED_PROVIDER_NOT_INDEPENDENTLY_VERIFIED'});
}
