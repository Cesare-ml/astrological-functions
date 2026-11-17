import type { PorphyryHouseInput, PorphyryAngleSource } from './porphyry-houses.mjs';

export type HouseLongitudeBasis =
  | Readonly<{type: 'TROPICAL'}>
  | Readonly<{type: 'SIDEREAL'; ayanamsaId: string}>;

export interface EqualMidheavenHouseInput {
  readonly midheavenLongitudeDeg: number;
  readonly birthTimeKnown: true;
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: HouseLongitudeBasis;
}
export interface WholeAriesHouseInput {
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: HouseLongitudeBasis;
}
export interface HouseExtrasBaseResult {
  readonly contractVersion: '0.1.0-experimental';
  readonly datetimeUtc: string;
  readonly cuspsDeg: readonly number[];
  readonly interpretation: 'FACTS_ONLY';
}
export interface EqualMidheavenHouseCusps extends HouseExtrasBaseResult {
  readonly contract: 'EqualMidheavenHouseCusps';
  readonly houseSystem: 'EQUAL_MIDHEAVEN';
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: HouseLongitudeBasis;
  readonly birthTimeKnown: true;
  readonly midheavenLongitudeDeg: number;
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
}
export interface WholeAriesHouseCusps extends HouseExtrasBaseResult {
  readonly contract: 'WholeAriesHouseCusps';
  readonly houseSystem: 'WHOLE_ARIES';
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: HouseLongitudeBasis;
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
}
export interface SripatiHouseCusps extends HouseExtrasBaseResult {
  readonly contract: 'SripatiHouseCusps';
  readonly houseSystem: 'SRIPATI';
  readonly angles: Readonly<{
    ascendantDeg: number;
    icDeg: number;
    descendantDeg: number;
    midheavenDeg: number;
  }>;
  readonly source: Readonly<PorphyryAngleSource>;
  readonly porphyryCuspsDeg: readonly number[];
  readonly validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}

export declare function calculateEqualMidheavenHouseCusps(
  input: EqualMidheavenHouseInput,
): Readonly<EqualMidheavenHouseCusps>;
export declare function calculateWholeAriesHouseCusps(
  input: WholeAriesHouseInput,
): Readonly<WholeAriesHouseCusps>;
export declare function calculateSripatiHouseCusps(
  input: PorphyryHouseInput,
): Readonly<SripatiHouseCusps>;
