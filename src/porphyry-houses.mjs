/**
 * Traditional Porphyry quadrant trisection from externally supplied angles.
 * No sidereal-time, horizon, ecliptic or ephemeris astronomy is computed here.
 */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nonempty = value => typeof value === 'string' && value === value.trim() && value.length > 0;
const fail = (code, message) => { throw new AstrologyError(code, message); };

function validateUtc(value) {
  const match = typeof value === 'string'
    ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value)
    : null;
  const date = match ? Date.parse(value) : NaN;
  const canonical = match ? `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z` : '';
  if (!Number.isFinite(date) || new Date(date).toISOString() !== canonical) {
    fail('INVALID_UTC', 'Explicit real UTC datetime with seconds (at most milliseconds) required');
  }
  return new Date(date).toISOString();
}

function validateSource(source) {
  if (!record(source) || !nonempty(source.engineVersion) ||
      !nonempty(source.kernelSetId) || !nonempty(source.timeModel) ||
      source.frame !== 'ECLIPTIC_OF_DATE' || source.zodiac !== 'TROPICAL' ||
      source.observerType !== 'TOPOCENTRIC' ||
      !record(source.observer) || !finite(source.observer.latitudeDeg) ||
      !finite(source.observer.longitudeDegEast) ||
      Math.abs(source.observer.latitudeDeg) >= 90 ||
      Math.abs(source.observer.longitudeDegEast) > 180) {
    fail('INCOMPATIBLE_ANGLE_SOURCE', 'Pinned tropical ecliptic-of-date topocentric angle source at a nonpolar observer is required');
  }
  return Object.freeze({
    engineVersion: source.engineVersion,
    kernelSetId: source.kernelSetId,
    timeModel: source.timeModel,
    frame: 'ECLIPTIC_OF_DATE',
    zodiac: 'TROPICAL',
    observerType: 'TOPOCENTRIC',
    observer: Object.freeze({
      latitudeDeg: source.observer.latitudeDeg,
      longitudeDegEast: source.observer.longitudeDegEast,
    }),
  });
}

/**
 * Returns houses 1, 4, 7 and 10 on ASC, IC, DSC and MC, respectively.
 * Each forward zodiac quadrant is trisected into equal ecliptic arcs.
 */
export function calculatePorphyryHouseCusps(input) {
  if (!record(input)) fail('INVALID_INPUT', 'Porphyry input object is required');
  const datetimeUtc = validateUtc(input.datetimeUtc);
  if (!finite(input.ascendantDeg) || !finite(input.midheavenDeg)) {
    fail('INVALID_ANGLES', 'Finite Ascendant and Midheaven ecliptic longitudes required');
  }
  const source = validateSource(input.source);
  const asc = normalize360(input.ascendantDeg);
  const mc = normalize360(input.midheavenDeg);
  const ic = normalize360(mc + 180);
  const dsc = normalize360(asc + 180);
  const axes = [asc, ic, dsc, mc];
  const arcs = axes.map((start, i) => normalize360(axes[(i + 1) % 4] - start));
  // Trisection is only well-defined under the usual forward ordered axes.
  // Polar or otherwise inverted/degenerate angle geometries must fail closed.
  if (arcs.some(arc => arc <= 1e-9 || arc >= 180 - 1e-9)) {
    fail('DEGENERATE_QUADRANTS', 'Axes must produce four nondegenerate forward zodiac quadrants');
  }
  const cusps = [];
  for (let quadrant = 0; quadrant < 4; quadrant++) {
    for (let k = 0; k < 3; k++) {
      cusps.push(normalize360(axes[quadrant] + arcs[quadrant] * k / 3));
    }
  }
  const frozenCusps = Object.freeze(cusps);
  // Reuse the existing, tested house-ordering contract instead of
  // implementing a separate overlapping interval-placement algorithm.
  locateLongitudeInHouses(asc, frozenCusps);
  return Object.freeze({
    contract: 'PorphyryHouseCusps',
    contractVersion: '0.1.0-experimental',
    houseSystem: 'PORPHYRY',
    datetimeUtc,
    angles: Object.freeze({ascendantDeg: asc, icDeg: ic, descendantDeg: dsc, midheavenDeg: mc}),
    cuspsDeg: frozenCusps,
    quadrantSpansDeg: Object.freeze(arcs),
    source,
    interpretation: 'FACTS_ONLY',
    validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  });
}
