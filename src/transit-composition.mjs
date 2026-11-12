/**
 * Experimental F4 orchestration: provider sky positions -> SKY_TO_NATAL facts.
 * It does not provide or validate astronomical position algorithms.
 */
import { AstrologyError } from './index.mjs';
import { calculateTransitFacts } from './transit-facts.mjs';
import { getTransitSkySnapshotWithProvider } from './transit-provider.mjs';

function fail(code, message) { throw new AstrologyError(code, message); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

function nonempty(value) { return typeof value === 'string' && value.trim().length > 0 && value.trim() === value; }
function validUtc(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}
function checkedZodiac(value) {
  if (!record(value)) fail('INVALID_ZODIAC', 'Explicit tropical or sidereal zodiac required');
  if (value.type === 'TROPICAL' && !Object.hasOwn(value, 'ayanamsaId'))
    return Object.freeze({type:'TROPICAL'});
  if (value.type === 'SIDEREAL' && nonempty(value.ayanamsaId))
    return Object.freeze({type:'SIDEREAL', ayanamsaId:value.ayanamsaId});
  fail('INVALID_ZODIAC', 'Tropical zodiac must omit ayanamsa; sidereal needs a named version');
}
function checkedEphemeris(value) {
  if (!record(value) || value.center !== 'EARTH' || value.frame !== 'ECLIPTIC_OF_DATE' ||
      value.corrections !== 'APPARENT' ||
      !['engineVersion','kernelSetId','timeModel'].every(key => nonempty(value[key])))
    fail('INCOMPATIBLE_EPHEMERIS', 'Pinned apparent-of-date Earth-centered ephemeris required');
  return Object.freeze({center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
    engineVersion:value.engineVersion, kernelSetId:value.kernelSetId, timeModel:value.timeModel});
}

/** Validate and snapshot the full natal contract before any provider I/O. */
function cloneNatal(value) {
  if (!record(value) || !record(value.zodiac) || !record(value.ephemeris) ||
      !Array.isArray(value.points))
    fail('INVALID_NATAL', 'Explicit natal UTC, zodiac, provenance and body points required');
  if (!validUtc(value.datetimeUtc)) fail('INVALID_UTC', 'Valid explicit natal UTC instant required');
  const zodiac = checkedZodiac(value.zodiac);
  const ephemeris = checkedEphemeris(value.ephemeris);
  if (value.points.length < 1 || value.points.length > 32)
    fail('INVALID_POINTS', 'Natal requires 1..32 body points');
  const seen = new Set();
  const points = Object.freeze(Array.from(value.points, point => {
    if (!record(point)) fail('INVALID_NATAL', 'Natal points must be objects');
    if (!nonempty(point.name) || (point.type !== undefined && point.type !== 'body') ||
        typeof point.longitudeDeg !== 'number' || !Number.isFinite(point.longitudeDeg) ||
        (point.longitudeSpeedDegPerDay != null &&
         (typeof point.longitudeSpeedDegPerDay !== 'number' || !Number.isFinite(point.longitudeSpeedDegPerDay))))
      fail('INVALID_POINTS', 'Natal body requires a unique ID, finite longitude and optional finite speed');
    if (seen.has(point.name)) fail('INVALID_POINTS', 'Natal body IDs must be unique');
    seen.add(point.name);
    return Object.freeze({name:point.name, type:point.type, longitudeDeg:point.longitudeDeg,
      longitudeSpeedDegPerDay:point.longitudeSpeedDegPerDay});
  }));
  return Object.freeze({datetimeUtc:value.datetimeUtc, zodiac, ephemeris, points});
}
function selectNatalPoints(natal, names) {
  if (names === undefined) return natal;
  if (!Array.isArray(names) || names.length < 1 || names.length > 32)
    fail('INVALID_BODIES', 'Explicit natal selection requires 1..32 unique named bodies');
  const seen = new Set();
  const pointsByName = new Map(natal.points.map(point => [point.name, point]));
  const selected = Object.freeze(Array.from(names, name => {
    if (!nonempty(name) || seen.has(name))
      fail('INVALID_BODIES', 'Selected natal body IDs must be unique and nonempty');
    seen.add(name);
    const point = pointsByName.get(name);
    if (!point) fail('INVALID_BODIES', 'Selected natal body is absent from validated natal snapshot');
    return point;
  }));
  return Object.freeze({...natal, points:selected});
}
function cloneRules(value) {
  if (!Array.isArray(value)) fail('INVALID_ASPECT', 'Explicit aspectDefinitions array required');
  const seen = new Set();
  return Object.freeze(Array.from(value, rule => {
    if (!record(rule) || !nonempty(rule.id) ||
        typeof rule.angleDeg !== 'number' || !Number.isFinite(rule.angleDeg) ||
        typeof rule.maxOrbDeg !== 'number' || !Number.isFinite(rule.maxOrbDeg) ||
        rule.angleDeg < 0 || rule.angleDeg > 180 ||
        rule.maxOrbDeg < 0 || rule.maxOrbDeg > 180)
      fail('INVALID_ASPECT', 'Aspect ID, angle and orb must be explicit finite values within 0..180');
    if (seen.has(rule.id)) fail('INVALID_ASPECT', 'Aspect IDs must be unique');
    seen.add(rule.id);
    return Object.freeze({id:rule.id, angleDeg:rule.angleDeg, maxOrbDeg:rule.maxOrbDeg});
  }));
}

/**
 * Snapshots all natal data and aspect rules before the first awaited provider
 * call. Provider verification status is deliberately NOT lost when composing
 * ordinary (astronomy-agnostic) aspect facts.
 */
export async function calculateTransitFactsWithProvider(input) {
  if (!record(input)) fail('INVALID_ARGUMENT', 'Explicit composition input required');
  if (input.birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'Exact natal transit facts require an explicitly known birth time');
  const natal = selectNatalPoints(cloneNatal(input.natal), input.natalBodyNames);
  const aspectDefinitions = cloneRules(input.aspectDefinitions);
  const skyZodiac = checkedZodiac(input.zodiac);
  const expectedEphemeris = checkedEphemeris(input.expectedEphemeris);
  if (natal.zodiac.type !== skyZodiac.type ||
      natal.zodiac.ayanamsaId !== skyZodiac.ayanamsaId)
    fail('INCOMPATIBLE_ZODIAC', 'Natal and sky require the same zodiac and ayanamsa');
  if (['engineVersion','kernelSetId','timeModel'].some(k => natal.ephemeris[k] !== expectedEphemeris[k]))
    fail('INCONSISTENT_EPHEMERIS', 'Natal and sky must use the same engine/kernel/time model');
  // Capture all inputs before invoking a potentially reentrant async provider.
  const providerInput = Object.freeze({
    datetimeUtc:input.datetimeUtc, zodiac:skyZodiac,
    bodyNames:input.bodyNames, expectedEphemeris,
    provider:input.provider
  });
  const obtained = await getTransitSkySnapshotWithProvider(providerInput);
  const facts = calculateTransitFacts({birthTimeKnown:true,
    natal, sky:obtained.sky, aspectDefinitions});
  return Object.freeze({
    contract:'TransitFactsWithProviderResult', contractVersion:'0.1.0-experimental',
    status:obtained.status,
    facts,
    warnings:Object.freeze(obtained.warnings.map(w => Object.freeze({code:w.code,message:w.message})))
  });
}
