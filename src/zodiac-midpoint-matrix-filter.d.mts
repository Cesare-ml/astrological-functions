import type { ZodiacMidpointContactMatrixFacts, ZodiacMidpointMatchedCell } from './zodiac-midpoint-contact-matrix.mjs';
import type { ZodiacMidpointAxisFacts } from './zodiac-midpoint-axis.mjs';

export interface ZodiacMidpointMatrixFilterInput {
  readonly matrix: Readonly<ZodiacMidpointContactMatrixFacts>;
  /** null = all source points, [] = none; otherwise exact, unique source names. */
  readonly sourceNames: readonly string[] | null;
  /** null = all target points, [] = none; otherwise exact, unique target names. */
  readonly targetNames: readonly string[] | null;
  /** Inclusive filter orb [0,90] independent of the original matrix orb. */
  readonly maxOrbDeg: number;
  /** True excludes only a target whose name equals either source pair member. */
  readonly excludePairMembers: boolean;
}
export interface ZodiacMidpointMatrixViewRow {
  readonly firstName: string;
  readonly secondName: string;
  readonly midpointAxis: Readonly<ZodiacMidpointAxisFacts>;
  readonly matchedTargets: readonly Readonly<ZodiacMidpointMatchedCell>[];
}
export interface ZodiacMidpointMatrixViewFacts {
  readonly contract: 'ZodiacMidpointMatrixView';
  readonly contractVersion: '0.1.0-experimental';
  readonly sourceContractVersion: '0.1.0-experimental';
  readonly filters: Readonly<{
    readonly sourceNames: readonly string[] | null;
    readonly targetNames: readonly string[] | null;
    readonly maxOrbDeg: number;
    readonly excludePairMembers: boolean;
  }>;
  readonly rows: readonly Readonly<ZodiacMidpointMatrixViewRow>[];
  readonly matchedCells: readonly Readonly<ZodiacMidpointMatchedCell>[];
  readonly selectedPairCount: number;
  readonly consideredCellCount: number;
  readonly excludedPairMemberCount: number;
  readonly matchedCellCount: number;
  readonly activePairCount: number;
  readonly calculationBasis: 'EXISTING_MIDPOINT_CONTACT_GEOMETRY';
  readonly interpretation: 'FACTS_ONLY';
}
export declare function filterZodiacMidpointContactMatrix(
  input: ZodiacMidpointMatrixFilterInput,
): Readonly<ZodiacMidpointMatrixViewFacts>;
