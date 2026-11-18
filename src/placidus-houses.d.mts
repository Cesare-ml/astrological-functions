import type { PorphyryHouseInput, PorphyryHouseCusps } from './porphyry-houses.mjs';

/** Explicit caller-supplied astronomical geometry; no UTC-to-UT1 conversion. */
export interface PlacidusHouseInput extends PorphyryHouseInput {
  readonly birthTimeKnown: true;
  readonly armcDeg: number;
  readonly trueObliquityDeg: number;
}
export interface PlacidusHouseCusps {
  readonly contract: 'PlacidusHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'PLACIDUS';
  readonly datetimeUtc: string;
  readonly angles: PorphyryHouseCusps['angles'];
  readonly armcDeg: number;
  readonly trueObliquityDeg: number;
  readonly cuspsDeg: readonly number[];
  readonly source: PorphyryHouseCusps['source'];
  readonly validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}
export type HistoricalPlacidusHouseInput = Omit<PlacidusHouseInput, 'datetimeUtc' | 'epochUt1JulianDay'> & {
  readonly epochUt1JulianDay: number;
  readonly datetimeUtc?: never;
};
export type HistoricalPlacidusHouseCusps = Omit<PlacidusHouseCusps, 'datetimeUtc'> & {
  readonly epochUt1JulianDay: number;
};
export declare function calculatePlacidusHouseCusps(input: PlacidusHouseInput): Readonly<PlacidusHouseCusps>;
export declare function calculatePlacidusHouseCusps(input: HistoricalPlacidusHouseInput): Readonly<HistoricalPlacidusHouseCusps>;
