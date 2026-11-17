/**
 * Geometric house methods based on equal right-ascension divisions:
 * Meridian, Morinus and Carter poli-equatorial. Astronomy (ARMC, true
 * obliquity, ASC/MC, time model and observer) is supplied by a pinned provider.
 * No sidereal-time calculation, ephemeris engine or Swiss implementation.
 */
import {AstrologyError, normalize360, signedAngularDistance, locateLongitudeInHouses} from './index.mjs';
import {parseUtcGregorianInstant} from './utc-calendar-contract.mjs';

const RAD=Math.PI/180;
const DEG=180/Math.PI;
const INPUT_KEYS=new Set([
  'datetimeUtc','birthTimeKnown','armcDeg','trueObliquityDeg',
  'ascendantDeg','midheavenDeg','angleModel','source',
]);
const fail=(code,message)=>{throw new AstrologyError(code,message);};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const identifier=value=>typeof value==='string'&&value.length>0&&
  value.length<=128&&value===value.trim()&&!/[\x00-\x1f\x7f]/.test(value);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);

function checkUtc(datetimeUtc) {
  if(typeof datetimeUtc!=='string'||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(datetimeUtc))
    fail('INVALID_UTC','A real UTC instant with up to millisecond precision is required');
  try {
    parseUtcGregorianInstant({datetimeUtc,calendar:'PROLEPTIC_GREGORIAN',timeScale:'UTC'});
  } catch {
    fail('INVALID_UTC','A real proleptic-Gregorian UTC instant is required');
  }
  return datetimeUtc;
}

function checkSource(rawSource, allowPolar) {
  if(!record(rawSource)||!record(rawSource.observer))
    fail('INCOMPATIBLE_ANGLE_SOURCE','A pinned observer and angle source are required');
  const {engineVersion,kernelSetId,timeModel,frame,zodiac,observerType,observer}=rawSource;
  const {latitudeDeg,longitudeDegEast}=observer;
  if(![engineVersion,kernelSetId,timeModel].every(identifier)||
      frame!=='ECLIPTIC_OF_DATE'||zodiac!=='TROPICAL'||observerType!=='TOPOCENTRIC'||
      !finite(latitudeDeg)||!finite(longitudeDegEast)||Math.abs(latitudeDeg)>90||
      Math.abs(longitudeDegEast)>180)
    fail('INCOMPATIBLE_ANGLE_SOURCE','Pinned tropical ecliptic-of-date topocentric astronomy is required');
  if(!allowPolar&&Math.abs(latitudeDeg)===90)
    fail('POLAR_ASCENDANT_UNAVAILABLE','Carter requires a defined externally supplied Ascendant');
  return Object.freeze({
    engineVersion,kernelSetId,timeModel,frame,zodiac,observerType,
    observer:Object.freeze({latitudeDeg,longitudeDegEast}),
  });
}

function common(input,method) {
  if(!record(input)||Object.keys(input).some(key=>!INPUT_KEYS.has(key)))
    fail('INVALID_AXIAL_INPUT','A plain axial house request with supported keys is required');
  const {datetimeUtc,birthTimeKnown,armcDeg,trueObliquityDeg,
    ascendantDeg,midheavenDeg,angleModel,source:inputSource}=input;
  if(birthTimeKnown===false) fail('BIRTH_TIME_UNKNOWN','Axial house calculations require a known birth time');
  if(birthTimeKnown!==true) fail('INVALID_AXIAL_INPUT','birthTimeKnown must be explicitly true');
  const utc=checkUtc(datetimeUtc);
  if(!finite(armcDeg)||!finite(trueObliquityDeg)||trueObliquityDeg<=0||trueObliquityDeg>=90)
    fail('INVALID_ANGLES','Finite ARMC and physical true obliquity are required');
  if(!identifier(angleModel)) fail('INVALID_ANGLE_MODEL','A versioned angle-model identifier is required');
  const source=checkSource(inputSource,method!=='CARTER_POLI_EQUATORIAL');
  if(method==='MERIDIAN') {
    if(Object.hasOwn(input,'ascendantDeg')) fail('INVALID_AXIAL_INPUT','Meridian does not use an Ascendant anchor');
    if(!finite(midheavenDeg)) fail('INVALID_ANGLES','Meridian requires a supplied finite MC longitude');
  } else if(method==='MORINUS') {
    if(Object.hasOwn(input,'ascendantDeg')||Object.hasOwn(input,'midheavenDeg'))
      fail('INVALID_AXIAL_INPUT','Morinus uses ARMC, not an ASC/MC cusp anchor');
  } else {
    if(Object.hasOwn(input,'midheavenDeg')) fail('INVALID_AXIAL_INPUT','Carter does not anchor cusp 10 at MC');
    if(!finite(ascendantDeg)) fail('INVALID_ANGLES','Carter requires a supplied finite Ascendant');
  }
  return Object.freeze({datetimeUtc:utc,armcDeg:normalize360(armcDeg),
    trueObliquityDeg,epsilon:trueObliquityDeg*RAD,angleModel,source,
    ascendantDeg:method==='CARTER_POLI_EQUATORIAL'?normalize360(ascendantDeg):null,
    midheavenDeg:method==='MERIDIAN'?normalize360(midheavenDeg):null});
}

