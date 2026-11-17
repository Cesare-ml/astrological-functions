/** Experimental Regiomontanus equatorial-division cusp geometry. */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { expectedRisingAscendantDeg } from './house-ascendant-orientation.mjs';

const rad = Math.PI / 180;
const fail = (code, message) => { throw new AstrologyError(code, message); };
const signed = x => ((x + 540) % 360) - 180;

/** Compute cusps from explicit ARMC, true obliquity, axes and location. */
export function calculateRegiomontanusHouseCusps(input) {
  if (!input || typeof input !== 'object') fail('INVALID_INPUT', 'Explicit Regiomontanus inputs are required');
  const {armcDeg, trueObliquityDeg, datetimeUtc, ascendantDeg, midheavenDeg, source, birthTimeKnown} = input;
  if (birthTimeKnown !== true) fail('BIRTH_TIME_REQUIRED', 'Regiomontanus houses require a known birth time');
  if (!Number.isFinite(armcDeg) || !Number.isFinite(trueObliquityDeg) || trueObliquityDeg <= 0 || trueObliquityDeg >= 90) fail('INVALID_ANGLES', 'Finite ARMC and physical true obliquity are required');
  const base = calculatePorphyryHouseCusps({datetimeUtc, ascendantDeg, midheavenDeg, source});
  const theta = normalize360(armcDeg);
  const latitude = base.source.observer.latitudeDeg * rad;
  const epsilon = trueObliquityDeg * rad;
  const intersection = (siderealDeg, pole) => {
    const angle = siderealDeg * rad;
    const x = Math.sin(epsilon) * Math.tan(pole) + Math.cos(epsilon) * Math.sin(angle);
    const y = -Math.cos(angle);
    if (Math.hypot(x,y) < 1e-14) fail('INVALID_GEOMETRY', 'Undefined house-circle intersection');
    return normalize360(Math.atan2(y,x) / rad + 180);
  };
  const asc = base.angles.ascendantDeg, mc = base.angles.midheavenDeg;
  const expectedAsc = expectedRisingAscendantDeg(theta,
    trueObliquityDeg, base.source.observer.latitudeDeg);
  const expectedMc = normalize360(Math.atan2(Math.sin(theta*rad), Math.cos(theta*rad)*Math.cos(epsilon))/rad);
  if (Math.abs(signed(asc-expectedAsc)) > 1e-6 || Math.abs(signed(mc-expectedMc)) > 1e-6) fail('INCONSISTENT_ANGLES', 'Ascendant and MC must match ARMC, latitude and obliquity');
  const pole11 = Math.atan(Math.tan(latitude)/2);
  const pole12 = Math.atan(Math.tan(latitude)*Math.sqrt(3)/2);
  const c11=intersection(theta-60,pole11), c12=intersection(theta-30,pole12);
  const c2=intersection(theta+30,pole12), c3=intersection(theta+60,pole11);
  const opposite=x=>normalize360(x+180);
  const cuspsDeg=Object.freeze([asc,c2,c3,base.angles.icDeg,opposite(c11),opposite(c12),opposite(asc),opposite(c2),opposite(c3),mc,c11,c12]);
  try {
    locateLongitudeInHouses(asc,cuspsDeg);
  } catch (error) {
    if (error instanceof AstrologyError && error.code === 'INVALID_CUSPS')
      fail('HOUSE_GEOMETRY_UNAVAILABLE', 'Regiomontanus cusps cannot form ordered zodiac houses at this latitude');
    throw error;
  }
  return Object.freeze({contract:'RegiomontanusHouseCusps',contractVersion:'0.1.0-experimental',houseSystem:'REGIOMONTANUS',datetimeUtc:base.datetimeUtc,angles:base.angles,armcDeg:theta,trueObliquityDeg,cuspsDeg,source:base.source,validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'});
}
