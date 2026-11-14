/** Experimental Placidus semi-arc cusp geometry from caller-supplied angles. */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';

const rad = Math.PI / 180;
const fail = (code, message) => { throw new AstrologyError(code, message); };
const signed = x => ((x + 540) % 360) - 180;

/**
 * Divide the rising-to-culmination and rising-to-lower-culmination arcs
 * into thirds. Inputs use degrees and caller-asserted tropical of-date
 * source metadata; no sidereal-time or time-scale conversion is performed.
 * The polar circle and nonconvergent or inconsistent geometry fail closed.
 */
export function calculatePlacidusHouseCusps(input) {
  if (!input || typeof input !== 'object') fail('INVALID_INPUT', 'Explicit Placidus inputs are required');
  const {armcDeg, trueObliquityDeg, datetimeUtc, ascendantDeg, midheavenDeg, source, birthTimeKnown} = input;
  if (birthTimeKnown !== true) fail('BIRTH_TIME_REQUIRED', 'Placidus houses require a known birth time');
  if (!Number.isFinite(armcDeg) || !Number.isFinite(trueObliquityDeg) || trueObliquityDeg <= 0 || trueObliquityDeg >= 90) {
    fail('INVALID_ANGLES', 'Finite ARMC and physical true obliquity are required');
  }
  const base = calculatePorphyryHouseCusps({datetimeUtc, ascendantDeg, midheavenDeg, source});
  const latitude = base.source.observer.latitudeDeg * rad;
  const epsilon = trueObliquityDeg * rad;
  if (Math.abs(Math.tan(latitude) * Math.tan(epsilon)) >= 1) {
    fail('POLAR_HOUSES_UNAVAILABLE', 'Placidus is not available at or beyond the polar circle');
  }
  const theta = normalize360(armcDeg);
  const sample = longitude => {
    const lambda = longitude * rad;
    const alpha = normalize360(Math.atan2(Math.sin(lambda) * Math.cos(epsilon), Math.cos(lambda)) / rad);
    let raOffset = normalize360(alpha - theta);
    if (raOffset > 360 - 1e-9) raOffset = 0;
    const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
    const value = -Math.tan(latitude) * Math.tan(declination);
    if (value < -1 || value > 1) fail('POLAR_HOUSES_UNAVAILABLE', 'Semi-arc is undefined');
    return {raOffset, semiArc: Math.acos(value) / rad};
  };
  const asc = base.angles.ascendantDeg;
  const mc = base.angles.midheavenDeg;
  const ic = base.angles.icDeg;
  const ascSample = sample(asc);
  if (Math.abs(signed(sample(mc).raOffset)) > 1e-6 || Math.abs(ascSample.raOffset - ascSample.semiArc) > 1e-6) {
    fail('INCONSISTENT_ANGLES', 'Ascendant and MC must match ARMC, latitude and obliquity');
  }
  const solve = (start, end, target) => {
    let lo = start, hi = start + normalize360(end - start);
    const residual = x => { const p = sample(x); return p.raOffset - target(p.semiArc); };
    let left = residual(lo), right = residual(hi);
    if (left > 1e-8 || right < -1e-8) fail('INVALID_GEOMETRY', 'Unable to bracket Placidus cusp');
    for (let i = 0; i < 64; i++) {
      const mid = (lo + hi) / 2;
      const value = residual(mid);
      if (value < 0) { lo = mid; left = value; } else { hi = mid; right = value; }
      if (hi - lo < 1e-11) break;
    }
    if (!Number.isFinite(left) || !Number.isFinite(right) || hi - lo >= 1e-8) fail('NO_CONVERGENCE', 'Placidus cusp did not converge');
    return normalize360((lo + hi) / 2);
  };
  const c11 = solve(mc, asc, h => h / 3);
  const c12 = solve(mc, asc, h => 2 * h / 3);
  const c2 = solve(asc, ic, h => 60 + 2 * h / 3);
  const c3 = solve(asc, ic, h => 120 + h / 3);
  const opposite = x => normalize360(x + 180);
  const cuspsDeg = Object.freeze([asc,c2,c3,ic,opposite(c11),opposite(c12),opposite(asc),opposite(c2),opposite(c3),mc,c11,c12]);
  locateLongitudeInHouses(asc, cuspsDeg);
  return Object.freeze({contract:'PlacidusHouseCusps',contractVersion:'0.1.0-experimental',houseSystem:'PLACIDUS',datetimeUtc:base.datetimeUtc,angles:base.angles,armcDeg:theta,trueObliquityDeg,cuspsDeg,source:base.source,validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'});
}
