/**
 * Original pure mathematical implementations of Pullen's Sinusoidal Delta
 * and Sinusoidal Ratio house-width definitions, using supplied Porphyry axes.
 * No Swiss code, astronomical position calculation or ephemeris fallback.
 * Method descriptions: Walter Pullen's published width relationships, as
 * documented in Astrodienst's house-system reference, section 6.2.6.
 */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';

const INPUT_KEYS = new Set(['datetimeUtc', 'birthTimeKnown', 'ascendantDeg', 'midheavenDeg', 'source']);
const EPS = 1e-12;
const fail = (code, message) => { throw new AstrologyError(code, message); };

function prepare(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input) ||
      (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) ||
      Object.keys(input).some(key => !INPUT_KEYS.has(key))) {
    fail('INVALID_PULLEN_INPUT', 'An explicit plain request with supported fields is required');
  }
  if (input.birthTimeKnown === false) fail('BIRTH_TIME_UNKNOWN', 'Known birth time is required for angle-based houses');
  if (input.birthTimeKnown !== true) fail('INVALID_PULLEN_INPUT', 'birthTimeKnown must be explicitly true');
  const {datetimeUtc, ascendantDeg, midheavenDeg, source} = input;
  return calculatePorphyryHouseCusps({datetimeUtc, ascendantDeg, midheavenDeg, source});
}

/**
 * Delta widths: [30+d/4, 30+d/2, 30+d/4] for quadrant q=90+d.
 * When q<=30, the middle house is explicitly zero-width and the two
 * neighboring houses each occupy q/2. Never invent a negative house span.
 */
function deltaWidths(q) {
  const middle = 30 + (q - 90) / 2;
  if (middle <= EPS) return [q / 2, 0, q / 2];
  const side = (q - middle) / 2;
  return [side, middle, side];
}

/** Opposite-sized adjacent quadrants have widths (r*x,x,r*x) and
 * (r^3*x,r^4*x,r^3*x). Solve the resulting monotone ratio for r>=1.
 * Bracketing and bisection use bounded iterations and explicit failure.
 */
function solveRatio(q) {
  const smaller = Math.min(q, 180 - q);
  const larger = 180 - smaller;
  if (!(smaller > 0 && larger > 0)) fail('DEGENERATE_QUADRANTS', 'Both quadrant sizes must be positive');
  const target = larger / smaller;
  if (target === 1) return 1;
  const ratio = r => (r * r * r * (r + 2)) / (2 * r + 1);
  let lower = 1;
  let upper = 2;
  for (let n = 0; ratio(upper) < target && n < 64; n++) upper *= 2;
  if (!Number.isFinite(upper) || ratio(upper) < target)
    fail('PULLEN_NONCONVERGENCE', 'Unable to bracket a finite sinusoidal ratio');
  for (let n = 0; n < 80; n++) {
    const middle = lower + (upper - lower) / 2;
    if (ratio(middle) < target) lower = middle;
    else upper = middle;
  }
  return lower + (upper - lower) / 2;
}

function ratioWidths(q) {
  const r = solveRatio(q);
  // The large quadrant uses r^3*x, r^4*x, r^3*x; the small one
  // uses r*x, x, r*x. Algebraic division avoids large intermediate powers.
  const side = q >= 90 ? q / (2 + r) : q * r / (1 + 2 * r);
  return [side, q - 2 * side, side];
}

function calculate(input, houseSystem, widthsForQuadrant) {
  const porphyry = prepare(input);
  const widthsDeg = [];
  const cuspsDeg = [];
  for (let quadrant = 0; quadrant < 4; quadrant++) {
    const anchor = porphyry.cuspsDeg[quadrant * 3];
    const span = porphyry.quadrantSpansDeg[quadrant];
    const widths = widthsForQuadrant(span);
    if (widths.length !== 3 || widths.some(width => !Number.isFinite(width) || width < 0) ||
        Math.abs(widths.reduce((a, b) => a + b, 0) - span) > 1e-9) {
      fail('INVALID_PULLEN_WIDTHS', 'House widths must be nonnegative and sum to the source quadrant');
    }
    widthsDeg.push(...widths);
    cuspsDeg.push(anchor, normalize360(anchor + widths[0]),
      normalize360(anchor + widths[0] + widths[1]));
  }
  const frozenCusps = Object.freeze(cuspsDeg);
  const frozenWidths = Object.freeze(widthsDeg);
  const zeroWidthHouseNumbers = Object.freeze(widthsDeg.flatMap((width, index) =>
    width === 0 ? [index + 1] : []));
  if (zeroWidthHouseNumbers.length === 0) {
    locateLongitudeInHouses(frozenCusps[0], frozenCusps);
  }
  return Object.freeze({
    contract: 'PullenHouseCusps', contractVersion: '0.1.0-experimental', houseSystem,
    datetimeUtc: porphyry.datetimeUtc, birthTimeKnown: true,
    angles: porphyry.angles, source: porphyry.source,
    quadrantSpansDeg: porphyry.quadrantSpansDeg,
    cuspsDeg: frozenCusps, widthsDeg: frozenWidths, zeroWidthHouseNumbers,
    placementPolicy: zeroWidthHouseNumbers.length === 0
      ? 'STANDARD_HALF_OPEN_CUSPS'
      : 'ZERO_WIDTH_REQUIRES_EXPLICIT_METHOD',
    interpretation: 'FACTS_ONLY',
    validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  });
}

export function calculatePullenSinusoidalDeltaHouseCusps(input) {
  return calculate(input, 'PULLEN_SD', deltaWidths);
}

export function calculatePullenSinusoidalRatioHouseCusps(input) {
  return calculate(input, 'PULLEN_SR', ratioWidths);
}
