/** Compose the experimental Rust angle provider and five house geometries. */
import { AstrologyError } from './index.mjs';
import { parseUtcGregorianInstant } from './utc-calendar-contract.mjs';
import { calculateVehlowHouseCusps } from './vehlow-houses.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { calculatePlacidusHouseCusps } from './placidus-houses.mjs';
import { calculateRegiomontanusHouseCusps } from './regiomontanus-houses.mjs';
import { calculateKochHouseCusps } from './koch-houses.mjs';

const fail = (code, message) => { throw new AstrologyError(code, message); };
const nonempty = value => typeof value === 'string' && value.length > 0 && value.trim() === value;

/** Inputs include explicit UT1 and TT and a known birth time; no UTC fallback. */
export function calculateHouseSet(input, provider) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    fail('INVALID_INPUT', 'Explicit input object is required');

  // Snapshot each caller-controlled field once before validation or I/O.
  const {
    datetimeUtc, birthTimeKnown, ut1JulianDay, ttJulianDay,
    latitudeDeg, longitudeDegEast, engineVersion, kernelSetId, timeModel,
  } = input;

  if (birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'Known birth time is required');
  if (typeof datetimeUtc !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(datetimeUtc)) {
    fail('INVALID_UTC', 'A valid UTC instant ending Z with at most millisecond precision is required');
  }
  try {
    parseUtcGregorianInstant({
      datetimeUtc,
      calendar: 'PROLEPTIC_GREGORIAN',
      timeScale: 'UTC',
    });
  } catch {
    fail('INVALID_UTC', 'A valid proleptic-Gregorian UTC civil instant is required');
  }
  if (![ut1JulianDay, ttJulianDay].every(value => typeof value === 'number' && Number.isFinite(value)))
    fail('INVALID_INPUT', 'Explicit finite UT1 and TT Julian days are required');
  if (typeof latitudeDeg !== 'number' || !Number.isFinite(latitudeDeg) ||
      latitudeDeg <= -90 || latitudeDeg >= 90)
    fail('INVALID_COORDINATES', 'House calculations require a finite nonpolar latitude strictly between -90 and 90 degrees');
  if (typeof longitudeDegEast !== 'number' || !Number.isFinite(longitudeDegEast) ||
      longitudeDegEast < -180 || longitudeDegEast > 180)
    fail('INVALID_COORDINATES', 'East-positive longitude must be finite within -180..180 degrees');
  if (!nonempty(engineVersion) || !nonempty(kernelSetId) || !nonempty(timeModel))
    fail('INCOMPATIBLE_ANGLE_SOURCE', 'Nonempty pinned engineVersion, kernelSetId and timeModel are required');
  if (!provider || typeof provider.calculateHouseAngles !== 'function')
    fail('INVALID_INPUT', 'Explicit house-angle provider is required');

  const request = Object.freeze({ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast});
  const angles = provider.calculateHouseAngles(request);
  if (!angles || angles.model !== 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME' ||
      angles.ut1JulianDay !== ut1JulianDay || angles.ttJulianDay !== ttJulianDay ||
      angles.latitudeDeg !== latitudeDeg || angles.longitudeDegEast !== longitudeDegEast) {
    fail('INCOMPATIBLE_ANGLE_SOURCE', 'Angle provider metadata must match the request');
  }
  const source = {
    engineVersion,kernelSetId,timeModel,center:'EARTH',frame:'ECLIPTIC_OF_DATE',
    corrections:'IAU2006_2000B_APPROXIMATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg,longitudeDegEast},
  };
  const common = {
    datetimeUtc,birthTimeKnown,ascendantDeg:angles.ascendantDeg,
    midheavenDeg:angles.midheavenDeg,armcDeg:angles.armcDeg,
    trueObliquityDeg:angles.trueObliquityDeg,source,
  };
  const houses = Object.freeze({
    vehlow:calculateVehlowHouseCusps({...common,profile:'VEHLOW_ASC_CENTERED_V1'}),
    porphyry:calculatePorphyryHouseCusps(common),
    placidus:calculatePlacidusHouseCusps(common),
    regiomontanus:calculateRegiomontanusHouseCusps(common),
    koch:calculateKochHouseCusps(common),
  });
  return Object.freeze({
    contract:'ExperimentalHouseSet',contractVersion:'0.1.0-experimental',
    houses,validation:'CALLER_ASSERTED_INPUTS_NOT_INDEPENDENTLY_VERIFIED',
  });
}
