/**
 * Experimental Albategnius (Savard-A) house cusps.
 *
 * Constructed independently from the published Astrodienst definition:
 * divide the vertical excursion in equatorial declination into one- and
 * two-thirds of observer latitude, intersect those declination circles with
 * the prime vertical, and pass great circles through the north/south horizon
 * points and those intersections. The resulting ecliptic cuts are the cusps.
 *
 * Source specification and *independent* rounded reference data:
 * https://www.astro.com/swisseph/sweph_ht_e.htm
 * https://www.astro.com/swisseph/htn_J_e.pdf
 * No Swiss implementation, astronomy, or ephemeris data is copied or run.
 */
import {AstrologyError,normalize360,signedAngularDistance,locateLongitudeInHouses} from './index.mjs';
import {calculatePorphyryHouseCusps} from './porphyry-houses.mjs';

const R=Math.PI/180;
const D=180/Math.PI;
const KEYS=new Set(['datetimeUtc','birthTimeKnown','armcDeg','trueObliquityDeg',
  'ascendantDeg','midheavenDeg','angleModel','source']);
const fail=(code,message)=>{throw new AstrologyError(code,message);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128&&
  x.trim()===x&&!/[\x00-\x1f\x7f]/.test(x);
const close=(a,b,tol=1e-6)=>Math.abs(signedAngularDistance(a,b))<=tol;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],
];

function validated(input) {
  if(!plain(input)||Object.keys(input).some(key=>!KEYS.has(key)))
    fail('INVALID_ALBATEGNIUS_INPUT','Use a plain request with only defined Albategnius fields');
  if(input.birthTimeKnown===false)fail('BIRTH_TIME_UNKNOWN','A known birth time is required');
  if(input.birthTimeKnown!==true)fail('INVALID_ALBATEGNIUS_INPUT','birthTimeKnown must be true');
  if(!finite(input.armcDeg)||!finite(input.trueObliquityDeg)||
      input.trueObliquityDeg<=0||input.trueObliquityDeg>=90)
    fail('INVALID_ANGLES','Finite ARMC and physical true obliquity are required');
  if(!ident(input.angleModel))fail('INVALID_ANGLE_MODEL','A versioned angle model is required');
  const base=calculatePorphyryHouseCusps(input); // UTC, source and ordered-axis checks only
  const theta=normalize360(input.armcDeg)*R;
  const latitude=base.source.observer.latitudeDeg*R;
  const epsilon=input.trueObliquityDeg*R;
  const mc=normalize360(Math.atan2(Math.sin(theta),
    Math.cos(theta)*Math.cos(epsilon))*D);
  const asc=normalize360(Math.atan2(-Math.cos(theta),
    Math.sin(epsilon)*Math.tan(latitude)+Math.cos(epsilon)*Math.sin(theta))*D+180);
  if(!close(mc,base.angles.midheavenDeg)||!close(asc,base.angles.ascendantDeg))
    fail('INCONSISTENT_ANGLES','ASC and MC must agree with ARMC, latitude and true obliquity');
  const zenith=[Math.cos(latitude)*Math.cos(theta),
    Math.cos(latitude)*Math.sin(theta),Math.sin(latitude)];
  const east=[-Math.sin(theta),Math.cos(theta),0];
  const north=[-Math.sin(latitude)*Math.cos(theta),
    -Math.sin(latitude)*Math.sin(theta),Math.cos(latitude)];
  return Object.freeze({base,armcDeg:normalize360(input.armcDeg),
    trueObliquityDeg:input.trueObliquityDeg,angleModel:input.angleModel,
    latitude,epsilon,zenith,east,north});
}

// Continuous equatorial limit is sin(k*phi)/sin(phi) -> k as phi -> 0.
function primeVerticalAngle(latitude,k) {
  const ratio=Math.abs(latitude)<1e-10?k:Math.sin(k*latitude)/Math.sin(latitude);
  if(!finite(ratio)||ratio<0||ratio>1+1e-12)
    fail('ALBATEGNIUS_HOUSES_UNAVAILABLE','Declination band cannot intersect the prime vertical');
  return Math.asin(Math.min(1,ratio))*D;
}

function projectToEcliptic(model,primeVerticalAngleDeg) {
  const t=primeVerticalAngleDeg*R;
  const point=model.east.map((x,i)=>Math.cos(t)*x+Math.sin(t)*model.zenith[i]);
  const normal=cross(model.north,point);
  const a=normal[0],b=normal[1]*Math.cos(model.epsilon)+normal[2]*Math.sin(model.epsilon);
  if(Math.hypot(a,b)<1e-12)
    fail('ALBATEGNIUS_HOUSES_UNAVAILABLE','House circle has undefined ecliptic intersection');
  let candidate=normalize360(Math.atan2(-a,b)*D);
  const l=candidate*R;
  const ecliptic=[Math.cos(l),Math.cos(model.epsilon)*Math.sin(l),
    Math.sin(model.epsilon)*Math.sin(l)];
  const orientation=dot(point,ecliptic);
  if(Math.abs(orientation)<1e-12)
    fail('ALBATEGNIUS_HOUSES_UNAVAILABLE','House circle hemisphere is ambiguous');
  if(orientation<0)candidate=normalize360(candidate+180);
  return candidate;
}

export function calculateAlbategniusHouseCusps(input) {
  const model=validated(input);
  const t1=primeVerticalAngle(model.latitude,1/3);
  const t2=primeVerticalAngle(model.latitude,2/3);
  const cuts=[0,360-t1,360-t2,270,180+t2,180+t1,
    180,180-t1,180-t2,90,t2,t1];
  const cusps=cuts.map(angle=>projectToEcliptic(model,angle));
  const {ascendantDeg:asc,icDeg:ic,descendantDeg:dsc,midheavenDeg:mc}=model.base.angles;
  if(!close(cusps[0],asc)||!close(cusps[3],ic)||
      !close(cusps[6],dsc)||!close(cusps[9],mc))
    fail('ALBATEGNIUS_HOUSES_UNAVAILABLE','The great-circle geometry cannot anchor supplied axes');
  cusps[0]=asc;cusps[3]=ic;cusps[6]=dsc;cusps[9]=mc;
  const cuspsDeg=Object.freeze(cusps.map(normalize360));
  try{locateLongitudeInHouses(asc,cuspsDeg);}
  catch(error){
    if(error instanceof AstrologyError&&error.code==='INVALID_CUSPS')
      fail('ALBATEGNIUS_HOUSES_UNAVAILABLE','Ecliptic cusp ordering is degenerate or reversed');
    throw error;
  }
  return Object.freeze({contract:'AlbategniusHouseCusps',contractVersion:'0.1.0-experimental',
    houseSystem:'ALBATEGNIUS',datetimeUtc:model.base.datetimeUtc,
    birthTimeKnown:true,armcDeg:model.armcDeg,trueObliquityDeg:model.trueObliquityDeg,
    angleModel:model.angleModel,angles:model.base.angles,source:model.base.source,
    primeVerticalDivisionAnglesDeg:Object.freeze([t1,t2]),cuspsDeg,
    interpretation:'FACTS_ONLY',
    validation:'CALLER_ASSERTED_ASTRONOMY_WITH_ROUNDED_EXTERNAL_REFERENCE_FIXTURES'});
}
