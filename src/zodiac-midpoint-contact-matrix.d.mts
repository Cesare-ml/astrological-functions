import type { ZodiacMidpointCatalogFacts } from './zodiac-midpoint-catalog.mjs';
import type {
  ZodiacMidpointTargetPoint,
  ZodiacMidpointTargetSweepFacts,
} from './zodiac-midpoint-target-sweep.mjs';
import type { ZodiacMidpointAxisFacts } from './zodiac-midpoint-axis.mjs';

export interface ZodiacMidpointContactMatrixInput {
  readonly sourcePoints: readonly {readonly name: string; readonly longitudeDeg: number}[];
  readonly targetPoints: readonly ZodiacMidpointTargetPoint[];
  /** Caller-selected inclusive orb in [0, 90] degrees. */
  readonly maxOrbDeg: number;
}
export interface ZodiacMidpointMatrixRow {
  readonly firstName: string;
  readonly secondName: string;
  readonly midpointAxis: Readonly<ZodiacMidpointAxisFacts>;
  readonly targetSweep: Readonly<ZodiacMidpointTargetSweepFacts>;
}
export interface ZodiacMidpointMatchedCell {
  readonly firstName: string;
  readonly secondName: string;
  readonly targetName: string;
  readonly targetLongitudeDeg: number;
  readonly nearestAxisSeparationDeg: number;
  readonly matchingAxisLongitudesDeg: readonly number[];
}
export interface ZodiacMidpointContactMatrixFacts {
  readonly contract: 'ZodiacMidpointContactMatrix';
  readonly contractVersion: '0.1.0-experimental';
  readonly sourceCatalog: Readonly<ZodiacMidpointCatalogFacts>;
  readonly targetPoints: readonly Readonly<ZodiacMidpointTargetPoint>[];
  readonly maxOrbDeg: number;
  readonly rows: readonly Readonly<ZodiacMidpointMatrixRow>[];
  readonly matchedCells: readonly Readonly<ZodiacMidpointMatchedCell>[];
  readonly pairCount: number;
  readonly targetCount: number;
  readonly cellCount: number;
  readonly matchedCellCount: number;
  readonly activePairCount: number;
  readonly calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY';
  readonly interpretation: 'FACTS_ONLY';
}
export declare function calculateZodiacMidpointContactMatrix(
  input: ZodiacMidpointContactMatrixInput,
): Readonly<ZodiacMidpointContactMatrixFacts>;
