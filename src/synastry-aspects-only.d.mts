/** Experimental, non-astronomical aspects-only synastry. */
import type { ExperimentalNatalResult } from './ephemeris-provider.js';
import type { SynastryAspectDefinition, SynastryAspectFact } from './synastry-facts.mjs';

export type TimeBasisA =
  | Readonly<{birthTimeKnownA: true; positionBasisA: 'KNOWN_BIRTH_INSTANT'}>
  | Readonly<{birthTimeKnownA: false; positionBasisA: 'REPRESENTATIVE_INSTANT'}>;

export type TimeBasisB =
  | Readonly<{birthTimeKnownB: true; positionBasisB: 'KNOWN_BIRTH_INSTANT'}>
  | Readonly<{birthTimeKnownB: false; positionBasisB: 'REPRESENTATIVE_INSTANT'}>;

export type SynastryAspectsOnlyInput = Readonly<{
  chartA: ExperimentalNatalResult;
  chartB: ExperimentalNatalResult;
  /** Explicit nonempty selection; the caller chooses bodies in uncertain-time charts. */
  selectedBodyNamesA: readonly string[];
  selectedBodyNamesB: readonly string[];
  /** No default rules: [] intentionally disables aspect matching. */
  aspectDefinitions: readonly SynastryAspectDefinition[];
  /** This entry point never accepts cusp sets. */
  cuspSetA?: never;
  cuspSetB?: never;
}> & TimeBasisA & TimeBasisB;

export type TimeReliability = 'PROVISIONAL' | 'SUPPLIED_INSTANTS';

export interface SynastryAspectsOnlyResult {
  readonly contract: 'SynastryAspectsOnlyResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseMode: 'UNAVAILABLE';
  readonly angles: null;
  readonly timeReliability: TimeReliability;
  readonly timeBasis: Readonly<{
    A: Readonly<{birthTimeKnown:boolean;positionBasis:'KNOWN_BIRTH_INSTANT'|'REPRESENTATIVE_INSTANT';datetimeUtc:string}>;
    B: Readonly<{birthTimeKnown:boolean;positionBasis:'KNOWN_BIRTH_INSTANT'|'REPRESENTATIVE_INSTANT';datetimeUtc:string}>;
  }>;
  readonly provenance: Readonly<{
    A: Readonly<{engineVersion:string;kernelSetId:string;timeModel:string}>;
    B: Readonly<{engineVersion:string;kernelSetId:string;timeModel:string}>;
  }>;
  readonly selectedBodyNames: Readonly<{A:readonly string[];B:readonly string[]}>;
  readonly aspectDefinitions: readonly Readonly<SynastryAspectDefinition>[];
  readonly warnings: readonly Readonly<{
    code: 'UNKNOWN_BIRTH_TIME';
    chart: 'A'|'B';
    message: string;
  }>[];
  readonly aToB: Readonly<{
    direction: 'A_TO_B';
    houseOverlays: null;
    aspects: readonly Readonly<SynastryAspectFact & {direction: 'A_TO_B'}>[];
  }>;
  readonly bToA: Readonly<{
    direction: 'B_TO_A';
    houseOverlays: null;
    aspects: readonly Readonly<SynastryAspectFact & {direction: 'B_TO_A'}>[];
  }>;
}

export declare function calculateSynastryAspectsOnly(
  input: SynastryAspectsOnlyInput
): Readonly<SynastryAspectsOnlyResult>;
