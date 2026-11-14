/** Compose the experimental Rust angle provider and five house geometries. */
import { AstrologyError } from './index.mjs';
import { calculateVehlowHouseCusps } from './vehlow-houses.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { calculatePlacidusHouseCusps } from './placidus-houses.mjs';
import { calculateRegiomontanusHouseCusps } from './regiomontanus-houses.mjs';
import { calculateKochHouseCusps } from './koch-houses.mjs';

/** Inputs include explicit UT1 and TT and a known birth time; no UTC fallback. */
export function calculateHouseSet(input, provider) {
  if (!input || typeof input !== 'object' || !provider || typeof provider.calculateHouseAngles !== 'function') throw new AstrologyError('INVALID_INPUT','Explicit input and house-angle provider are required');
  const {datetimeUtc,birthTimeKnown,ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast,engineVersion,kernelSetId,timeModel}=input;
  if (birthTimeKnown !== true) throw new AstrologyError('BIRTH_TIME_REQUIRED','Known birth time is required');
  if (![ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast].every(Number.isFinite)) throw new AstrologyError('INVALID_INPUT','Explicit finite UT1, TT, latitude and longitude are required');
  const angles=provider.calculateHouseAngles({ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast});
  if (!angles || angles.model !== 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME' || angles.ut1JulianDay !== ut1JulianDay || angles.ttJulianDay !== ttJulianDay || angles.latitudeDeg !== latitudeDeg || angles.longitudeDegEast !== longitudeDegEast) throw new AstrologyError('INCOMPATIBLE_ANGLE_SOURCE','Angle provider metadata must match the request');
  const source={engineVersion,kernelSetId,timeModel,center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'IAU2006_2000B_APPROXIMATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',observer:{latitudeDeg,longitudeDegEast}};
  const common={datetimeUtc,birthTimeKnown,ascendantDeg:angles.ascendantDeg,midheavenDeg:angles.midheavenDeg,armcDeg:angles.armcDeg,trueObliquityDeg:angles.trueObliquityDeg,source};
  const houses=Object.freeze({
    vehlow:calculateVehlowHouseCusps({...common,profile:'VEHLOW_ASC_CENTERED_V1'}),
    porphyry:calculatePorphyryHouseCusps(common),
    placidus:calculatePlacidusHouseCusps(common),
    regiomontanus:calculateRegiomontanusHouseCusps(common),
    koch:calculateKochHouseCusps(common),
  });
  return Object.freeze({contract:'ExperimentalHouseSet',contractVersion:'0.1.0-experimental',houses,validation:'CALLER_ASSERTED_INPUTS_NOT_INDEPENDENTLY_VERIFIED'});
}
