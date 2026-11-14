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
export declare function calculatePlacidusHouseCusps(input: PlacidusHouseInput): Readonly<PlacidusHouseCusps>;
