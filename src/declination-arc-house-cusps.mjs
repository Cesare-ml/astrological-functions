/**
 * Experimental APC and Sunshine houses: subdivision of a fixed declination
 * parallel's upper/lower arcs and projection through north/south horizon
 * points onto the ecliptic. The declination circle is the Ascendant's for APC
 * and a pinned, externally supplied apparent Sun's for Sunshine.
 *
 * Independent geometric reconstruction of the published constructions in
 * Astrodienst Swiss Ephemeris manual §6.2.14–15, not a source-code port.
 * No ephemeris, sidereal-time, Sun position or rise/set is calculated here.
 */
import {AstrologyError,normalize360,signedAngularDistance,locateLongitudeInHouses} from './index.mjs';
import {calculatePorphyryHouseCusps} from './porphyry-houses.mjs';

const RAD=Math.PI/180;
const DEG=180/Math.PI;
const KEYS=new Set(['datetimeUtc','birthTimeKnown','armcDeg','trueObliquityDeg',
  'ascendantDeg','midheavenDeg','angleModel','source','sun']);
const SUN_KEYS=new Set(['datetimeUtc','declinationDeg','modelId','bodyId','frame',
  'center','corrections','observerType','source']);
const SOURCE_KEYS=new Set(['engineVersion','kernelSetId','timeModel']);
const fail=(code,message)=>{throw new AstrologyError(code,message);};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const ident=value=>typeof value==='string'&&value.length>0&&value.length<=128&&
  value.trim()===value&&!/[\x00-\x1f\x7f]/.test(value);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],
];
const close=(a,b,tolerance=1e-6)=>Math.abs(signedAngularDistance(a,b))<=tolerance;
const eclipticVector=(longitude,epsilon)=>{
  const angle=longitude*RAD;
  return [Math.cos(angle),Math.cos(epsilon)*Math.sin(angle),Math.sin(epsilon)*Math.sin(angle)];
};

function validateSun(raw,model,input) {
  if(!plain(raw)||Object.keys(raw).some(key=>!SUN_KEYS.has(key))||
      !plain(raw.source)||Object.keys(raw.source).some(key=>!SOURCE_KEYS.has(key)))
    fail('INCOMPATIBLE_SUN_SOURCE','A typed pinned Sun declination source is required');
  if(raw.datetimeUtc!==input.datetimeUtc||raw.bodyId!=='SUN'||
      raw.frame!=='EQUATORIAL_OF_DATE'||raw.center!=='EARTH'||
      raw.corrections!=='APPARENT'||raw.observerType!=='GEOCENTRIC'||
      !ident(raw.modelId)||!finite(raw.declinationDeg)||Math.abs(raw.declinationDeg)>=90)
    fail('INCOMPATIBLE_SUN_SOURCE','Sun must be an apparent geocentric equatorial-of-date declination at the exact UTC instant');
  const {engineVersion,kernelSetId,timeModel}=raw.source;
  if(![engineVersion,kernelSetId,timeModel].every(ident)||
      engineVersion!==model.base.source.engineVersion||
      kernelSetId!==model.base.source.kernelSetId||timeModel!==model.base.source.timeModel)
    fail('INCOMPATIBLE_SUN_SOURCE','Sun and house angles must use the same pinned ephemeris/kernel/time model');
  return Object.freeze({datetimeUtc:raw.datetimeUtc,declinationDeg:raw.declinationDeg,
    modelId:raw.modelId,bodyId:'SUN',frame:'EQUATORIAL_OF_DATE',center:'EARTH',
    corrections:'APPARENT',observerType:'GEOCENTRIC',
    source:Object.freeze({engineVersion,kernelSetId,timeModel})});
}

function validated(input,method) {
  if(!plain(input)||Object.keys(input).some(key=>!KEYS.has(key)))
    fail('INVALID_DECLINATION_HOUSE_INPUT','A plain request with supported keys is required');
  if(input.birthTimeKnown===false)fail('BIRTH_TIME_UNKNOWN','The house method requires a known birth time');
  if(input.birthTimeKnown!==true)fail('INVALID_DECLINATION_HOUSE_INPUT','birthTimeKnown must be explicitly true');
  if(!finite(input.armcDeg)||!finite(input.trueObliquityDeg)||
      input.trueObliquityDeg<=0||input.trueObliquityDeg>=90)
    fail('INVALID_ANGLES','Finite ARMC and physical true obliquity are required');
  if(!ident(input.angleModel))fail('INVALID_ANGLE_MODEL','A versioned angle model is required');
  if(method==='APC'&&Object.hasOwn(input,'sun'))
    fail('INVALID_DECLINATION_HOUSE_INPUT','APC uses Ascendant declination, not the Sun');
  const base=calculatePorphyryHouseCusps(input); // only UTC/source/axis validation
  const armcDeg=normalize360(input.armcDeg),theta=armcDeg*RAD;
  const epsilon=input.trueObliquityDeg*RAD;
  const latitude=base.source.observer.latitudeDeg*RAD;
  const expectedMc=normalize360(Math.atan2(Math.sin(theta),
    Math.cos(theta)*Math.cos(epsilon))*DEG);
  const expectedAsc=normalize360(Math.atan2(-Math.cos(theta),
    Math.sin(epsilon)*Math.tan(latitude)+Math.cos(epsilon)*Math.sin(theta))*DEG+180);
  if(!close(base.angles.ascendantDeg,expectedAsc)||
      !close(base.angles.midheavenDeg,expectedMc))
    fail('INCONSISTENT_ANGLES','ASC and MC must agree with the supplied ARMC, latitude and obliquity');
  const sun=method==='SUNSHINE'?validateSun(input.sun,{base},input):null;
  const declinationDeg=method==='APC'
    ?Math.asin(Math.sin(epsilon)*Math.sin(base.angles.ascendantDeg*RAD))*DEG
    :sun.declinationDeg;
  const north=Object.freeze([-Math.sin(latitude)*Math.cos(theta),
    -Math.sin(latitude)*Math.sin(theta),Math.cos(latitude)]);
  return Object.freeze({base,armcDeg,epsilon,latitude,north,
    trueObliquityDeg:input.trueObliquityDeg,angleModel:input.angleModel,
    declinationDeg,sun});
}

