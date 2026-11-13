import type { DeclaredHouseSource, SourcedHouseSnapshot } from './house-source-consistency.mjs';

export interface PorphyryProducerResult {
  readonly contract: 'PorphyryHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'PORPHYRY';
  readonly datetimeUtc: string;
  readonly angles: Readonly<{
    ascendantDeg: number;
    icDeg: number;
    descendantDeg: number;
    midheavenDeg: number;
  }>;
  readonly cuspsDeg: readonly number[];
  readonly quadrantSpansDeg: readonly number[];
  readonly source: Readonly<{
    engineVersion: string;
    kernelSetId: string;
    timeModel: string;
    frame: 'ECLIPTIC_OF_DATE';
    zodiac: 'TROPICAL';
    observerType: 'TOPOCENTRIC';
    observer: Readonly<{ latitudeDeg: number; longitudeDegEast: number }>;
  }>;
  readonly interpretation: 'FACTS_ONLY';
  readonly validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}
export interface PorphyryPinnedAdapterInput {
  readonly porphyry: PorphyryProducerResult;
  /**
   * Explicitly declared by the consumer; producer result does not currently
   * declare corrections or calculationProfileId, so never fabricate them.
   */
  readonly source: DeclaredHouseSource;
  readonly birthTimeKnown: true;
}
export declare function adaptPorphyryForPinnedHouseComparison(
  input: PorphyryPinnedAdapterInput,
): Readonly<SourcedHouseSnapshot>;
