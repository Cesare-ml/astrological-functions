import type { PorphyryHouseInput, PorphyryAngleSource } from './porphyry-houses.mjs';

export interface PullenHouseInput extends PorphyryHouseInput {
  readonly birthTimeKnown: true;
}
export interface PullenHouseCusps {
  readonly contract: 'PullenHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'PULLEN_SD' | 'PULLEN_SR';
  readonly datetimeUtc: string;
  readonly birthTimeKnown: true;
  readonly angles: Readonly<{
    ascendantDeg: number;
    icDeg: number;
    descendantDeg: number;
    midheavenDeg: number;
  }>;
  readonly source: Readonly<PorphyryAngleSource>;
  readonly quadrantSpansDeg: readonly number[];
  readonly cuspsDeg: readonly number[];
  readonly widthsDeg: readonly number[];
  /** House numbers with mathematically zero width; only possible in SD. */
  readonly zeroWidthHouseNumbers: readonly number[];
  readonly placementPolicy: 'STANDARD_HALF_OPEN_CUSPS' | 'ZERO_WIDTH_REQUIRES_EXPLICIT_METHOD';
  readonly interpretation: 'FACTS_ONLY';
  readonly validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function calculatePullenSinusoidalDeltaHouseCusps(
  input: PullenHouseInput,
): Readonly<PullenHouseCusps & {readonly houseSystem: 'PULLEN_SD'}>;
export declare function calculatePullenSinusoidalRatioHouseCusps(
  input: PullenHouseInput,
): Readonly<PullenHouseCusps & {readonly houseSystem: 'PULLEN_SR'}>;
