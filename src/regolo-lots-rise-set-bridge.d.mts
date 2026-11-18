import type { RegoloAstroObserver, RegoloAstroSourcePin, RegoloPrecedingNewMoon } from './regolo-lots-astronomy-bridge.mjs';
import type { RegoloArabicPartsInput, RegoloArabicPartsResult } from './regolo-arabic-parts.mjs';
import type { RegoloKleroiResult } from './regolo-kleroi.mjs';

/** Strict subset of VirgoStars-Ephemeris `bindings/node/index.d.ts` Engine. */
export type VirgoStarsRiseSetEngine = Readonly<{
  riseTransUt(
    jdUt: number, ipl: number, rsmi: number, lonDegEast: number, latDeg: number,
    geoaltM: number, pressureHpa: number, temperatureC: number,
    searchDays?: number,
  ): number | null;
}>;

export type RegoloRiseSetSolarModel = Readonly<{
  /** 0 requests the engine's own estimated pressure at elevation. */
  pressureHpa: number;
  temperatureC: number;
  /** Declared uncertainty around event crossing; sect fails closed inside it. */
  boundaryUncertaintySeconds: number;
}>;

export type RegoloLotsRiseSetBridgeInput = Readonly<{
  datetimeUtc: string;
  /** UT1−UTC; must be caller-declared and between −1 and 1 seconds. */
  ut1MinusUtcSeconds: number;
  observer: RegoloAstroObserver;
  expectedEphemeris: RegoloAstroSourcePin;
  natal: Omit<RegoloArabicPartsInput, 'sect' | 'newMoonLongitudeDeg' | 'zodiac'> &
    Readonly<{zodiac: 'TROPICAL'}>;
  precedingNewMoon: RegoloPrecedingNewMoon;
  solarModel: RegoloRiseSetSolarModel;
  /** Injection is structural and does NOT authenticate the engine binary. */
  engine: VirgoStarsRiseSetEngine;
}>;

export type RegoloLotsRiseSetBridgeResult = Readonly<{
  contract: 'RegoloLotsRiseSetBridgeResult';
  contractVersion: '0.1.0-experimental';
  datetimeUtc: string;
  observer: RegoloAstroObserver;
  expectedEphemeris: RegoloAstroSourcePin;
  sect: 'DAY' | 'NIGHT';
  solarEvents: Readonly<{
    lastRiseJdUt: number;
    lastSetJdUt: number;
    nextRiseJdUt: number | null;
    nextSetJdUt: number | null;
    nearestBoundarySeconds: number;
    model: 'APPARENT_REFRACTED_SUN_DISC_CENTRE';
    pressureHpa: number;
    temperatureC: number;
    boundaryUncertaintySeconds: number;
    ut1MinusUtcSeconds: number;
  }>;
  precedingNewMoon: Readonly<
    {availability: 'UNAVAILABLE'; reason: 'NOT_COMPUTED' | 'OUT_OF_RANGE' | 'NON_CONVERGENT'} |
    {availability: 'AVAILABLE'; eventDatetimeUtc: string; moonLongitudeDeg: number; ageDays: number}
  >;
  kleroi: Readonly<RegoloKleroiResult>;
  arabicParts: Readonly<RegoloArabicPartsResult>;
  scientificEvidence: 'INJECTED_EPHEMERIS_ENGINE_NOT_AUTHENTICATED';
  warnings: readonly string[];
}>;

export declare function calculateRegoloLotsFromVirgoStarsRiseSet(
  input: RegoloLotsRiseSetBridgeInput,
): RegoloLotsRiseSetBridgeResult;
