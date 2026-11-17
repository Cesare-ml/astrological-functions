/**
 * Three distinct experimental quadrant geometries: Campanus, Alcabitius and
 * Polich-Page. Geometric angles, ARMC, obliquity, location and the time model
 * are injected; this module does no astronomy or ephemeris calculations.
 *
 * Specification: Astrodienst, Swiss Ephemeris manual, §6.2.4, §6.2.10–11.
 * This is an independent geometric formulation, not a port of Swiss code.
 */
import { AstrologyError, normalize360, signedAngularDistance, locateLongitudeInHouses } from './index.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { expectedRisingAscendantDeg } from './house-ascendant-orientation.mjs';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const KEYS = new Set([
  'datetimeUtc', 'birthTimeKnown', 'ascendantDeg', 'midheavenDeg',
  'armcDeg', 'trueObliquityDeg', 'angleModel', 'source',
]);
const fail = (code, message) => { throw new AstrologyError(code, message); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const identifier = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 128 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
const opposite = longitude => normalize360(longitude + 180);

// Ecliptic longitude whose right ascension is the caller-supplied RA.
function eclipticAtRightAscension(raDeg, epsilon) {
  const ra = raDeg * RAD;
  return normalize360(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsilon)) * DEG);
}

function rightAscension(longitudeDeg, epsilon) {
  const longitude = longitudeDeg * RAD;
  return normalize360(Math.atan2(
    Math.sin(longitude) * Math.cos(epsilon), Math.cos(longitude),
  ) * DEG);
}

// Ecliptic intersection of the great circle with the horizon north/south
// points and an equatorial RA direction at an adjustable polar height.
function intersectHorizonPoles(raDeg, polarHeight, epsilon) {
  const ra = raDeg * RAD;
  const x = Math.sin(epsilon) * Math.tan(polarHeight) + Math.cos(epsilon) * Math.sin(ra);
  const y = -Math.cos(ra);
  if (Math.hypot(x, y) < 1e-13) fail('DEGENERATE_HOUSE_GEOMETRY', 'Undefined ecliptic intersection');
  return normalize360(Math.atan2(y, x) * DEG + 180);
}

function validated(input) {
  if (!plain(input) || Object.keys(input).some(key => !KEYS.has(key)))
    fail('INVALID_DIURNAL_INPUT', 'A plain house request with only supported keys is required');
  if (input.birthTimeKnown === false) fail('BIRTH_TIME_UNKNOWN', 'Known birth time is required');
  if (input.birthTimeKnown !== true) fail('INVALID_DIURNAL_INPUT', 'birthTimeKnown must be explicitly true');
  if (!finite(input.armcDeg) || !finite(input.trueObliquityDeg) ||
      input.trueObliquityDeg <= 0 || input.trueObliquityDeg >= 90)
    fail('INVALID_ANGLES', 'Finite ARMC and physical true obliquity are required');
  if (!identifier(input.angleModel)) fail('INVALID_ANGLE_MODEL', 'A versioned angle-model identifier is required');

  // Reuse the existing provenance, UTC and axis-order contract; this does
  // not reuse Porphyry trisection as a substitute for any of these methods.
  const base = calculatePorphyryHouseCusps(input);
  const armcDeg = normalize360(input.armcDeg);
  const epsilon = input.trueObliquityDeg * RAD;
  const latitude = base.source.observer.latitudeDeg * RAD;
  const expectedMc = eclipticAtRightAscension(armcDeg, epsilon);
  const expectedAsc = expectedRisingAscendantDeg(armcDeg,
    input.trueObliquityDeg, base.source.observer.latitudeDeg);
  if (Math.abs(signedAngularDistance(base.angles.midheavenDeg, expectedMc)) > 1e-6 ||
      Math.abs(signedAngularDistance(base.angles.ascendantDeg, expectedAsc)) > 1e-6)
    fail('INCONSISTENT_ANGLES', 'ASC and MC must agree with ARMC, latitude and obliquity');
  return Object.freeze({base, armcDeg, epsilon, latitude, angleModel: input.angleModel,
    trueObliquityDeg: input.trueObliquityDeg});
}

function finish(model, houseSystem, cusps, details) {
  // ASC/IC/DSC/MC are checked before being copied into the result. Methods
  // valid only in reversed/polar order are rejected instead of silently
  // substituting Porphyry or misusing the forward 12-cusp position locator.
  const {ascendantDeg: asc, icDeg: ic, descendantDeg: dsc, midheavenDeg: mc} = model.base.angles;
  cusps[0] = asc;
  cusps[3] = ic;
  cusps[6] = dsc;
  cusps[9] = mc;
  const cuspsDeg = Object.freeze(cusps.map(normalize360));
  try {
    locateLongitudeInHouses(cuspsDeg[0], cuspsDeg);
  } catch (error) {
    if (error instanceof AstrologyError && error.code === 'INVALID_CUSPS')
      fail('HOUSE_GEOMETRY_UNAVAILABLE', 'Cusp geometry is not one forward zodiac revolution');
    throw error;
  }
  return Object.freeze({
    contract: 'DiurnalHouseCusps', contractVersion: '0.1.0-experimental', houseSystem,
    datetimeUtc: model.base.datetimeUtc, birthTimeKnown: true,
    armcDeg: model.armcDeg, trueObliquityDeg: model.trueObliquityDeg,
    angleModel: model.angleModel, angles: model.base.angles,
    source: model.base.source, cuspsDeg,
    geometry: details.geometry,
    ascendantSemidiurnalArcDeg: details.ascendantSemidiurnalArcDeg ?? null,
    polarHeightsDeg: details.polarHeightsDeg ?? null,
    interpretation: 'FACTS_ONLY',
    validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  });
}

