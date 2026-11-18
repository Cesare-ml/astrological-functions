/** Opt-in historical UT1/TT house cusps from the VirgoStars Node angle provider. */
import { AstrologyError } from './index.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { calculatePlacidusHouseCusps } from './placidus-houses.mjs';
import { calculateRegiomontanusHouseCusps } from './regiomontanus-houses.mjs';
import { calculateKochHouseCusps } from './koch-houses.mjs';

const methods = Object.freeze({PORPHYRY: calculatePorphyryHouseCusps,
  PLACIDUS: calculatePlacidusHouseCusps, REGIOMONTANUS: calculateRegiomontanusHouseCusps,
  KOCH: calculateKochHouseCusps});
const fail = (code, message) => { throw new AstrologyError(code, message); };
const model = 'EXPERIMENTAL_LONG_TERM_SIDEREAL_TIME';
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 128 &&
  value === value.trim() && !/[\x00-\x1f\x7f]/.test(value);

/** No UTC is manufactured: date, offset and Delta T must be resolved by the caller. */
export async function calculateHistoricalHouse(request, provider) {
  if (!request || typeof request !== 'object' || !Object.hasOwn(methods, request.houseSystem))
    fail('UNSUPPORTED_HOUSE_SYSTEM', 'Select PORPHYRY, PLACIDUS, REGIOMONTANUS or KOCH');
  if (request.birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'A known birth time must be explicitly confirmed');
  const {ut1JulianDay, ttJulianDay, latitudeDeg, longitudeDegEast, engineVersion} = request;
  if (![ut1JulianDay, ttJulianDay, latitudeDeg, longitudeDegEast].every(Number.isFinite) ||
      Math.abs(latitudeDeg) >= 90 || Math.abs(longitudeDegEast) > 180 || !identifier(engineVersion))
    fail('INVALID_INPUT', 'Explicit finite UT1, TT, observer and engine version are required');
  if (!provider || typeof provider.calculateHouseAngles !== 'function')
    fail('INVALID_HOUSE_PROVIDER', 'The experimental long-term angle provider is required');
  const args = {ut1JulianDay, ttJulianDay, latitudeDeg, longitudeDegEast};
  const angles = await provider.calculateHouseAngles(Object.freeze(args));
  if (!angles || angles.model !== model || Object.keys(args).some(key => angles[key] !== args[key]) ||
      !['armcDeg', 'trueObliquityDeg', 'ascendantDeg', 'midheavenDeg'].every(key => Number.isFinite(angles[key])) ||
      angles.trueObliquityDeg <= 0 || angles.trueObliquityDeg >= 90)
    fail('INCOMPATIBLE_ANGLE_SOURCE', 'Angle model, epoch and observer must match the request');
  const source = {engineVersion, kernelSetId: 'NOT_USED_FOR_HOUSE_ANGLES', timeModel: 'EXPLICIT_UT1_TT',
    center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
    observer: {latitudeDeg, longitudeDegEast}};
  const result = methods[request.houseSystem]({epochUt1JulianDay: ut1JulianDay,
    birthTimeKnown: true, source, ascendantDeg: angles.ascendantDeg, midheavenDeg: angles.midheavenDeg,
    armcDeg: angles.armcDeg, trueObliquityDeg: angles.trueObliquityDeg});
  return Object.freeze({contract: 'ExperimentalHistoricalHouse', houseSystem: request.houseSystem,
    ut1JulianDay, ttJulianDay, angleModel: model, engineVersion, result,
    validation: 'CALLER_ASSERTED_PROVIDER_NOT_INDEPENDENTLY_VERIFIED'});
}
