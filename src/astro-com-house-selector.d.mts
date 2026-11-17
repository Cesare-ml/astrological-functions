/**
 * Exact method-specific input contracts; this catalogue never manufactures
 * astronomical inputs or treats experimental implementations as validated.
 */
type MethodFunctions = {
  PLACIDUS: typeof import('./placidus-houses.mjs').calculatePlacidusHouseCusps;
  KOCH: typeof import('./koch-houses.mjs').calculateKochHouseCusps;
  CAMPANUS: typeof import('./diurnal-house-cusps.mjs').calculateCampanusHouseCusps;
  REGIOMONTANUS: typeof import('./regiomontanus-houses.mjs').calculateRegiomontanusHouseCusps;
  EQUAL_ASCENDANT: typeof import('./equal-house-cusps.mjs').calculateEqualHouseCusps;
  EQUAL_MIDHEAVEN: typeof import('./house-systems-extras.mjs').calculateEqualMidheavenHouseCusps;
  VEHLOW: typeof import('./vehlow-houses.mjs').calculateVehlowHouseCusps;
  WHOLE_SIGN: typeof import('./whole-sign-house-cusps.mjs').calculateWholeSignHouseCusps;
  WHOLE_ARIES: typeof import('./house-systems-extras.mjs').calculateWholeAriesHouseCusps;
  MERIDIAN: typeof import('./axial-house-cusps.mjs').calculateMeridianHouseCusps;
  PORPHYRY: typeof import('./porphyry-houses.mjs').calculatePorphyryHouseCusps;
  ALCABITIUS: typeof import('./diurnal-house-cusps.mjs').calculateAlcabitiusHouseCusps;
  KRUSINSKI_PISA_GOELZER: typeof import('./horizon-house-cusps.mjs').calculateKrusinskiPisaGoelzerHouseCusps;
  AZIMUTH: typeof import('./horizon-house-cusps.mjs').calculateAzimuthHouseCusps;
  MORINUS: typeof import('./axial-house-cusps.mjs').calculateMorinusHouseCusps;
  POLICH_PAGE: typeof import('./diurnal-house-cusps.mjs').calculatePolichPageHouseCusps;
  APC: typeof import('./declination-arc-house-cusps.mjs').calculateApcHouseCusps;
  PULLEN_SD: typeof import('./pullen-house-cusps.mjs').calculatePullenSinusoidalDeltaHouseCusps;
  PULLEN_SR: typeof import('./pullen-house-cusps.mjs').calculatePullenSinusoidalRatioHouseCusps;
  SRIPATI: typeof import('./house-systems-extras.mjs').calculateSripatiHouseCusps;
  CARTER_POLI_EQUATORIAL: typeof import('./axial-house-cusps.mjs').calculateCarterPoliEquatorialHouseCusps;
  SUNSHINE: typeof import('./declination-arc-house-cusps.mjs').calculateSunshineHouseCusps;
  GAUQUELIN_36: typeof import('./gauquelin-sectors.mjs').calculateGauquelinSectors;
  ALBATEGNIUS: typeof import('./albategnius-house-cusps.mjs').calculateAlbategniusHouseCusps;
};

export type AstroComHouseSystemId = keyof MethodFunctions;
export type AstroComHouseMethodRequest = {
  [Id in AstroComHouseSystemId]: Readonly<{
    houseSystem: Id;
    input: Parameters<MethodFunctions[Id]>[0];
  }>;
}[AstroComHouseSystemId];
export type AstroComHouseMethodResult = {
  [Id in AstroComHouseSystemId]: ReturnType<MethodFunctions[Id]>;
}[AstroComHouseSystemId];

export type AstroComHouseMethodDescriptor = {
  [Id in AstroComHouseSystemId]: Readonly<{
    houseSystem: Id;
    resultKind: Id extends 'GAUQUELIN_36' ? 'SECTORS_36' : 'HOUSES_12';
    validationStatus: 'IMPLEMENTED_ISOLATED';
    requiresExternalSunDeclination: Id extends 'SUNSHINE' ? true : false;
  }>;
}[AstroComHouseSystemId];

/** Exactly 24 named selector methods, excluding "Default (Placidus)" UI alias. */
export declare const ASTRO_COM_HOUSE_SYSTEM_IDS: readonly AstroComHouseSystemId[];
export declare const ASTRO_COM_HOUSE_METHODS: readonly AstroComHouseMethodDescriptor[];

/**
 * No fallback: preserves original validation errors, result contract, source
 * metadata, and any unsupported polar/unavailable condition.
 */
export declare function calculateAstroComHouseMethod(
  request: AstroComHouseMethodRequest,
): AstroComHouseMethodResult;