// Intersect the great circle through a specific point of a declination
// parallel and the local north/south horizon points with the ecliptic.
// Select the ecliptic intersection in the same half-circle as that point.
function cuspAtParallelPoint(model,rightAscensionDeg) {
  const ra=rightAscensionDeg*RAD,delta=model.declinationDeg*RAD;
  const parallel=[Math.cos(delta)*Math.cos(ra),
    Math.cos(delta)*Math.sin(ra),Math.sin(delta)];
  const normal=cross(model.north,parallel);
  const a=normal[0],b=normal[1]*Math.cos(model.epsilon)+normal[2]*Math.sin(model.epsilon);
  if(Math.hypot(a,b)<1e-13)
    fail('DECLINATION_CIRCLE_UNAVAILABLE','The position circle cannot intersect the ecliptic unambiguously');
  const candidate=normalize360(Math.atan2(-a,b)*DEG);
  const sign=dot(eclipticVector(candidate,model.epsilon),parallel);
  if(Math.abs(sign)<1e-12)
    fail('DECLINATION_CIRCLE_UNAVAILABLE','The correct hemisphere of the house circle is undefined');
  return sign>0?candidate:normalize360(candidate+180);
}

function calculate(input,method) {
  const model=validated(input,method);
  const declination=model.declinationDeg*RAD;
  const cosHour=-Math.tan(model.latitude)*Math.tan(declination);
  // This isolated version fails closed in permanent day/night and near-zero
  // quadrants; Astro.com's coincident-cusp polar policies need a distinct
  // non-ordinary-house placement contract before they can be represented.
  if(!(cosHour>-1&&cosHour<1))
    fail('DECLINATION_ARC_UNAVAILABLE','The parallel does not rise and set at this latitude');
  const diurnal=Math.acos(cosHour)*DEG;
  const nocturnal=180-diurnal;
  if(diurnal<=1e-8||nocturnal<=1e-8)
    fail('DECLINATION_ARC_UNAVAILABLE','Degenerate upper or lower declination arc');

  const offset=[
    diurnal,
    diurnal+nocturnal/3,
    diurnal+2*nocturnal/3,
    180,
    180+nocturnal/3,
    180+2*nocturnal/3,
    360-diurnal,
    360-2*diurnal/3,
    360-diurnal/3,
    0,
    diurnal/3,
    2*diurnal/3,
  ];
  const cusps=offset.map(value=>cuspAtParallelPoint(model,model.armcDeg+value));
  const {ascendantDeg:asc,icDeg:ic,descendantDeg:dsc,midheavenDeg:mc}=model.base.angles;
  if(!close(cusps[0],asc)||!close(cusps[3],ic)||
      !close(cusps[6],dsc)||!close(cusps[9],mc))
    fail('DECLINATION_ARC_UNAVAILABLE','Parallel construction cannot anchor the supplied ASC/IC/DSC/MC');
  cusps[0]=asc;cusps[3]=ic;cusps[6]=dsc;cusps[9]=mc;
  const cuspsDeg=Object.freeze(cusps.map(normalize360));
  try {
    locateLongitudeInHouses(cuspsDeg[0],cuspsDeg);
  } catch(error) {
    if(error instanceof AstrologyError&&error.code==='INVALID_CUSPS')
      fail('HOUSE_GEOMETRY_UNAVAILABLE','This declination geometry has inverted or coincident cusps');
    throw error;
  }
  return Object.freeze({contract:'DeclinationArcHouseCusps',contractVersion:'0.1.0-experimental',
    houseSystem:method,datetimeUtc:model.base.datetimeUtc,birthTimeKnown:true,
    armcDeg:model.armcDeg,trueObliquityDeg:model.trueObliquityDeg,
    angleModel:model.angleModel,angles:model.base.angles,source:model.base.source,
    declinationCircleDeg:model.declinationDeg,
    declinationReference:method==='APC'?'ASCENDANT_DERIVED':'EXTERNAL_APPARENT_SUN',
    sun:model.sun,semiDiurnalArcDeg:diurnal,semiNocturnalArcDeg:nocturnal,
    cuspsDeg,oppositeIntermediateCuspsGuaranteed:false,
    interpretation:'FACTS_ONLY',validation:'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED'});
}

export function calculateApcHouseCusps(input){return calculate(input,'APC');}
export function calculateSunshineHouseCusps(input){return calculate(input,'SUNSHINE');}
