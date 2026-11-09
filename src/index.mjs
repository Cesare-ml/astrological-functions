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
