/**
 * Original pure mathematical primitives for astrological chart facts.
 * No Swiss Ephemeris dependency, no astronomical ephemeris implementation,
 * no account/interpretation/database dependency.
 * Experimental package: not a live VirgoStars calculation service.
 */
export class AstrologyError extends Error {
  constructor(code, message) { super(message); this.name='AstrologyError'; this.code=code; }
}
function finite(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new AstrologyError('INVALID_ANGLE', `${field} must be a finite number`);
}
export function normalize360(degrees) {
  finite(degrees, 'degrees');
  // Adding 360 to a positive remainder can round 359.99999999999994 to 360.
  // Preserve positive remainders and normalize negative zero explicitly.
  const remainder = degrees % 360;
  if (remainder < 0) {
    const positive = remainder + 360;
    return positive === 360 ? 0 : positive;
  }
  return remainder === 0 ? 0 : remainder;
}
/** Signed shortest difference from a to b, in [-180, 180). */
export function signedAngularDistance(a,b) {
  // Both values are in [0, 360). Avoid the +540 shift: it can round away
  // sub-ULP separations near the 0°/360° boundary.
  const difference = normalize360(b) - normalize360(a);
  if (difference >= 180) return difference - 360;
  if (difference < -180) return difference + 360;
  return difference === 0 ? 0 : difference;
}
export function angularSeparation(a,b) {
  return Math.abs(signedAngularDistance(a,b));
}
export function zodiacSignIndex(longitude) {
  return Math.floor(normalize360(longitude) / 30);
}
export function dodecatemoriaLongitude(longitude) {
  // Reduce before the 13-fold multiplication. Multiplying a full-circle
  // longitude can lose the last binary64 steps before 360 (or overflow for
  // otherwise finite inputs). Since 13 * (30 * sign) = 30 * sign (mod 360),
  // only the within-sign offset needs scaling.
  const source = normalize360(longitude);
  const signStart = Math.floor(source / 30) * 30;
  const withinSign = source - signStart;
  // Near the next sign cusp, subtract the 13-fold *gap* from that cusp
  // rather than rounding (signStart + 13*withinSign) up to its boundary.
  return withinSign > 15
    ? normalize360((signStart + 30) - 13 * (30 - withinSign))
    : normalize360(signStart + 13 * withinSign);
}

/**
 * Geometric house placement only. Cusps must be in forward zodiac order.
 * A longitude exactly on a cusp belongs to the house starting there.
 * Nonmonotone systems/polar exceptions require a different documented method.
 */
export function locateLongitudeInHouses(longitude, cusps) {
  const lon=normalize360(longitude);
  if (!Array.isArray(cusps) || cusps.length !== 12)
    throw new AstrologyError('INVALID_CUSPS', 'Exactly twelve finite, dense house cusp longitudes are required');
  // Snapshot every caller-controlled cusp exactly once. An accessor must not
  // validate one coordinate and then publish a different value during .map().
  // Also avoid invoking caller-owned Array#map or Symbol.species hooks.
  const points=[];
  for(let i=0;i<12;i++){
    if (!Object.hasOwn(cusps,i))
      throw new AstrologyError('INVALID_CUSPS', 'Exactly twelve finite, dense house cusp longitudes are required');
    const cusp=cusps[i];
    if (typeof cusp !== 'number' || !Number.isFinite(cusp))
      throw new AstrologyError('INVALID_CUSPS', 'Exactly twelve finite, dense house cusp longitudes are required');
    points.push(normalize360(cusp));
  }
  const spans=[];
  let totalSpan=0;
  for(let i=0;i<12;i++){
    const span=normalize360(points[(i+1)%12]-points[i]);
    if (span<=1e-10)
      throw new AstrologyError('INVALID_CUSPS', 'House cusps must define one forward zodiac revolution');
    spans.push(span);
    totalSpan+=span;
  }
  if (Math.abs(totalSpan-360)>1e-7)
    throw new AstrologyError('INVALID_CUSPS', 'House cusps must define one forward zodiac revolution');
  for(let i=0;i<12;i++){
    const start = points[i], end = points[(i+1)%12];
    // Compare the half-open zodiac interval directly: normalizing a tiny
    // negative (lon - start) can round to 0 and falsely claim the next cusp.
    const inside = start < end
      ? lon >= start && lon < end
      : lon >= start || lon < end;
    if (!inside) continue;
    const distanceFromCuspDeg = lon >= start ? lon - start : (360 - start) + lon;
    return Object.freeze({house:i+1, startDeg:start, endDeg:end, distanceFromCuspDeg});
  }
  throw new AstrologyError('INVALID_CUSPS','Unable to place longitude in house intervals');
}

function point(p) {
  if (!p || typeof p.name!=='string' || !p.name.trim())
    throw new AstrologyError('INVALID_POINT', 'Every point requires a nonempty name');
  return Object.freeze({name:p.name,longitudeDeg:normalize360(p.longitudeDeg),type:p.type??'body'});
}
function definition(d) {
  if (!d || typeof d.id!=='string' || !d.id.trim())
    throw new AstrologyError('INVALID_ASPECT', 'Aspect requires an id');
  finite(d.angleDeg,'angleDeg'); finite(d.maxOrbDeg,'maxOrbDeg');
  if(d.angleDeg<0||d.angleDeg>180||d.maxOrbDeg<0)
    throw new AstrologyError('INVALID_ASPECT','Aspect angle must be 0..180 and orb >= 0');
  return Object.freeze({id:d.id,angleDeg:d.angleDeg,maxOrbDeg:d.maxOrbDeg});
}
/**
 * Directional cross-aspect facts; zero symbolic interpretation claims.
 * No implicit aspect definitions or orb limits.
 */
