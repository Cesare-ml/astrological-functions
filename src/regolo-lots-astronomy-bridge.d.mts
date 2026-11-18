import type { RegoloKleroiResult } from './regolo-kleroi.mjs';
import type { RegoloArabicPartsInput, RegoloArabicPartsResult } from './regolo-arabic-parts.mjs';

export type RegoloAstroSourcePin = Readonly<{
  engineId: 'VIRGOSTARS_EPHEMERIS';
  engineVersion: string;
  kernelSetId: string;
  timeModelId: string;
}>;

export type RegoloAstroObserver = Readonly<{
  latitudeDeg: number;
  longitudeDegEast: number;
  elevationMeters: number;
}>;

export type RegoloSunHorizonSnapshot = RegoloAstroSourcePin & Readonly<{
  datetimeUtc: string;
  observer: RegoloAstroObserver;
  altitudeType: 'APPARENT_SUN_CENTER_TOPOCENTRIC';
  horizonModelId: string;
  sunAltitudeDeg: number;
  horizonAltitudeDeg: number;
  /** Explicit angular uncertainty. Within this range, sect is unavailable. */
  uncertaintyDeg: number;
  warnings: readonly [];
}>;

export type RegoloPrecedingNewMoon =
  | Readonly<{availability: 'UNAVAILABLE'; reason: 'NOT_COMPUTED' | 'OUT_OF_RANGE' | 'NON_CONVERGENT'}>
  | (RegoloAstroSourcePin & Readonly<{
      availability: 'AVAILABLE';
      relation: 'LATEST_PRECEDING_NEW_MOON';
      eventDatetimeUtc: string;
      moonLongitudeDeg: number;
      center: 'EARTH';
      frame: 'ECLIPTIC_OF_DATE';
      corrections: 'APPARENT';
      zodiac: 'TROPICAL';
      warnings: readonly [];
    }>);

export type RegoloLotsAstronomyBridgeInput = Readonly<{
  datetimeUtc: string;
  observer: RegoloAstroObserver;
  expectedEphemeris: RegoloAstroSourcePin;
  /** Caller must supply matching natal positions and a real Ascendant. */
  natal: Omit<RegoloArabicPartsInput, 'sect' | 'newMoonLongitudeDeg' | 'zodiac'> &
    Readonly<{zodiac: 'TROPICAL'}>;
  sunHorizon: RegoloSunHorizonSnapshot;
  precedingNewMoon: RegoloPrecedingNewMoon;
}>;

export interface RegoloLotsAstronomyBridgeResult {
  readonly contract: 'RegoloLotsAstronomyBridgeResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly datetimeUtc: string;
  readonly observer: RegoloAstroObserver;
  readonly expectedEphemeris: RegoloAstroSourcePin;
  readonly sect: 'DAY' | 'NIGHT';
  readonly horizon: Readonly<{
    sect: 'DAY' | 'NIGHT';
    sunAltitudeDeg: number;
    horizonAltitudeDeg: number;
    uncertaintyDeg: number;
    horizonModelId: string;
    clearanceDeg: number;
  }>;
  readonly precedingNewMoon: Readonly<
    {availability: 'UNAVAILABLE'; reason: 'NOT_COMPUTED' | 'OUT_OF_RANGE' | 'NON_CONVERGENT'} |
    {availability: 'AVAILABLE'; eventDatetimeUtc: string; moonLongitudeDeg: number; ageDays: number}
  >;
  readonly kleroi: Readonly<RegoloKleroiResult>;
  readonly arabicParts: Readonly<RegoloArabicPartsResult>;
  readonly scientificEvidence: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly warnings: readonly string[];
}

export declare function calculateRegoloLotsFromAstronomicalFacts(
  input: RegoloLotsAstronomyBridgeInput,
): Readonly<RegoloLotsAstronomyBridgeResult>;
