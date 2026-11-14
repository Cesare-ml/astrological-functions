/**
 * Directional transit-to-natal aspect facts from supplied apparent-of-date
 * positions. This module does not compute astronomy or astrological meanings.
 */
import { AstrologyError, calculateCrossAspects, normalize360 } from './index.mjs';

function fail(code, message) { throw new AstrologyError(code, message); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function nonempty(value) { return typeof value === 'string' && value.trim().length > 0 && value === value.trim(); }

function utc(value, label) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19))
    fail('INVALID_UTC', `${label} requires a valid explicit UTC instant ending Z`);
  return value;
}

function zodiac(input) {
  if (!record(input) || !['TROPICAL', 'SIDEREAL'].includes(input.type))
    fail('INVALID_ZODIAC', 'Explicit tropical or sidereal zodiac is required');
  if (input.type === 'SIDEREAL') {
    if (!nonempty(input.ayanamsaId))
      fail('INVALID_ZODIAC', 'Sidereal zodiac requires a named ayanamsa version');
    return Object.freeze({type:'SIDEREAL', ayanamsaId:input.ayanamsaId});
  }
  if (Object.hasOwn(input, 'ayanamsaId'))
    fail('INVALID_ZODIAC', 'Tropical zodiac must not claim an ayanamsa');
  return Object.freeze({type:'TROPICAL'});
}

function provenance(input) {
  if (!record(input) || input.center !== 'EARTH' ||
      input.frame !== 'ECLIPTIC_OF_DATE' || input.corrections !== 'APPARENT' ||
      !['engineVersion', 'kernelSetId', 'timeModel'].every(k => nonempty(input[k])))
    fail('INCOMPATIBLE_EPHEMERIS',
      'Pinned apparent Earth-centered ecliptic-of-date ephemeris provenance required');
  return Object.freeze({
    engineVersion:input.engineVersion, kernelSetId:input.kernelSetId,
    timeModel:input.timeModel, center:'EARTH',
    frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT'
  });
}

function points(input, label) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 32)
    fail('INVALID_POINTS', `${label} requires 1..32 body points`);
  const seen = new Set();
  const values = Array.from(input, (p) => {
    if (!record(p) || !nonempty(p.name) ||
        (p.type !== undefined && p.type !== 'body') ||
        typeof p.longitudeDeg !== 'number' || !Number.isFinite(p.longitudeDeg))
      fail('INVALID_POINTS', `${label} requires named finite-longitude body points`);
    if (seen.has(p.name)) fail('INVALID_POINTS', `${label} contains duplicate point IDs`);
    seen.add(p.name);
    if (p.longitudeSpeedDegPerDay !== undefined && p.longitudeSpeedDegPerDay !== null &&
        (typeof p.longitudeSpeedDegPerDay !== 'number' || !Number.isFinite(p.longitudeSpeedDegPerDay)))
      fail('INVALID_POINTS', `${label} longitude speed must be finite or null`);
    return Object.freeze({
      name:p.name, type:'body', longitudeDeg:normalize360(p.longitudeDeg),
      longitudeSpeedDegPerDay:p.longitudeSpeedDegPerDay ?? null
    });
  });
  return Object.freeze(values);
}

function snapshot(input, label) {
  if (!record(input)) fail('INVALID_ARGUMENT', `${label} snapshot is required`);
  return Object.freeze({
    datetimeUtc:utc(input.datetimeUtc, label),
    zodiac:zodiac(input.zodiac),
    ephemeris:provenance(input.ephemeris),
    points:points(input.points, label)
  });
}

function definitions(input) {
  if (!Array.isArray(input))
    fail('INVALID_ASPECT', 'Explicit aspectDefinitions array required (empty is permitted)');
  const seen = new Set();
  return Object.freeze(Array.from(input, (d) => {
    if (!record(d) || !nonempty(d.id) ||
        typeof d.angleDeg !== 'number' || !Number.isFinite(d.angleDeg) ||
        typeof d.maxOrbDeg !== 'number' || !Number.isFinite(d.maxOrbDeg) ||
        d.angleDeg < 0 || d.angleDeg > 180 ||
        d.maxOrbDeg < 0 || d.maxOrbDeg > 180)
      fail('INVALID_ASPECT', 'Aspect requires a unique ID, angle 0..180 and orb 0..180');
    if (seen.has(d.id)) fail('INVALID_ASPECT', 'Aspect IDs must be unique');
    seen.add(d.id);
    return Object.freeze({id:d.id, angleDeg:d.angleDeg, maxOrbDeg:d.maxOrbDeg});
  }));
}

/**
 * All inputs are positions from a separately validated astronomical provider.
 * Unknown birth time is deliberately unsupported here: callers must use an
 * explicitly uncertainty-aware workflow rather than a false exact snapshot.
 */
export function calculateTransitFacts(input) {
  if (!record(input)) fail('INVALID_ARGUMENT', 'Transit facts input must be an object');
  if (input.birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'Exact natal transit comparisons require a known birth instant');
  const natal = snapshot(input.natal, 'natal');
  const sky = snapshot(input.sky, 'sky');
  if (natal.zodiac.type !== sky.zodiac.type ||
      natal.zodiac.ayanamsaId !== sky.zodiac.ayanamsaId)
    fail('INCOMPATIBLE_ZODIAC', 'Natal and sky positions must use the same zodiac and ayanamsa');
  for (const key of ['engineVersion', 'kernelSetId', 'timeModel']) {
    if (natal.ephemeris[key] !== sky.ephemeris[key])
      fail('INCONSISTENT_EPHEMERIS', 'Natal and sky ephemeris versions, kernels and time models must match');
  }
  const aspectDefinitions = definitions(input.aspectDefinitions);
  const aspects = calculateCrossAspects({
    direction:'SKY_TO_NATAL', sourcePoints:sky.points,
    targetPoints:natal.points, aspectDefinitions
  });
  return Object.freeze({
    contract:'TransitAspectFactsResult', contractVersion:'0.1.0-experimental',
    direction:'SKY_TO_NATAL', birthTimeKnown:true,
    natal, sky, aspectDefinitions, aspects,
    houseMode:'UNAVAILABLE', angles:null,
    interpretation:'FACTS_ONLY', warnings:Object.freeze([])
  });
}
