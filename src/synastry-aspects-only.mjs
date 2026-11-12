/**
 * Experimental aspects-only synastry for explicit supplied UTC snapshots.
 * No house/angle geometry or astronomical ephemeris is computed here.
 */
import { AstrologyError, calculateCrossAspects, normalize360 } from './index.mjs';

const PROVENANCE_KEYS = Object.freeze(['engineVersion', 'kernelSetId', 'timeModel']);

function snapshotChart(chart, names, label) {
  if (!chart || typeof chart !== 'object' || Array.isArray(chart) ||
      chart.contract !== 'NatalChartResult' ||
      chart.contractVersion !== '0.1.0-experimental' ||
      !chart.bodies || typeof chart.bodies !== 'object' || Array.isArray(chart.bodies))
    throw new AstrologyError('INVALID_CHART', `${label} requires an experimental natal snapshot`);

  const instant = chart.datetimeUtc;
  if (typeof instant !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(instant) ||
      !Number.isFinite(Date.parse(instant)) ||
      new Date(instant).toISOString().slice(0, 19) !== instant.slice(0, 19))
    throw new AstrologyError('INVALID_UTC', `${label} requires a valid explicit UTC instant`);

  const metadata = chart.ephemerisProvenance;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) ||
      PROVENANCE_KEYS.some(key => typeof metadata[key] !== 'string' || !metadata[key].trim()))
    throw new AstrologyError('INVALID_CHART_PROVENANCE', `${label} must have complete engine/kernel/time model provenance`);

  if (!Array.isArray(names) || names.length === 0 || names.length > 32)
    throw new AstrologyError('INVALID_BODIES', `${label} requires 1..32 explicitly selected bodies`);
  // Array.from visits holes. Names are identifiers, not a silent all-body default.
  const requested = Array.from(names, name => {
    if (typeof name !== 'string' || !name.trim() ||
        !Object.hasOwn(chart.bodies, name))
      throw new AstrologyError('INVALID_BODIES', `${label} contains an unknown/invalid body selection`);
    return name;
  });
  if (new Set(requested).size !== requested.length)
    throw new AstrologyError('INVALID_BODIES', `${label} body selections must be unique`);

  const points = requested.map(name => {
    const body = chart.bodies[name];
    if (!body || typeof body !== 'object' || Array.isArray(body) || body.name !== name ||
        typeof body.longitudeDeg !== 'number' || !Number.isFinite(body.longitudeDeg))
      throw new AstrologyError('INVALID_POINT', `${label} has an invalid selected body`);
    return Object.freeze({name, longitudeDeg:normalize360(body.longitudeDeg)});
  });
  return Object.freeze({
    datetimeUtc: instant,
    ephemerisProvenance: Object.freeze(Object.fromEntries(PROVENANCE_KEYS.map(key => [key,metadata[key]]))),
    selectedBodyNames: Object.freeze(requested),
    points: Object.freeze(points),
  });
}

function checkBirthTime(known, basis, label) {
  if (known !== true && known !== false)
    throw new AstrologyError('INVALID_TIME_BASIS', `${label} requires an explicit birthTimeKnown boolean`);
  if (known && basis !== 'KNOWN_BIRTH_INSTANT')
    throw new AstrologyError('INVALID_TIME_BASIS', `${label} known birth time requires KNOWN_BIRTH_INSTANT`);
  if (!known && basis !== 'REPRESENTATIVE_INSTANT')
    throw new AstrologyError('INVALID_TIME_BASIS', `${label} unknown birth time requires REPRESENTATIVE_INSTANT`);
}

/**
 * Aspects-only mode permits unknown birth times but never claims that the
 * assumed timestamp matches the actual birth instant. The caller explicitly
 * chooses which astronomical bodies to include for each chart.
 */
export function calculateSynastryAspectsOnly(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Synastry options must be an object');
  const {
    chartA, chartB, birthTimeKnownA, birthTimeKnownB,
    positionBasisA, positionBasisB, selectedBodyNamesA, selectedBodyNamesB,
    aspectDefinitions,
  } = input;

  // Do not accept house contexts on an aspects-only result: even for known
  // times, no house assignment or angular claim is calculated in this mode.
  if (Object.hasOwn(input, 'cuspSetA') || Object.hasOwn(input, 'cuspSetB'))
    throw new AstrologyError('UNSUPPORTED_HOUSE_PLACEMENT', 'Aspects-only mode does not accept house cusp data');
  checkBirthTime(birthTimeKnownA, positionBasisA, 'chartA');
  checkBirthTime(birthTimeKnownB, positionBasisB, 'chartB');

  const a = snapshotChart(chartA, selectedBodyNamesA, 'chartA');
  const b = snapshotChart(chartB, selectedBodyNamesB, 'chartB');
  if (!Array.isArray(aspectDefinitions))
    throw new AstrologyError('INVALID_ARGUMENT', 'Explicit aspect definitions array required');

  // The cross-aspect engine validates every rule, including sparse entries,
  // angle/orb ranges and unique IDs. Freeze a defensive pre-calculation copy.
  const definitions = Object.freeze(Array.from(aspectDefinitions, definition =>
    Object.freeze({
      id: definition?.id, angleDeg: definition?.angleDeg,
      maxOrbDeg: definition?.maxOrbDeg,
    })
  ));
  const aToB = Object.freeze({
    direction:'A_TO_B', houseOverlays:null,
    aspects:calculateCrossAspects({
      direction:'A_TO_B', sourcePoints:a.points,
      targetPoints:b.points, aspectDefinitions:definitions,
    }),
  });
  const bToA = Object.freeze({
    direction:'B_TO_A', houseOverlays:null,
    aspects:calculateCrossAspects({
      direction:'B_TO_A', sourcePoints:b.points,
      targetPoints:a.points, aspectDefinitions:definitions,
    }),
  });
  const warnings = Object.freeze([
    ...(birthTimeKnownA ? [] : [Object.freeze({
      code:'UNKNOWN_BIRTH_TIME', chart:'A',
      message:'A uses a representative UTC instant; aspects may change over the actual birth-time interval.',
    })]),
    ...(birthTimeKnownB ? [] : [Object.freeze({
      code:'UNKNOWN_BIRTH_TIME', chart:'B',
      message:'B uses a representative UTC instant; aspects may change over the actual birth-time interval.',
    })]),
  ]);

  return Object.freeze({
    contract:'SynastryAspectsOnlyResult',
    contractVersion:'0.1.0-experimental',
    houseMode:'UNAVAILABLE',
    angles:null,
    timeReliability:warnings.length ? 'PROVISIONAL' : 'SUPPLIED_INSTANTS',
    timeBasis: Object.freeze({
      A:Object.freeze({birthTimeKnown:birthTimeKnownA,positionBasis:positionBasisA,datetimeUtc:a.datetimeUtc}),
      B:Object.freeze({birthTimeKnown:birthTimeKnownB,positionBasis:positionBasisB,datetimeUtc:b.datetimeUtc}),
    }),
    provenance: Object.freeze({A:a.ephemerisProvenance,B:b.ephemerisProvenance}),
    selectedBodyNames: Object.freeze({A:a.selectedBodyNames,B:b.selectedBodyNames}),
    aspectDefinitions:definitions,
    warnings,aToB,bToA,
  });
}