/**
 * Campanus: trisect each 90° quadrant on the prime vertical, construct house
 * circles through the north/south horizon points, intersect with ecliptic.
 */
export function calculateCampanusHouseCusps(input) {
  const model = validated(input);
  const theta = model.armcDeg * RAD;
  const latitude = model.latitude;
  const east = [-Math.sin(theta), Math.cos(theta), 0];
  const zenith = [
    Math.cos(latitude) * Math.cos(theta),
    Math.cos(latitude) * Math.sin(theta),
    Math.sin(latitude),
  ];
  const north = [
    -Math.sin(latitude) * Math.cos(theta),
    -Math.sin(latitude) * Math.sin(theta),
    Math.cos(latitude),
  ];
  const cusps = Array.from({length: 12}, (_, i) => {
    const a = -i * 30 * RAD;
    const point = east.map((value, j) => Math.cos(a) * value + Math.sin(a) * zenith[j]);
    const normal = [
      north[1] * point[2] - north[2] * point[1],
      north[2] * point[0] - north[0] * point[2],
      north[0] * point[1] - north[1] * point[0],
    ];
    return normalize360(Math.atan2(
      -normal[0],
      normal[1] * Math.cos(model.epsilon) + normal[2] * Math.sin(model.epsilon),
    ) * DEG);
  });
  return finish(model, 'CAMPANUS', cusps, {geometry: 'PRIME_VERTICAL_TRISECTION'});
}

/**
 * Alcabitius: the Ascendant's semi-diurnal and semi-nocturnal equatorial
 * arcs are trisected, then intersect the ecliptic at those right ascensions.
 */
export function calculateAlcabitiusHouseCusps(input) {
  const model = validated(input);
  const asc = model.base.angles.ascendantDeg * RAD;
  const declination = Math.asin(Math.sin(model.epsilon) * Math.sin(asc));
  const cosHour = -Math.tan(model.latitude) * Math.tan(declination);
  if (!(cosHour > -1 && cosHour < 1))
    fail('ASCENDANT_ARC_UNAVAILABLE', 'Ascendant must have finite rising and setting semiarcs');
  const diurnal = Math.acos(cosHour) * DEG;
  const nocturnal = 180 - diurnal;
  const ascRa = rightAscension(model.base.angles.ascendantDeg, model.epsilon);
  if (Math.abs(signedAngularDistance(ascRa, normalize360(model.armcDeg + diurnal))) > 1e-6)
    fail('INCONSISTENT_ANGLES', 'Ascendant RA must match its supplied rising semiarc');
  const theta = model.armcDeg;
  const ras = [
    ascRa, ascRa + nocturnal / 3, ascRa + 2 * nocturnal / 3, theta + 180,
    theta + 180 + diurnal / 3, theta + 180 + 2 * diurnal / 3,
    ascRa + 180, ascRa + 180 + nocturnal / 3, ascRa + 180 + 2 * nocturnal / 3,
    theta, theta + diurnal / 3, theta + 2 * diurnal / 3,
  ];
  return finish(model, 'ALCABITIUS', ras.map(ra => eclipticAtRightAscension(ra, model.epsilon)), {
    geometry: 'ASCENDANT_SEMIARCS_TRISECTED_IN_RIGHT_ASCENSION',
    ascendantSemidiurnalArcDeg: diurnal,
  });
}

/**
 * Polich-Page: house-circle polar heights are atan(tan(latitude)/3) for
 * 11/3, and atan(2*tan(latitude)/3) for 12/2 (not Regiomontanus heights).
 */
export function calculatePolichPageHouseCusps(input) {
  const model = validated(input);
  const tangent = Math.tan(model.latitude);
  const pole11 = Math.atan(tangent / 3);
  const pole12 = Math.atan(2 * tangent / 3);
  const intersect = (offset, pole) => intersectHorizonPoles(
    model.armcDeg + offset, pole, model.epsilon,
  );
  const c11 = intersect(-60, pole11), c12 = intersect(-30, pole12);
  const c2 = intersect(30, pole12), c3 = intersect(60, pole11);
  return finish(model, 'POLICH_PAGE', [
    model.base.angles.ascendantDeg, c2, c3, model.base.angles.icDeg,
    opposite(c11), opposite(c12), model.base.angles.descendantDeg,
    opposite(c2), opposite(c3), model.base.angles.midheavenDeg, c11, c12,
  ], {
    geometry: 'TOPOCENTRIC_POLAR_HEIGHT_THIRDS',
    polarHeightsDeg: Object.freeze([pole11 * DEG, pole12 * DEG]),
  });
}
