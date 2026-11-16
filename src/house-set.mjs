/** Compose the experimental Rust angle provider and five house geometries. */
import { AstrologyError } from './index.mjs';
import { calculateVehlowHouseCusps } from './vehlow-houses.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { calculatePlacidusHouseCusps } from './placidus-houses.mjs';
import { calculateRegiomontanusHouseCusps } from './regiomontanus-houses.mjs';
import { calculateKochHouseCusps } from './koch-houses.mjs';

function validUtcInstant(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match || Number(match[1].slice(0, 4)) === 0) return false;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return false;
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  return new Date(milliseconds).toISOString() === canonical;
}

function validIdentifier(value) {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

/** Inputs include explicit UT1 and TT and a known birth time; no UTC fallback. */
export function calculateHouseSet(input, provider) {
  if (!input || typeof input !== 'object' || !provider ||
      (typeof provider !== 'object' && typeof provider !== 'function'))
    throw new AstrologyError('INVALID_INPUT', 'Explicit input and house-angle provider are required');

  // Read each request field once before validation/provider I/O.
  const {
    datetimeUtc,birthTimeKnown,ut1JulianDay,ttJulianDay,
    latitudeDeg,longitudeDegEast,engineVersion,kernelSetId,timeModel,
  } = input;

  if (birthTimeKnown !== true)
    throw new AstrologyError('BIRTH_TIME_REQUIRED', 'Known birth time is required');
  if (!validUtcInstant(datetimeUtc))
    throw new AstrologyError('INVALID_UTC', 'A real ISO UTC instant with seconds and up to 3 fractional digits is required');
  if (![ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast].every(Number.isFinite))
    throw new AstrologyError('INVALID_INPUT', 'Explicit finite UT1, TT, latitude and longitude are required');
  if (Math.abs(latitudeDeg) >= 90 || longitudeDegEast < -180 || longitudeDegEast > 180)
    throw new AstrologyError('INVALID_INPUT', 'A nonpolar observer with valid geographic coordinates is required');
  if (![engineVersion,kernelSetId,timeModel].every(validIdentifier))
    throw new AstrologyError('INVALID_INPUT', 'Nonempty pinned engineVersion, kernelSetId and timeModel are required');

  // Pin the callable once; an accessor cannot swap the function between the
  // type check and invocation.
  const calculateHouseAngles = provider.calculateHouseAngles;
  if (typeof calculateHouseAngles !== 'function')
    throw new AstrologyError('INVALID_INPUT', 'Explicit input and house-angle provider are required');
  const angles = calculateHouseAngles.call(provider, {ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast});
  if (!angles || angles.model !== 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME' ||
      angles.ut1JulianDay !== ut1JulianDay || angles.ttJulianDay !== ttJulianDay ||
      angles.latitudeDeg !== latitudeDeg || angles.longitudeDegEast !== longitudeDegEast)
    throw new AstrologyError('INCOMPATIBLE_ANGLE_SOURCE', 'Angle provider metadata must match the request');

  const source={engineVersion,kernelSetId,timeModel,center:'EARTH',frame:'ECLIPTIC_OF_DATE',
    corrections:'IAU2006_2000B_APPROXIMATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg,longitudeDegEast}};
  const common={datetimeUtc,birthTimeKnown,ascendantDeg:angles.ascendantDeg,
    midheavenDeg:angles.midheavenDeg,armcDeg:angles.armcDeg,
    trueObliquityDeg:angles.trueObliquityDeg,source};
  const houses=Object.freeze({
    vehlow:calculateVehlowHouseCusps({...common,profile:'VEHLOW_ASC_CENTERED_V1'}),
    porphyry:calculatePorphyryHouseCusps(common),
    placidus:calculatePlacidusHouseCusps(common),
    regiomontanus:calculateRegiomontanusHouseCusps(common),
    koch:calculateKochHouseCusps(common),
  });
  return Object.freeze({contract:'ExperimentalHouseSet',contractVersion:'0.1.0-experimental',
    houses,validation:'CALLER_ASSERTED_INPUTS_NOT_INDEPENDENTLY_VERIFIED'});
}
