/**
 * Independent experimental geometry of Krusinski-Pisa-Goelzer and Azimuth
 * (Horizontal) houses. Astronomical inputs come from the pinned external
 * provider; no ephemeris, sidereal-time or Swiss source is used here.
 *
 * Conventions: Astrodienst's Swiss Ephemeris manual §§6.2.9, 6.2.13.
 */
import { AstrologyError, normalize360, signedAngularDistance, locateLongitudeInHouses } from './index.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const KEYS = new Set([
  'datetimeUtc', 'birthTimeKnown', 'ascendantDeg', 'midheavenDeg',
  'armcDeg', 'trueObliquityDeg', 'angleModel', 'source',
]);
const fail = (code, message) => { throw new AstrologyError(code, message); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const identifier = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 128 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a, b) => [
  a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0],
];
const near = (a, b, tolerance=1e-6) => Math.abs(signedAngularDistance(a, b)) <= tolerance;

function eclipticAtRa(raDeg, epsilon) {
  const ra = raDeg * RAD;
  return normalize360(Math.atan2(Math.sin(ra), Math.cos(ra)*Math.cos(epsilon))*DEG);
}

function eclipticOnGreatCircle(normal, epsilon, desiredDirection) {
  // Great circle plane n·r=0, where r=(cos λ,cos ε sin λ,sin ε sin λ).
  const x=normal[0], y=normal[1]*Math.cos(epsilon)+normal[2]*Math.sin(epsilon);
  if(Math.hypot(x,y)<1e-13)
    fail('HOUSE_CIRCLE_UNDEFINED','The house plane coincides with the ecliptic');
  const candidate=normalize360(Math.atan2(-x,y)*DEG);
  if(desiredDirection===undefined) return candidate;
  const lon=candidate*RAD;
  const r=[Math.cos(lon),Math.sin(lon)*Math.cos(epsilon),Math.sin(lon)*Math.sin(epsilon)];
  const projection=dot(r,desiredDirection);
  if(Math.abs(projection)<1e-12)
    fail('AZIMUTH_UNAVAILABLE','The ecliptic point has no defined azimuth at this orientation');
  return projection>0?candidate:normalize360(candidate+180);
}

function validated(input) {
  if(!plain(input)||Object.keys(input).some(key=>!KEYS.has(key)))
    fail('INVALID_HORIZON_INPUT','A plain house request with supported fields is required');
  if(input.birthTimeKnown===false) fail('BIRTH_TIME_UNKNOWN','Known birth time is required');
  if(input.birthTimeKnown!==true) fail('INVALID_HORIZON_INPUT','birthTimeKnown must be explicitly true');
  if(!finite(input.armcDeg)||!finite(input.trueObliquityDeg)||
      input.trueObliquityDeg<=0||input.trueObliquityDeg>=90)
    fail('INVALID_ANGLES','Finite ARMC and physical true obliquity are required');
  if(!identifier(input.angleModel)) fail('INVALID_ANGLE_MODEL','A pinned angle-model identifier is required');

  // Reuse established UTC, source and ordinary ascending-axis validation,
  // *not* the Porphyry cusp algorithm. No silent polar fallback is made.
  const base=calculatePorphyryHouseCusps(input);
  const armcDeg=normalize360(input.armcDeg);
  const theta=armcDeg*RAD, epsilon=input.trueObliquityDeg*RAD;
  const latitude=base.source.observer.latitudeDeg*RAD;
  const expectedMc=eclipticAtRa(armcDeg,epsilon);
  const expectedAsc=normalize360(Math.atan2(-Math.cos(theta),
    Math.sin(epsilon)*Math.tan(latitude)+Math.cos(epsilon)*Math.sin(theta))*DEG+180);
  if(!near(base.angles.midheavenDeg,expectedMc)||!near(base.angles.ascendantDeg,expectedAsc))
    fail('INCONSISTENT_ANGLES','ASC and MC must agree with ARMC, latitude and obliquity');

  const east=Object.freeze([-Math.sin(theta),Math.cos(theta),0]);
  const north=Object.freeze([
    -Math.sin(latitude)*Math.cos(theta),
    -Math.sin(latitude)*Math.sin(theta),
    Math.cos(latitude),
  ]);
  const zenith=Object.freeze([
    Math.cos(latitude)*Math.cos(theta),
    Math.cos(latitude)*Math.sin(theta),
    Math.sin(latitude),
  ]);
  const asc=base.angles.ascendantDeg*RAD;
  const ascDirection=Object.freeze([
    Math.cos(asc),Math.cos(epsilon)*Math.sin(asc),Math.sin(epsilon)*Math.sin(asc),
  ]);
  // A valid Ascendant lies on the horizon, 90° from local zenith. Never
  // artificially orthogonalize an inconsistent astronomical provider value.
  if(Math.abs(dot(ascDirection,zenith))>1e-8)
    fail('INCONSISTENT_ANGLES','The supplied Ascendant must be on the horizon');
  return Object.freeze({base,armcDeg,epsilon,east,north,zenith,ascDirection,
    trueObliquityDeg:input.trueObliquityDeg,angleModel:input.angleModel});
}

