/**
 * Experimental Gauquelin 36-sector geometry, independently derived from the
 * published Placidus semi-arc construction (Astrodienst manual §6.2.12, 6.6).
 *
 * Sector numbers run CLOCKWISE: 1 rising, 10 upper transit, 19 setting,
 * 28 lower transit. This is not a 12-house array, nor is an ecliptic cusp
 * lookup an adequate substitute for a body's true equatorial position.
 * All physical angles and body positions come from an external pinned source.
 */
import {AstrologyError,normalize360,signedAngularDistance} from './index.mjs';
import {calculatePorphyryHouseCusps} from './porphyry-houses.mjs';

const R=Math.PI/180;
const D=180/Math.PI;
const BASE_KEYS=new Set(['datetimeUtc','birthTimeKnown','armcDeg','trueObliquityDeg',
  'ascendantDeg','midheavenDeg','angleModel','source']);
const BODY_KEYS=new Set(['datetimeUtc','rightAscensionDeg','declinationDeg','bodyId',
  'modelId','frame','center','corrections','observerType','source']);
const BODY_SOURCE_KEYS=new Set(['engineVersion','kernelSetId','timeModel']);
const PLUS=new Set([36,1,2,3,9,10,11,12,19,20,21,28,29,30]);
const fail=(code,message)=>{throw new AstrologyError(code,message);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128&&
  x.trim()===x&&!/[\x00-\x1f\x7f]/.test(x);
const close=(a,b,tol=1e-6)=>Math.abs(signedAngularDistance(a,b))<=tol;

function validate(input,extra) {
  if(!plain(input)||Object.keys(input).some(k=>!BASE_KEYS.has(k)&&k!==extra))
    fail('INVALID_GAUQUELIN_INPUT','Use a plain request with only defined Gauquelin fields');
  if(input.birthTimeKnown===false)fail('BIRTH_TIME_UNKNOWN','A known birth time is required');
  if(input.birthTimeKnown!==true)fail('INVALID_GAUQUELIN_INPUT','birthTimeKnown must be true');
  if(!finite(input.armcDeg)||!finite(input.trueObliquityDeg)||
      input.trueObliquityDeg<=0||input.trueObliquityDeg>=90)
    fail('INVALID_ANGLES','Finite ARMC and physical true obliquity are required');
  if(!ident(input.angleModel))fail('INVALID_ANGLE_MODEL','A versioned angle model is required');
  const base=calculatePorphyryHouseCusps(input); // validate time, source and quadrant axes
  const armcDeg=normalize360(input.armcDeg),theta=armcDeg*R;
  const epsilon=input.trueObliquityDeg*R;
  const latDeg=base.source.observer.latitudeDeg;
  const latitude=latDeg*R;
  const mc=normalize360(Math.atan2(Math.sin(theta),
    Math.cos(theta)*Math.cos(epsilon))*D);
  const asc=normalize360(Math.atan2(-Math.cos(theta),
    Math.sin(epsilon)*Math.tan(latitude)+Math.cos(epsilon)*Math.sin(theta))*D+180);
  if(!close(base.angles.ascendantDeg,asc)||!close(base.angles.midheavenDeg,mc))
    fail('INCONSISTENT_ANGLES','ASC and MC must match ARMC, latitude and obliquity');
  // In this first 36-cusp contract every point of the ecliptic must rise/set.
  // Individual circumpolar bodies need the separately documented Otto Ludwig
  // placement semantics, not a fabricated rising or setting instant.
  if(Math.abs(Math.tan(latitude)*Math.tan(epsilon))>=1)
    fail('GAUQUELIN_CUSPS_UNAVAILABLE','Ecliptic semi-arcs cease to be ordinary beyond the polar circle');
  return Object.freeze({base,armcDeg,latitude,epsilon,
    trueObliquityDeg:input.trueObliquityDeg,angleModel:input.angleModel});
}

function equatorialFromEcliptic(longitude,model) {
  const l=longitude*R;
  return {rightAscensionDeg:normalize360(Math.atan2(Math.cos(model.epsilon)*Math.sin(l),Math.cos(l))*D),
    declinationDeg:Math.asin(Math.sin(model.epsilon)*Math.sin(l))*D};
}

function semiArc(model,declinationDeg) {
  const cosine=-Math.tan(model.latitude)*Math.tan(declinationDeg*R);
  if(!(cosine>-1&&cosine<1))
    fail('GAUQUELIN_BODY_UNAVAILABLE','Body has no ordinary rise/set semi-arcs');
  const day=Math.acos(cosine)*D;
  if(day<=1e-8||day>=180-1e-8)
    fail('GAUQUELIN_BODY_UNAVAILABLE','The body semi-arc is degenerate');
  return day;
}

// An unwrapped position specifically for one of the four ordered arcs:
// rising → upper → setting → lower → rising. This avoids a 1/37 seam when
// numerically inverting each 9-sector quarter for ecliptic boundaries.
function quadrantPosition(model,longitude,quadrant) {
  const body=equatorialFromEcliptic(longitude,model);
  const day=semiArc(model,body.declinationDeg);
  const h360=normalize360(model.armcDeg-body.rightAscensionDeg);
  const hSigned=h360>180?h360-360:h360;
  return quadrant<2?10+9*hSigned/day:28+9*(h360-180)/(180-day);
}

function boundaries(model) {
  const {ascendantDeg:asc,midheavenDeg:mc,descendantDeg:dsc,icDeg:ic}=model.base.angles;
  const anchors=[asc,mc,dsc,ic,asc];
  const result=[];
  for(let q=0;q<4;q++) {
    const start=anchors[q],span=normalize360(start-anchors[q+1]);
    if(span<=1e-9||span>=180-1e-9)
      fail('GAUQUELIN_CUSPS_UNAVAILABLE','Invalid clockwise angular quadrant');
    result.push(start);
    let previous=0;
    for(let n=1;n<9;n++) {
      const target=1+9*q+n;
      let lo=previous,hi=1;
      const at=f=>quadrantPosition(model,normalize360(start-span*f),q);
      const a=at(lo),b=at(hi-1e-12);
      if(!finite(a)||!finite(b)||a>target+1e-7||b<target-1e-7)
        fail('GAUQUELIN_CUSPS_UNAVAILABLE','Cannot bracket a clockwise semi-arc boundary');
      for(let i=0;i<70;i++) {
        const mid=(lo+hi)/2;
        if(at(mid)<target)lo=mid;else hi=mid;
      }
      const fraction=(lo+hi)/2;
      const longitude=normalize360(start-span*fraction);
      if(Math.abs(at(fraction)-target)>1e-7)
        fail('GAUQUELIN_CUSPS_UNAVAILABLE','A 36-sector boundary failed to converge');
      result.push(longitude);
      previous=fraction;
    }
  }
  for(let i=0;i<36;i++) {
    const clockwise=normalize360(result[i]-result[(i+1)%36]);
    if(!(clockwise>1e-10&&clockwise<180))
      fail('GAUQUELIN_CUSPS_UNAVAILABLE','Sector boundaries are degenerate or inverted');
  }
  return Object.freeze(result);
}

function placement(model,ra,delta) {
  const day=semiArc(model,delta),night=180-day;
  const hour=normalize360(model.armcDeg-normalize360(ra));
  const signed=hour>180?hour-360:hour;
  let position;
  if(signed>=-day&&signed<day)
    position=10+9*signed/day;
  else {
    const nocturnalHour=hour<day?hour+360:hour;
    position=28+9*(nocturnalHour-180)/night;
    if(position>=37)position-=36;
  }
  // Eliminate epsilon-scale numerical crossings at exact cardinal axes.
  for(const anchor of [1,10,19,28,37])
    if(Math.abs(position-anchor)<1e-10)position=anchor===37?1:anchor;
  if(!(position>=1&&position<37))
    fail('GAUQUELIN_BODY_UNAVAILABLE','Calculated sector position is outside 1..37');
  const sector=Math.floor(position);
  return Object.freeze({sector,position,zone:PLUS.has(sector)?'PLUS':'MINUS',
    phase:sector<=18?'ABOVE_HORIZON':'BELOW_HORIZON',
    hourAngleDeg:hour,semiDiurnalArcDeg:day,semiNocturnalArcDeg:night});
}

function validateBody(raw,model,input) {
  if(!plain(raw)||Object.keys(raw).some(k=>!BODY_KEYS.has(k))||
      !plain(raw.source)||Object.keys(raw.source).some(k=>!BODY_SOURCE_KEYS.has(k)))
    fail('INCOMPATIBLE_BODY_SOURCE','A pinned external body position is required');
  if(raw.datetimeUtc!==input.datetimeUtc||!ident(raw.bodyId)||!ident(raw.modelId)||
      raw.frame!=='EQUATORIAL_OF_DATE'||raw.center!=='EARTH'||
      raw.corrections!=='APPARENT'||raw.observerType!=='GEOCENTRIC'||
      !finite(raw.rightAscensionDeg)||!finite(raw.declinationDeg)||
      Math.abs(raw.declinationDeg)>90)
    fail('INCOMPATIBLE_BODY_SOURCE','Body must be apparent geocentric equatorial-of-date at the same UTC instant');
  const {engineVersion,kernelSetId,timeModel}=raw.source;
  if(![engineVersion,kernelSetId,timeModel].every(ident)||
      engineVersion!==model.base.source.engineVersion||
      kernelSetId!==model.base.source.kernelSetId||timeModel!==model.base.source.timeModel)
    fail('INCOMPATIBLE_BODY_SOURCE','Body and angles must use the same pinned engine/kernel/time model');
  return Object.freeze({datetimeUtc:raw.datetimeUtc,
    rightAscensionDeg:normalize360(raw.rightAscensionDeg),
    declinationDeg:raw.declinationDeg,bodyId:raw.bodyId,modelId:raw.modelId,
    frame:'EQUATORIAL_OF_DATE',center:'EARTH',corrections:'APPARENT',
    observerType:'GEOCENTRIC',source:Object.freeze({engineVersion,kernelSetId,timeModel})});
}

function common(model){return {contractVersion:'0.1.0-experimental',houseSystem:'GAUQUELIN_36',
  datetimeUtc:model.base.datetimeUtc,armcDeg:model.armcDeg,
  trueObliquityDeg:model.trueObliquityDeg,angleModel:model.angleModel,
  source:model.base.source,clockwise:true,sectorCount:36,
  interpretation:'FACTS_ONLY',validation:'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED'};}

/** The full 36 clockwise ecliptic sector boundaries, not 12 house cusps. */
export function calculateGauquelinSectors(input) {
  const model=validate(input);
  return Object.freeze({contract:'GauquelinSectorBoundaries',...common(model),
    angles:model.base.angles,sectorBoundariesDeg:boundaries(model),
    plusSectors:Object.freeze([...PLUS].sort((a,b)=>a-b))});
}

/** Sector of an ecliptic longitude with *zero* celestial latitude (method 1). */
export function locateGauquelinEclipticSector(input) {
  const model=validate(input,'longitudeDeg');
  if(!finite(input.longitudeDeg))fail('INVALID_LONGITUDE','Finite ecliptic longitude required');
  const longitudeDeg=normalize360(input.longitudeDeg);
  const point=equatorialFromEcliptic(longitudeDeg,model);
  return Object.freeze({contract:'GauquelinSectorPosition',...common(model),
    method:'ECLIPTIC_POINT',longitudeDeg,body:null,
    ...placement(model,point.rightAscensionDeg,point.declinationDeg)});
}

/** Sector of a real body's equatorial direction, retaining celestial latitude (method 2). */
export function locateGauquelinBodySector(input) {
  const model=validate(input,'body');
  const body=validateBody(input.body,model,input);
  return Object.freeze({contract:'GauquelinSectorPosition',...common(model),
    method:'TRUE_BODY',longitudeDeg:null,body,
    ...placement(model,body.rightAscensionDeg,body.declinationDeg)});
}
