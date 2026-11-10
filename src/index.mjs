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
  return ((degrees % 360) + 360) % 360;
}
/** Signed shortest difference from a to b, in [-180, 180). */
export function signedAngularDistance(a,b) {
  return ((normalize360(b)-normalize360(a)+540)%360)-180;
}
export function angularSeparation(a,b) {
  return Math.abs(signedAngularDistance(a,b));
}
export function zodiacSignIndex(longitude) {
  return Math.floor(normalize360(longitude) / 30);
}
export function dodecatemoriaLongitude(longitude) {
  return normalize360(longitude * 13);
}

/**
 * Geometric house placement only. Cusps must be in forward zodiac order.
 * A longitude exactly on a cusp belongs to the house starting there.
 * Nonmonotone systems/polar exceptions require a different documented method.
 */
export function locateLongitudeInHouses(longitude, cusps) {
  const lon=normalize360(longitude);
  if (!Array.isArray(cusps)||cusps.length!==12)
    throw new AstrologyError('INVALID_CUSPS', 'Exactly twelve house cusp longitudes are required');
  const points=cusps.map(normalize360);
  const spans=points.map((v,i)=>normalize360(points[(i+1)%12]-v));
  if (spans.some(x=>x<=1e-10) || Math.abs(spans.reduce((a,b)=>a+b,0)-360)>1e-7)
    throw new AstrologyError('INVALID_CUSPS', 'House cusps must define one forward zodiac revolution');
  for(let i=0;i<12;i++){
    const dist=normalize360(lon-points[i]);
    if(dist < spans[i]) return Object.freeze({house:i+1, startDeg:points[i], endDeg:points[(i+1)%12], distanceFromCuspDeg:dist});
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
export async function calculateNatalWithProvider({ datetimeUtc, latitudeDeg, longitudeDegEast, bodyNames, provider }) {
  // Date.parse may normalize impossible calendar dates (for example February 30).
  // Compare the canonical UTC calendar/clock fields before asking the provider.
  if (typeof datetimeUtc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(datetimeUtc) ||
      !Number.isFinite(Date.parse(datetimeUtc)) ||
      new Date(datetimeUtc).toISOString().slice(0, 19) !== datetimeUtc.slice(0, 19))
    throw new AstrologyError('INVALID_UTC', 'Explicit valid ISO UTC calendar instant ending Z is required');
  finite(latitudeDeg, 'latitudeDeg'); finite(longitudeDegEast, 'longitudeDegEast');
  if (latitudeDeg < -90 || latitudeDeg > 90 || longitudeDegEast < -180 || longitudeDegEast > 180)
    throw new AstrologyError('INVALID_COORDINATES', 'Geographic coordinates outside valid bounds');
  if (!Array.isArray(bodyNames) || bodyNames.length === 0 || bodyNames.length > 32 ||
      bodyNames.some(n => typeof n !== 'string' || !n.trim()) || new Set(bodyNames).size !== bodyNames.length)
    throw new AstrologyError('INVALID_BODIES', '1..32 unique named bodies required');
  if (!provider || typeof provider.getGeocentricEcliptic !== 'function')
    throw new AstrologyError('MISSING_PROVIDER', 'Explicit independent ephemeris provider required');
  // Snapshot validated identifiers before awaiting a potentially reentrant provider.
  // The caller may mutate its array while an earlier body request is pending.
  const requestedBodyNames = Object.freeze([...bodyNames]);
  // Null prototype prevents names such as '__proto__' from mutating the result map.
  const bodies = Object.create(null);
  // Every position in one chart must come from the same optional engine/kernel/time model.
  // Missing provenance is tolerated for existing mock providers but may not be mixed
  // with present provenance in another body's response.
  const provenanceKeys = ['engineVersion', 'kernelSetId', 'timeModel'];
  let expectedProvenance = null;
  for (const bodyName of requestedBodyNames) {
    // Each call receives its own immutable request: adapters cannot rewrite the
    // requested frame, correction policy or body identifier by accident.
    const request = Object.freeze({ datetimeUtc, bodyName, corrections:'APPARENT', frame:'ECLIPTIC_OF_DATE' });
    const state = await provider.getGeocentricEcliptic(request);
    if (!state || state.metadata?.center !== 'EARTH' || state.metadata?.frame !== 'ECLIPTIC_OF_DATE' ||
        state.metadata?.corrections !== 'APPARENT')
      throw new AstrologyError('INCOMPATIBLE_EPHEMERIS', 'Provider must return apparent Earth-centered ecliptic-of-date coordinates');
    finite(state.longitudeDeg, 'longitudeDeg'); finite(state.latitudeDeg, 'latitudeDeg');
    if (state.latitudeDeg < -90 || state.latitudeDeg > 90)
      throw new AstrologyError('INVALID_EPHEMERIS_RESULT', 'Ecliptic latitude must be within -90..90 degrees');
    if (state.longitudeSpeedDegPerDay !== undefined && state.longitudeSpeedDegPerDay !== null)
      finite(state.longitudeSpeedDegPerDay, 'longitudeSpeedDegPerDay');
    const provenance = provenanceKeys.map(key => {
      const value = state.metadata[key];
      if (value === undefined || value === null) return null;
      if (typeof value !== 'string' || !value.trim())
        throw new AstrologyError('INVALID_EPHEMERIS_RESULT', `${key} must be a nonempty string when provided`);
      return value;
    });
    if (expectedProvenance !== null &&
        provenance.some((value, index) => value !== expectedProvenance[index]))
      throw new AstrologyError('INCONSISTENT_EPHEMERIS',
        'Chart bodies must use one ephemeris engine version, kernel set and time model');
    expectedProvenance ??= provenance;
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
    warnings:Object.freeze([Object.freeze({code:'houses_unavailable',message:'House algorithms not yet integrated'})]) });
}
