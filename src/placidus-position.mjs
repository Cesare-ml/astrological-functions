/** Experimental Placidus planetary position by division of diurnal semi-arcs. */
import {AstrologyError, normalize360, signedAngularDistance} from './index.mjs';

const rad=Math.PI/180;
const fail=(code,message)=>{throw new AstrologyError(code,message);};

/**
 * Caller supplies tropical ecliptic-of-date coordinates and a consistent
 * of-date ARMC and obliquity, in degrees. A point exactly at a celestial pole
 * or without a distinct rise/set has no defined semi-arc in this model.
 * The caller is responsible for matching epochs, frames and corrections.
 */
export function calculatePlacidusHousePosition(input) {
  if(!input || typeof input!=='object') fail('INVALID_INPUT','Explicit house-position inputs are required');
  const {armcDeg,latitudeDeg,trueObliquityDeg,eclipticLongitudeDeg,eclipticLatitudeDeg,frame,zodiac,birthTimeKnown}=input;
  if(birthTimeKnown!==true) fail('BIRTH_TIME_REQUIRED','A known birth time is required');
  if(frame!=='ECLIPTIC_OF_DATE' || zodiac!=='TROPICAL') fail('INCOMPATIBLE_FRAME','Explicit tropical ecliptic-of-date coordinates are required');
  if(![armcDeg,latitudeDeg,trueObliquityDeg,eclipticLongitudeDeg,eclipticLatitudeDeg].every(Number.isFinite) ||
     armcDeg<0 || armcDeg>=360 || latitudeDeg<=-90 || latitudeDeg>=90 || trueObliquityDeg<=0 || trueObliquityDeg>=90 ||
     eclipticLongitudeDeg<0 || eclipticLongitudeDeg>=360 || Math.abs(eclipticLatitudeDeg)>90)
    fail('INVALID_ANGLES','ARMC and longitude must be in [0,360); latitude and obliquity must be physically valid');

  const lambda=eclipticLongitudeDeg*rad, beta=eclipticLatitudeDeg*rad, epsilon=trueObliquityDeg*rad;
  const cosBeta=Math.cos(beta);
  const x=cosBeta*Math.cos(lambda);
  const y=cosBeta*Math.sin(lambda)*Math.cos(epsilon)-Math.sin(beta)*Math.sin(epsilon);
  const z=cosBeta*Math.sin(lambda)*Math.sin(epsilon)+Math.sin(beta)*Math.cos(epsilon);
  const equatorialRadius=Math.hypot(x,y);
  if(equatorialRadius<=32*Number.EPSILON) fail('SINGULAR_DIRECTION','Right ascension is undefined at the celestial pole');
  const rightAscensionDeg=normalize360(Math.atan2(y,x)/rad);
  const declinationDeg=Math.atan2(z,equatorialRadius)/rad;
  const hourAngleDeg=signedAngularDistance(rightAscensionDeg,armcDeg);
  const riseTerm=Math.tan(latitudeDeg*rad)*Math.tan(declinationDeg*rad);
  if(!Number.isFinite(riseTerm) || Math.abs(riseTerm)>=1) fail('CIRCUMPOLAR_POSITION_UNAVAILABLE','No distinct rising and setting semi-arcs for this direction');
  const diurnalSemiArcDeg=90+Math.asin(riseTerm)/rad;
  let position;
  if(hourAngleDeg>=0 && hourAngleDeg<=diurnalSemiArcDeg) position=10-3*hourAngleDeg/diurnalSemiArcDeg;
  else if(hourAngleDeg>diurnalSemiArcDeg) position=7-3*(hourAngleDeg-diurnalSemiArcDeg)/(180-diurnalSemiArcDeg);
  else if(hourAngleDeg>=-diurnalSemiArcDeg) position=10-3*hourAngleDeg/diurnalSemiArcDeg;
  else position=1+3*(-hourAngleDeg-diurnalSemiArcDeg)/(180-diurnalSemiArcDeg);
  if(position>=13) position-=12;
  if(!Number.isFinite(position) || position<1 || position>=13) fail('INVALID_GEOMETRY','Calculated house position is outside the valid interval');
  return Object.freeze({contract:'PlacidusHousePosition',contractVersion:'0.1.0-experimental',houseSystem:'PLACIDUS',
    housePosition:position,house:Math.floor(position),rightAscensionDeg,declinationDeg,hourAngleDeg,diurnalSemiArcDeg,
    input:Object.freeze({armcDeg,latitudeDeg,trueObliquityDeg,eclipticLongitudeDeg,eclipticLatitudeDeg,frame,zodiac,birthTimeKnown}),
    validation:'CALLER_ASSERTED_EPOCH_FRAME_AND_CORRECTIONS'});
}
