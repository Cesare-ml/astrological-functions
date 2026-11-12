/**
 * Isolated fact-only transits. Ephemeris calculations are owned by Rust.
 * Requires two previously computed, compatible apparent-of-date snapshots.
 */
import { AstrologyError, calculateCrossAspects } from './index.mjs';

const VERSION = '0.1.0-experimental';
const PROVENANCE = ['engineVersion', 'kernelSetId', 'timeModel'];

function record(value, code, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AstrologyError(code, message);
  return value;
}
function utc(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}
function readChart(chart, label) {
  record(chart, 'INVALID_CHART', `${label} must be a chart snapshot`);
  if (chart.contract !== 'NatalChartResult' || chart.contractVersion !== VERSION)
    throw new AstrologyError('INVALID_CHART', `${label} must have a supported experimental chart contract`);
  if (!utc(chart.datetimeUtc))
    throw new AstrologyError('INVALID_UTC', `${label} requires a valid UTC instant`);
  record(chart.bodies, 'INVALID_CHART', `${label} requires a named bodies map`);
  const provenance = record(chart.ephemerisProvenance, 'MISSING_PROVENANCE', `${label} requires pinned ephemeris provenance`);
  const snapshot = Object.create(null);
  for (const key of PROVENANCE) {
    if (typeof provenance[key] !== 'string' || !provenance[key].trim())
      throw new AstrologyError('MISSING_PROVENANCE', `${label} provenance ${key} must be nonempty`);
    snapshot[key] = provenance[key];
  }
  return Object.freeze({ datetimeUtc: chart.datetimeUtc, provenance: Object.freeze(snapshot), bodies: chart.bodies });
}
function choosePoints(chart, selected, label) {
  if (!Array.isArray(selected) || selected.length < 1 || selected.length > 32)
    throw new AstrologyError('INVALID_BODIES', `${label} requires 1..32 explicitly selected bodies`);
  const names = Array.from(selected);
  if (names.some(name => typeof name !== 'string' || !name.trim()) || new Set(names).size !== names.length)
    throw new AstrologyError('INVALID_BODIES', `${label} body names must be unique and nonempty`);
  const points = [];
  for (const name of names) {
    if (!Object.hasOwn(chart.bodies, name))
      throw new AstrologyError('INVALID_BODIES', `${label} body ${name} is unavailable`);
    const body = record(chart.bodies[name], 'INVALID_POINT', `${label} body must be an object`);
    if (body.name !== name || typeof body.longitudeDeg !== 'number' || !Number.isFinite(body.longitudeDeg))
      throw new AstrologyError('INVALID_POINT', `${label} body name/longitude is invalid`);
    const metadata = record(body.ephemerisMetadata, 'INCOMPATIBLE_EPHEMERIS', `${label} body needs ephemeris metadata`);
    if (metadata.center !== 'EARTH' || metadata.frame !== 'ECLIPTIC_OF_DATE' || metadata.corrections !== 'APPARENT' ||
      PROVENANCE.some(key => metadata[key] !== chart.provenance[key]))
      throw new AstrologyError('INCOMPATIBLE_EPHEMERIS', `${label} body has incompatible ephemeris provenance`);
    points.push(Object.freeze({ name, longitudeDeg: body.longitudeDeg, type: 'body' }));
  }
  return Object.freeze({ names: Object.freeze(names), points: Object.freeze(points) });
}

/**
 * SKY_TO_NATAL facts only; requires an explicitly known natal birth instant.
 * No house placement, astronomical computation, interpretation or implicit orbs.
 */
export function calculateTransitToNatal(input) {
  record(input, 'INVALID_ARGUMENT', 'Transit calculation options must be an object');
  if (input.birthTimeKnown !== true)
    throw new AstrologyError('BIRTH_TIME_REQUIRED', 'A known natal birth instant is required; unknown-time transits need a separate uncertainty model');
  const natal = readChart(input.natalChart, 'natal');
  const sky = readChart(input.skyChart, 'sky');
  if (PROVENANCE.some(key => natal.provenance[key] !== sky.provenance[key]))
    throw new AstrologyError('INCOMPATIBLE_EPHEMERIS', 'Natal and sky snapshots must share engine, kernel and time model');
  const targets = choosePoints(natal, input.natalBodyNames, 'natal');
  const sources = choosePoints(sky, input.skyBodyNames, 'sky');
  if (!Array.isArray(input.aspectDefinitions))
    throw new AstrologyError('INVALID_ARGUMENT', 'Explicit aspectDefinitions array required (empty is allowed)');
  const aspects = calculateCrossAspects({
    direction: 'SKY_TO_NATAL', sourcePoints: sources.points,
    targetPoints: targets.points, aspectDefinitions: Array.from(input.aspectDefinitions)
  });
  return Object.freeze({
    contract: 'TransitToNatalFacts', contractVersion: VERSION, direction: 'SKY_TO_NATAL',
    natalDatetimeUtc: natal.datetimeUtc, skyDatetimeUtc: sky.datetimeUtc,
    birthTimeKnown: true, timeReliability: 'KNOWN_BIRTH_INSTANT',
    ephemerisProvenance: natal.provenance,
    selectedSkyBodyNames: sources.names, selectedNatalBodyNames: targets.names,
    aspects, houses: null, angles: null, warnings: Object.freeze([])
  });
}
