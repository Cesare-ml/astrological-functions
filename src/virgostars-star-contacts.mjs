/** Pure, caller-provided stellar contact geometry. No ephemeris or I/O. */
import {angularSeparation} from './index.mjs';
const finite = x => typeof x==='number' && Number.isFinite(x);
export function calculateVirgoStarsStarContacts(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||
    !finite(input.longitudeDeg)||!finite(input.trueAltitudeDeg)||
    !finite(input.azimuthDeg)||!finite(input.orbDeg)||
    input.orbDeg<0||input.orbDeg>180||!input.points||
    typeof input.points!=='object'||Array.isArray(input.points))
    throw new TypeError('Finite longitudes, true altitude, north-east azimuth, orb and points are required');
  const conjunctions=[];
  for(const [name,lon] of Object.entries(input.points)) {
    if(!name.trim()||!finite(lon)) throw new TypeError('Invalid stellar contact point');
    if(angularSeparation(input.longitudeDeg,lon)<=input.orbDeg+1e-12) conjunctions.push(name);
  }
  const direction=((input.azimuthDeg%360)+360)%360;
  const axis=Math.abs(input.trueAltitudeDeg)<=input.orbDeg
    ? (direction<180?'AS':'DS') : null;
  return Object.freeze({conjunctions:Object.freeze(conjunctions),axis});
}
