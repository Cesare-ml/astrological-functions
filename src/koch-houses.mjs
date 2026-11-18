/** Experimental Koch birthplace cusp geometry from explicit angles. */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';
import { calculateRegiomontanusHouseCusps } from './regiomontanus-houses.mjs';

const rad=Math.PI/180;
const fail=(code,message)=>{throw new AstrologyError(code,message);};

/** Divide the Midheaven's rising-to-meridian arc into thirds. */
export function calculateKochHouseCusps(input) {
  const base=calculateRegiomontanusHouseCusps(input);
  const theta=base.armcDeg, epsilon=base.trueObliquityDeg*rad;
  const latitude=base.source.observer.latitudeDeg*rad;
  const declination=Math.asin(Math.sin(epsilon)*Math.sin(base.angles.midheavenDeg*rad));
  const hCos=-Math.tan(latitude)*Math.tan(declination);
  if (hCos <= -1 || hCos >= 1) fail('POLAR_HOUSES_UNAVAILABLE','Koch requires a rising and setting Midheaven');
  const semiArc=Math.acos(hCos)/rad;
  const ascAt=angle=>{
    const t=angle*rad;
    const x=Math.sin(epsilon)*Math.tan(latitude)+Math.cos(epsilon)*Math.sin(t), y=-Math.cos(t);
    if(Math.hypot(x,y)<1e-14)fail('INVALID_GEOMETRY','Undefined horizon intersection');
    return normalize360(Math.atan2(y,x)/rad+180);
  };
  const c11=ascAt(theta-2*semiArc/3),c12=ascAt(theta-semiArc/3);
  const c2=ascAt(theta+semiArc/3),c3=ascAt(theta+2*semiArc/3);
  const opposite=x=>normalize360(x+180);
  const asc=base.angles.ascendantDeg,mc=base.angles.midheavenDeg;
  const cuspsDeg=Object.freeze([asc,c2,c3,base.angles.icDeg,opposite(c11),opposite(c12),opposite(asc),opposite(c2),opposite(c3),mc,c11,c12]);
  locateLongitudeInHouses(asc,cuspsDeg);
  return Object.freeze({contract:'KochHouseCusps',contractVersion:'0.1.0-experimental',houseSystem:'KOCH',...(base.epochUt1JulianDay !== undefined ? {epochUt1JulianDay:base.epochUt1JulianDay} : {datetimeUtc:base.datetimeUtc}),angles:base.angles,armcDeg:theta,trueObliquityDeg:base.trueObliquityDeg,cuspsDeg,source:base.source,validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'});
}
