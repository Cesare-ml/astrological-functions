/**
 * Explicit ascendant-centred equal-house (Vehlow) geometric convention.
 * Not an astronomical ASC solver or an automatic legacy 'egizia' adapter.
 */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';

const fail = (code, message) => { throw new AstrologyError(code, message); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const identifier = value => typeof value === 'string' && value.length > 0 && value.trim() === value;

function parseUtc(value) {
  const match = typeof value === 'string'
    ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value)
    : null;
  const parsed = match ? Date.parse(value) : NaN;
  const canonical = match ? `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z` : '';
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== canonical) {
    fail('INVALID_UTC', 'A real ISO UTC instant with seconds and up to 3 fractional digits is required');
  }
  return new Date(parsed).toISOString();
}

function copySource(source) {
  if (!record(source)) fail('INCOMPATIBLE_ANGLE_SOURCE', 'A source object is required');
  const { engineVersion, kernelSetId, timeModel, frame, corrections, center, zodiac, observerType, observer } = source;
  if (!record(observer)) fail('INCOMPATIBLE_ANGLE_SOURCE', 'An observer object is required');
  const { latitudeDeg, longitudeDegEast } = observer;
  if (!identifier(engineVersion) || !identifier(kernelSetId) || !identifier(timeModel) ||
      frame !== 'ECLIPTIC_OF_DATE' || corrections !== 'APPARENT' || center !== 'EARTH' ||
      zodiac !== 'TROPICAL' || observerType !== 'TOPOCENTRIC' ||
      !finite(latitudeDeg) || !finite(longitudeDegEast) ||
      Math.abs(latitudeDeg) >= 90 || Math.abs(longitudeDegEast) > 180) {
    fail('INCOMPATIBLE_ANGLE_SOURCE', 'Require versioned apparent tropical ecliptic-of-date Earth topocentric source');
  }
  return Object.freeze({
    engineVersion,
    kernelSetId,
    timeModel,
    center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE',
    corrections: 'APPARENT',
    zodiac: 'TROPICAL',
    observerType: 'TOPOCENTRIC',
    observer: Object.freeze({
      latitudeDeg,
      longitudeDegEast,
    }),
  });
}

/**
 * Build 12 equal 30-degree house intervals with ASC at the midpoint of house 1.
 * This API is opt-in only and does not imply parity with legacy houses_pos.
 */
export function calculateVehlowHouseCusps(input) {
  if (!record(input)) fail('INVALID_INPUT', 'Explicit Vehlow house input required');
  const { profile, birthTimeKnown, datetimeUtc: datetime, ascendantDeg: ascendant, source: inputSource } = input;
  if (profile !== 'VEHLOW_ASC_CENTERED_V1') {
    fail('INVALID_HOUSE_PROFILE', 'Explicit VEHLOW_ASC_CENTERED_V1 is required');
  }
  if (birthTimeKnown !== true) {
    fail('BIRTH_TIME_REQUIRED', 'Ascendant-centred houses require known birth time');
  }
  const datetimeUtc = parseUtc(datetime);
  if (!finite(ascendant) || ascendant < 0 || ascendant > 360) {
    fail('INVALID_ASCENDANT', 'The validated Ascendant must be within [0, 360] degrees');
  }
  const source = copySource(inputSource);
  const ascendantDeg = normalize360(ascendant);
  const cusp1Deg = normalize360(ascendantDeg - 15);
  const cuspsDeg = Object.freeze(Array.from({ length: 12 }, (_, index) =>
    normalize360(cusp1Deg + index * 30)));
  // The existing house placement primitive sets exact-cusp ownership.
  const ascendantPlacement = locateLongitudeInHouses(ascendantDeg, cuspsDeg);
  if (ascendantPlacement.house !== 1) {
    fail('INVALID_CUSPS', 'Ascendant must lie within the first house');
  }
  return Object.freeze({
    contract: 'VehlowHouseCusps',
    contractVersion: '0.1.0-experimental',
    houseSystem: 'VEHLOW',
    profile: 'VEHLOW_ASC_CENTERED_V1',
    datetimeUtc,
    birthTimeKnown: true,
    ascendantDeg,
    cusp1Deg,
    cuspsDeg,
    source,
    interpretation: 'FACTS_ONLY',
    validation: 'CALLER_ASSERTED_ASCENDANT_NOT_INDEPENDENTLY_VERIFIED',
    legacyCompatibility: 'NOT_ESTABLISHED',
  });
}
