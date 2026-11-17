/**
 * Opt-in Astro.com selector adapter for independently implemented experimental
 * house methods. Input astronomy is always caller-supplied; this adapter never
 * derives angles, selects a provider, or substitutes a different house system.
 */
import { AstrologyError } from './index.mjs';
import { calculatePlacidusHouseCusps } from './placidus-houses.mjs';
import { calculateKochHouseCusps } from './koch-houses.mjs';
import { calculateCampanusHouseCusps, calculateAlcabitiusHouseCusps,
  calculatePolichPageHouseCusps } from './diurnal-house-cusps.mjs';
import { calculateRegiomontanusHouseCusps } from './regiomontanus-houses.mjs';
import { calculateEqualHouseCusps } from './equal-house-cusps.mjs';
import { calculateEqualMidheavenHouseCusps, calculateWholeAriesHouseCusps,
  calculateSripatiHouseCusps } from './house-systems-extras.mjs';
import { calculateVehlowHouseCusps } from './vehlow-houses.mjs';
import { calculateWholeSignHouseCusps } from './whole-sign-house-cusps.mjs';
import { calculateMeridianHouseCusps, calculateMorinusHouseCusps,
  calculateCarterPoliEquatorialHouseCusps } from './axial-house-cusps.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';
import { calculateKrusinskiPisaGoelzerHouseCusps,
  calculateAzimuthHouseCusps } from './horizon-house-cusps.mjs';
import { calculateApcHouseCusps, calculateSunshineHouseCusps } from './declination-arc-house-cusps.mjs';
import { calculatePullenSinusoidalDeltaHouseCusps,
  calculatePullenSinusoidalRatioHouseCusps } from './pullen-house-cusps.mjs';
import { calculateGauquelinSectors } from './gauquelin-sectors.mjs';
import { calculateAlbategniusHouseCusps } from './albategnius-house-cusps.mjs';

// Order exactly follows the 24 named Astro.com selector methods. Its
// "Default (Placidus)" UI entry is intentionally not a 25th algorithm.
const METHODS = Object.freeze([
  ['PLACIDUS', calculatePlacidusHouseCusps],
  ['KOCH', calculateKochHouseCusps],
  ['CAMPANUS', calculateCampanusHouseCusps],
  ['REGIOMONTANUS', calculateRegiomontanusHouseCusps],
  ['EQUAL_ASCENDANT', calculateEqualHouseCusps],
  ['EQUAL_MIDHEAVEN', calculateEqualMidheavenHouseCusps],
  ['VEHLOW', calculateVehlowHouseCusps],
  ['WHOLE_SIGN', calculateWholeSignHouseCusps],
  ['WHOLE_ARIES', calculateWholeAriesHouseCusps],
  ['MERIDIAN', calculateMeridianHouseCusps],
  ['PORPHYRY', calculatePorphyryHouseCusps],
  ['ALCABITIUS', calculateAlcabitiusHouseCusps],
  ['KRUSINSKI_PISA_GOELZER', calculateKrusinskiPisaGoelzerHouseCusps],
  ['AZIMUTH', calculateAzimuthHouseCusps],
  ['MORINUS', calculateMorinusHouseCusps],
  ['POLICH_PAGE', calculatePolichPageHouseCusps],
  ['APC', calculateApcHouseCusps],
  ['PULLEN_SD', calculatePullenSinusoidalDeltaHouseCusps],
  ['PULLEN_SR', calculatePullenSinusoidalRatioHouseCusps],
  ['SRIPATI', calculateSripatiHouseCusps],
  ['CARTER_POLI_EQUATORIAL', calculateCarterPoliEquatorialHouseCusps],
  ['SUNSHINE', calculateSunshineHouseCusps],
  ['GAUQUELIN_36', calculateGauquelinSectors],
  ['ALBATEGNIUS', calculateAlbategniusHouseCusps],
].map(([houseSystem, calculate]) => Object.freeze({ houseSystem, calculate })));

const BY_ID = new Map(METHODS.map(({ houseSystem, calculate }) => [houseSystem, calculate]));
export const ASTRO_COM_HOUSE_SYSTEM_IDS = Object.freeze(METHODS.map(({ houseSystem }) => houseSystem));

/**
 * Selector metadata is a catalogue of experimental implementation coverage,
 * NOT a claim of scientific validation or high-latitude availability.
 */
export const ASTRO_COM_HOUSE_METHODS = Object.freeze(METHODS.map(({ houseSystem }) => Object.freeze({
  houseSystem,
  resultKind: houseSystem === 'GAUQUELIN_36' ? 'SECTORS_36' : 'HOUSES_12',
  validationStatus: 'IMPLEMENTED_ISOLATED',
  requiresExternalSunDeclination: houseSystem === 'SUNSHINE',
})));

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/**
 * Dispatch strictly on canonical IDs and pass the original method-specific
 * input unchanged. In particular, Gauquelin returns 36 clockwise sector
 * boundaries, never a twelve-cusp house result.
 */
export function calculateAstroComHouseMethod(request) {
  if (!plainObject(request) || Object.keys(request).some(key => key !== 'houseSystem' && key !== 'input') ||
      !Object.hasOwn(request, 'houseSystem') || !Object.hasOwn(request, 'input')) {
    throw new AstrologyError('INVALID_HOUSE_METHOD_REQUEST',
      'Expected a plain request with exactly houseSystem and input');
  }
  if (typeof request.houseSystem !== 'string' || !BY_ID.has(request.houseSystem)) {
    throw new AstrologyError('UNSUPPORTED_HOUSE_SYSTEM',
      'houseSystem must be one of the 24 explicit Astro.com method IDs');
  }
  if (!plainObject(request.input)) {
    throw new AstrologyError('INVALID_HOUSE_METHOD_REQUEST',
      'input must be a plain method-specific object');
  }
  // Existing method validation and typed errors are preserved intact.
  return BY_ID.get(request.houseSystem)(request.input);
}
