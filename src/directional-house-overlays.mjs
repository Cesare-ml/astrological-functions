/**
 * Isolated, astronomy-free synastry house overlays between two natal charts.
 * An overlay uses the SOURCE body's longitude in the TARGET chart's houses.
 * Cusp astronomy is supplied externally and must match the target context.
 */
import {
  AstrologyError, normalize360, locateLongitudeWithHousePolicy,
  validateHouseCuspContext,
} from './index.mjs';

const PROVENANCE_KEYS = Object.freeze(['engineVersion', 'kernelSetId', 'timeModel']);

function chartSnapshot(chart, label) {
  if (!chart || typeof chart !== 'object' || Array.isArray(chart) ||
      chart.contract !== 'NatalChartResult' || chart.contractVersion !== '0.1.0-experimental' ||
      !chart.bodies || typeof chart.bodies !== 'object' || Array.isArray(chart.bodies))
    throw new AstrologyError('INVALID_CHART', `${label} must be an experimental natal result`);
  if (typeof chart.datetimeUtc !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(chart.datetimeUtc) ||
      !Number.isFinite(Date.parse(chart.datetimeUtc)) ||
      new Date(chart.datetimeUtc).toISOString().slice(0,19) !== chart.datetimeUtc.slice(0,19))
    throw new AstrologyError('INVALID_CHART', `${label} requires a valid UTC chart instant`);
  const metadata = chart.ephemerisProvenance;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) ||
      PROVENANCE_KEYS.some(key => typeof metadata[key] !== 'string' || !metadata[key].trim()))
    throw new AstrologyError('INVALID_CHART_PROVENANCE', `${label} needs complete ephemeris provenance`);
  const points = Object.entries(chart.bodies);
  if (points.length === 0 || points.length > 32)
    throw new AstrologyError('INVALID_CHART', `${label} must contain 1..32 bodies`);
  return Object.freeze({
    chart,
    provenance: Object.freeze(Object.fromEntries(PROVENANCE_KEYS.map(key => [key, metadata[key]]))),
    points: Object.freeze(points.map(([name, body]) => {
      if (!name.trim() || !body || typeof body !== 'object' || Array.isArray(body) ||
          body.name !== name || typeof body.longitudeDeg !== 'number' ||
          !Number.isFinite(body.longitudeDeg))
        throw new AstrologyError('INVALID_POINT', `${label} has an invalid body`);
      return Object.freeze({ name, longitudeDeg: normalize360(body.longitudeDeg) });
    })),
  });
}

/**
 * @param {object} input Explicit natal charts A/B, birth-time flags, direction,
 * and the externally computed house cusp set for the target chart.
 *
 * Requires both birth times to be known to avoid presenting unverified
 * source longitudes as precise natal positions. Never computes house cusps.
 * SKY_TO_NATAL is intentionally excluded: this is a synastry-only contract.
 */
export function calculateDirectionalHouseOverlays(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Overlay options must be an object');
  const { direction, chartA, chartB, birthTimeKnownA, birthTimeKnownB, cuspSetA, cuspSetB } = input;
  if (direction !== 'A_TO_B' && direction !== 'B_TO_A')
    throw new AstrologyError('INVALID_DIRECTION', 'Only A_TO_B or B_TO_A synastry overlays are supported');
  if (birthTimeKnownA !== true || birthTimeKnownB !== true)
    throw new AstrologyError('BIRTH_TIME_REQUIRED', 'Both birth times must be explicitly known');

  const a = chartSnapshot(chartA, 'chartA');
  const b = chartSnapshot(chartB, 'chartB');
  const forward = direction === 'A_TO_B';
  const source = forward ? a : b;
  const target = forward ? b : a;
  const targetCuspSet = forward ? cuspSetB : cuspSetA;
  // The target's time/location/ephemeris/kernel must match the cusp set.
  // Historical houses_pos and unsupported methods fail closed upstream.
  const validated = validateHouseCuspContext({ chart: target.chart, cuspSet: targetCuspSet });
  const placements = Object.freeze(source.points.map(point => Object.freeze({
    bodyName: point.name,
    longitudeDeg: point.longitudeDeg,
    ...locateLongitudeWithHousePolicy({
      longitudeDeg: point.longitudeDeg,
      cusps: validated.cusps,
      houseSystem: validated.houseSystem,
      calculationProfile: validated.calculationProfile,
      placementMethod: validated.placementMethod,
    }),
  })));

  return Object.freeze({
    contract: 'DirectionalHouseOverlayResult',
    contractVersion: '0.1.0-experimental',
    direction,
    sourceChart: forward ? 'A' : 'B',
    targetChart: forward ? 'B' : 'A',
    sourceDatetimeUtc: source.chart.datetimeUtc,
    targetDatetimeUtc: target.chart.datetimeUtc,
    sourceEphemerisProvenance: source.provenance,
    targetCuspMetadata: validated.metadata,
    houseSystem: validated.houseSystem,
    calculationProfile: validated.calculationProfile,
    placementMethod: validated.placementMethod,
    placements,
  });
}