// On the ecliptic, tan(RA) = cos(obliquity) * tan(longitude).
function eclipticFromRightAscension(raDeg,epsilon) {
  const ra=raDeg*RAD;
  return normalize360(Math.atan2(Math.sin(ra),Math.cos(ra)*Math.cos(epsilon))*DEG);
}

// Longitude of a point initially on the celestial equator (declination=0)
// after orthogonal rotation into the ecliptic reference frame.
function eclipticFromEquatorialPoint(raDeg,epsilon) {
  const ra=raDeg*RAD;
  return normalize360(Math.atan2(Math.sin(ra)*Math.cos(epsilon),Math.cos(ra))*DEG);
}

function rightAscensionOfEclipticLongitude(longitudeDeg,epsilon) {
  const lon=longitudeDeg*RAD;
  return normalize360(Math.atan2(Math.sin(lon)*Math.cos(epsilon),Math.cos(lon))*DEG);
}

function calculate(input,houseSystem) {
  const model=common(input,houseSystem);
  const {armcDeg,epsilon,ascendantDeg,midheavenDeg}=model;
  const anchor=houseSystem==='CARTER_POLI_EQUATORIAL'
    ?rightAscensionOfEclipticLongitude(ascendantDeg,epsilon)
    :normalize360(armcDeg+90);
  const rightAscensionsDeg=Object.freeze(Array.from({length:12},(_,i)=>normalize360(anchor+i*30)));
  const projection=houseSystem==='MORINUS'
    ?eclipticFromEquatorialPoint:eclipticFromRightAscension;
  const cuspsDeg=Object.freeze(rightAscensionsDeg.map(ra=>projection(ra,epsilon)));
  if(houseSystem==='MERIDIAN'&&
      Math.abs(signedAngularDistance(cuspsDeg[9],midheavenDeg))>1e-6)
    fail('INCONSISTENT_ANGLES','MC must agree with ARMC and true obliquity');
  if(houseSystem==='CARTER_POLI_EQUATORIAL'&&
      Math.abs(signedAngularDistance(cuspsDeg[0],ascendantDeg))>1e-9)
    fail('INCONSISTENT_ANGLES','Carter cusp 1 must agree with the supplied Ascendant');
  locateLongitudeInHouses(cuspsDeg[0],cuspsDeg);
  return Object.freeze({
    contract:'AxialHouseCusps',contractVersion:'0.1.0-experimental',houseSystem,
    datetimeUtc:model.datetimeUtc,birthTimeKnown:true,
    armcDeg, trueObliquityDeg:model.trueObliquityDeg,angleModel:model.angleModel,
    source:model.source, referenceAscendantDeg:ascendantDeg,
    referenceMidheavenDeg:midheavenDeg,
    rightAscensionsDeg,cuspsDeg,
    geometry:houseSystem==='MORINUS'?'EQUATORIAL_POINT_PROJECTED_TO_ECLIPTIC':'ECLIPTIC_POINTS_AT_EQUAL_RIGHT_ASCENSIONS',
    interpretation:'FACTS_ONLY',
    validation:'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED',
  });
}

export function calculateMeridianHouseCusps(input) {return calculate(input,'MERIDIAN');}
export function calculateMorinusHouseCusps(input) {return calculate(input,'MORINUS');}
export function calculateCarterPoliEquatorialHouseCusps(input) {return calculate(input,'CARTER_POLI_EQUATORIAL');}