export function calculateCrossAspects({direction,sourcePoints,targetPoints,aspectDefinitions}) {
  if(!['A_TO_B','B_TO_A','SKY_TO_NATAL'].includes(direction))
    throw new AstrologyError('INVALID_DIRECTION','Explicit A_TO_B/B_TO_A/SKY_TO_NATAL direction is required');
  if(!Array.isArray(sourcePoints)||!Array.isArray(targetPoints)||!Array.isArray(aspectDefinitions))
    throw new AstrologyError('INVALID_ARGUMENT','All points and aspectDefinitions must be arrays');
  const src=sourcePoints.map(point),dst=targetPoints.map(point),defs=aspectDefinitions.map(definition);
  const matches=[];
  for(const source of src) for(const target of dst) for(const aspect of defs) {
    const actualAngleDeg=angularSeparation(source.longitudeDeg,target.longitudeDeg);
    const signedOrbDeg=actualAngleDeg-aspect.angleDeg;
    if(Math.abs(signedOrbDeg)<=aspect.maxOrbDeg+1e-12)
      matches.push(Object.freeze({direction,source,target,aspectId:aspect.id,exactAngleDeg:aspect.angleDeg,
        actualAngleDeg,signedOrbDeg,absoluteOrbDeg:Math.abs(signedOrbDeg),configuredMaxOrbDeg:aspect.maxOrbDeg}));
  }
  return Object.freeze(matches);
}

/**
 * Experimental provider boundary. Providers must supply apparent geocentric
 * ecliptic-of-date positions. Current VirgoStars Ephemeris SPK prototype only
 * supplies geometric J2000 vectors and therefore CANNOT satisfy this yet.
 */
function isValidUtcInstant(datetimeUtc) {
  if (typeof datetimeUtc !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/.exec(datetimeUtc);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > daysInMonth[month - 1]) return false;

  // Keep the platform parser as a final representability check, but never
  // rely on it for calendar validity: Date.parse normalizes some overflow dates.
  return Number.isFinite(Date.parse(datetimeUtc));
}

export async function calculateNatalWithProvider({ datetimeUtc, latitudeDeg, longitudeDegEast, bodyNames, provider }) {
  if (!isValidUtcInstant(datetimeUtc))
    throw new AstrologyError('INVALID_UTC', 'Explicit ISO UTC instant ending Z is required');
  finite(latitudeDeg, 'latitudeDeg'); finite(longitudeDegEast, 'longitudeDegEast');
  if (latitudeDeg < -90 || latitudeDeg > 90 || longitudeDegEast < -180 || longitudeDegEast > 180)
    throw new AstrologyError('INVALID_COORDINATES', 'Geographic coordinates outside valid bounds');
  if (!Array.isArray(bodyNames) || bodyNames.length === 0 || bodyNames.length > 32 ||
      bodyNames.some(n => typeof n !== 'string' || !n.trim()) || new Set(bodyNames).size !== bodyNames.length)
    throw new AstrologyError('INVALID_BODIES', '1..32 unique named bodies required');
  if (!provider || typeof provider.getGeocentricEcliptic !== 'function')
    throw new AstrologyError('MISSING_PROVIDER', 'Explicit independent ephemeris provider required');
  const bodies = {};
  for (const bodyName of bodyNames) {
    const state = await provider.getGeocentricEcliptic({ datetimeUtc, bodyName, corrections:'APPARENT', frame:'ECLIPTIC_OF_DATE' });
    if (!state || state.metadata?.center !== 'EARTH' || state.metadata?.frame !== 'ECLIPTIC_OF_DATE' ||
        state.metadata?.corrections !== 'APPARENT')
      throw new AstrologyError('INCOMPATIBLE_EPHEMERIS', 'Provider must return apparent Earth-centered ecliptic-of-date coordinates');
    finite(state.longitudeDeg, 'longitudeDeg'); finite(state.latitudeDeg, 'latitudeDeg');
    const lon = normalize360(state.longitudeDeg);
    bodies[bodyName] = Object.freeze({ name:bodyName, longitudeDeg:lon, latitudeDeg:state.latitudeDeg,
      zodiacSignIndex:zodiacSignIndex(lon), longitudeSpeedDegPerDay:
        typeof state.longitudeSpeedDegPerDay === 'number' && Number.isFinite(state.longitudeSpeedDegPerDay)
          ? state.longitudeSpeedDegPerDay : null,
      ephemerisMetadata:Object.freeze({ ...state.metadata }) });
  }
  return Object.freeze({ contract:'NatalChartResult', contractVersion:'0.1.0-experimental',
    datetimeUtc, latitudeDeg, longitudeDegEast, bodies:Object.freeze(bodies),
    houses:null, angles:null,
    warnings:Object.freeze([{code:'houses_unavailable',message:'House algorithms not yet integrated'}]) });
}
