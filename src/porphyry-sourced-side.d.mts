import type {DeclaredHouseSource, SourcedHouseSnapshot} from './house-source-consistency.mjs';

/** Structural contract from isolated PR #40; no cross-PR import needed. */
export interface ExperimentalPorphyryResult {
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
  readonly interpretation: 'FACTS_ONLY';
  readonly source: Readonly<{
    engineVersion: string;
    kernelSetId: string;
    timeModel: string;
    frame: 'ECLIPTIC_OF_DATE';
    zodiac: 'TROPICAL';
    observerType: 'TOPOCENTRIC';
    observer: Readonly<{latitudeDeg: number; longitudeDegEast: number}>;
  }>;
  readonly validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}
export interface PinnedPorphyryAdapterInput {
  readonly birthTimeKnown: true;
  /** Already calculated and validated by the isolated Porphyry method. */
  readonly produced: ExperimentalPorphyryResult;
  /** Full asserted source context supplied separately; never filled with defaults. */
  readonly declaredSource: DeclaredHouseSource & Readonly<{
    longitudeBasis: Readonly<{type:'TROPICAL'; ayanamsaId?: never}>;
  }>;
}
/** Produces one side accepted by PR #48's pinned-source house comparator. */
export declare function adaptPorphyryToPinnedComparison(
  input: PinnedPorphyryAdapterInput,
): Readonly<SourcedHouseSnapshot>;