function finish(model,houseSystem,cusps,geometry,cusp1Anchor) {
  if(!near(cusps[9],model.base.angles.midheavenDeg)||
      !near(cusps[3],model.base.angles.icDeg))
    fail('INCONSISTENT_GEOMETRY','The constructed meridian cusps must match the supplied MC/IC');
  if(houseSystem==='KRUSINSKI_PISA_GOELZER') cusps[0]=model.base.angles.ascendantDeg;
  // Both systems use the local meridian plane for the tenth cusp.
  cusps[9]=model.base.angles.midheavenDeg;
  cusps[3]=model.base.angles.icDeg;
  const cuspsDeg=Object.freeze(cusps.map(normalize360));
  try {
    locateLongitudeInHouses(cuspsDeg[0],cuspsDeg);
  } catch(error) {
    if(error instanceof AstrologyError && error.code==='INVALID_CUSPS')
      fail('HOUSE_GEOMETRY_UNAVAILABLE','This geometry has reversed or degenerate house ordering');
    throw error;
  }
  return Object.freeze({
    contract:'HorizonHouseCusps',contractVersion:'0.1.0-experimental',houseSystem,
    datetimeUtc:model.base.datetimeUtc,birthTimeKnown:true,
    armcDeg:model.armcDeg,trueObliquityDeg:model.trueObliquityDeg,
    angleModel:model.angleModel,angles:model.base.angles,source:model.base.source,
    cuspsDeg,geometry,cusp1Anchor,interpretation:'FACTS_ONLY',
    validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  });
}

/**
 * Krusinski–Pisa–Goelzer: divide the great circle through actual Ascendant
 * and zenith into equal 30° arcs; project each point along its meridian
 * circle onto the ecliptic (equal RA, NOT direct rectangular projection).
 */
export function calculateKrusinskiPisaGoelzerHouseCusps(input) {
  const model=validated(input);
  const cusps=Array.from({length:12},(_,i)=>{
    const a=-i*30*RAD;
    const p=model.ascDirection.map((v,j)=>v*Math.cos(a)+model.zenith[j]*Math.sin(a));
    if(Math.hypot(p[0],p[1])<1e-13)
      fail('MERIDIAN_PROJECTION_UNAVAILABLE','The division point lies on a celestial pole');
    return eclipticAtRa(Math.atan2(p[1],p[0])*DEG,model.epsilon);
  });
  return finish(model,'KRUSINSKI_PISA_GOELZER',cusps,
    'ASCENDANT_ZENITH_GREAT_CIRCLE_TO_RIGHT_ASCENSION','ASCENDANT');
}

/**
 * Azimuth/Horizontal: divide the local horizon into twelve 30° directions.
 * Intersect their vertical circles (zenith/nadir) with the ecliptic. Cusp 1
 * is the eastern-direction Antivertex, not the ordinary Ascendant.
 */
export function calculateAzimuthHouseCusps(input) {
  const model=validated(input);
  // The projected ecliptic traverses horizon azimuth in opposite senses
  // according to the orientation of its pole relative to the zenith.
  // Close to zero there is no one-to-one azimuth-to-longitude mapping.
  const pole=[0,-Math.sin(model.epsilon),Math.cos(model.epsilon)];
  const poleAbove=dot(pole,model.zenith);
  if(Math.abs(poleAbove)<1e-12)
    fail('AZIMUTH_UNAVAILABLE','Ecliptic passes through zenith: azimuth cusps are degenerate');
  const orientation=Math.sign(poleAbove);
  const cusps=Array.from({length:12},(_,i)=>{
    const a=-i*30*RAD;
    const direction=model.east.map((v,j)=>
      v*Math.cos(a)-orientation*model.north[j]*Math.sin(a));
    return eclipticOnGreatCircle(cross(model.zenith,direction),model.epsilon,direction);
  });
  return finish(model,'AZIMUTH',cusps,
    'HORIZON_AZIMUTH_VERTICAL_CIRCLE','ANTIVERTEX_EAST_DIRECTION');
}
