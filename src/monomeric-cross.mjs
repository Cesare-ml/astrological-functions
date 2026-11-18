/**
 * Geometric facts of the four-armed monomeric cross (Angelini-style layout).
 *
 * This module deliberately does not identify the planetary-hour ruler, look up
 * historical Serto di Iside descriptions, or guess how a source numbers degrees.
 * Those are separate, provenance-sensitive inputs from the consuming app.
 */
import { locateLongitudeInHouses, normalize360 } from './index.mjs';

export class MonomericCrossError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MonomericCrossError';
    this.code = code;
  }
}

export const TRADITIONAL_SIGN_RULERS = Object.freeze([
  'MARS', 'VENUS', 'MERCURY', 'MOON', 'SUN', 'MERCURY',
  'VENUS', 'MARS', 'JUPITER', 'SATURN', 'SATURN', 'JUPITER',
]);
const PLANETS = Object.freeze([
  'SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN',
]);
const OFFSETS = Object.freeze([
  Object.freeze(['master', 0]),
  Object.freeze(['square-left', 90]),
  Object.freeze(['square-right', 270]),
  Object.freeze(['opposite', 180]),
]);

function error(code, detail) { throw new MonomericCrossError(code, detail); }

/**
 * @param {{hourRuler:string, planetLongitudesDeg:Record<string,number>,
 * houseCuspsDeg:number[], houseSystemId:string}} input
 * @returns {{contract:string,contractVersion:string,hourRuler:string,
 * houseSystemId:string,arms:Array<object>,catalogStatus:string}}
 */
export function buildMonomericCrossGeometry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    error('INVALID_INPUT', 'An explicit input object is required');
  const { hourRuler, planetLongitudesDeg, houseCuspsDeg, houseSystemId } = input;
  if (!PLANETS.includes(hourRuler))
    error('INVALID_HOUR_RULER', 'A validated traditional planetary-hour ruler is required');
  if (typeof houseSystemId !== 'string' || !houseSystemId.trim())
    error('INVALID_HOUSE_SYSTEM', 'A named house system is required');
  if (!planetLongitudesDeg || typeof planetLongitudesDeg !== 'object' || Array.isArray(planetLongitudesDeg))
    error('INVALID_PLANETS', 'An object of planetary longitudes is required');
  for (const name of PLANETS) {
    const longitude = planetLongitudesDeg[name];
    if (typeof longitude !== 'number' || !Number.isFinite(longitude))
      error('MISSING_PLANET', `A finite ecliptic longitude is required for ${name}`);
  }
  if (!Array.isArray(houseCuspsDeg) || houseCuspsDeg.length !== 12 ||
      houseCuspsDeg.some(value => typeof value !== 'number' || !Number.isFinite(value)))
    error('INVALID_HOUSES', 'Twelve finite house cusps are required');

  const masterLongitude = normalize360(planetLongitudesDeg[hourRuler]);
  const arms = OFFSETS.map(([role, offsetDeg]) => {
    const longitudeDeg = normalize360(masterLongitude + offsetDeg);
    const signIndex = Math.floor(longitudeDeg / 30);
    const degreeWithinSign = longitudeDeg - signIndex * 30;
    const signRuler = TRADITIONAL_SIGN_RULERS[signIndex];
    const rulerLongitudeDeg = normalize360(planetLongitudesDeg[signRuler]);
    return Object.freeze({
      role, offsetDeg, longitudeDeg, signIndex, degreeWithinSign,
      /** Coordinate only. NOT an ordinal in any historical monomer catalog. */
      geometricDegreeIndex: Math.floor(degreeWithinSign),
      house: locateLongitudeInHouses(longitudeDeg, houseCuspsDeg).house,
      signRuler, rulerLongitudeDeg,
      rulerHouse: locateLongitudeInHouses(rulerLongitudeDeg, houseCuspsDeg).house,
    });
  });
  return Object.freeze({
    contract: 'MonomericCrossGeometry', contractVersion: '1.0.0',
    hourRuler, houseSystemId, catalogStatus: 'UNRESOLVED',
    arms: Object.freeze(arms),
  });
}
