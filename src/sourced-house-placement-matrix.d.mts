import type { SourcedHouseSnapshot, DeclaredHouseSource } from './house-source-consistency.mjs';
import type { CallerAssertedPointSnapshot } from './sourced-house-points.mjs';
import type { HouseMethod } from './house-method-comparison.mjs';

/** Two or three distinct methods, in explicit caller-selected display order. */
export interface SourcedHousePlacementMatrixInput {
  readonly birthTimeKnown: true;
  readonly methods:
    | readonly [SourcedHouseSnapshot, SourcedHouseSnapshot]
    | readonly [SourcedHouseSnapshot, SourcedHouseSnapshot, SourcedHouseSnapshot];
  readonly positions: CallerAssertedPointSnapshot;
}
export interface HouseMatrixPlacement {
  readonly houseSystem: HouseMethod;
  /** Cusp-start ownership is inherited from locateLongitudeInHouses. */
  readonly house: number;
}
export interface HouseMatrixRow {
  readonly id: string;
  readonly longitudeDeg: number;
  readonly placements: readonly HouseMatrixPlacement[];
  readonly changed: boolean;
}
export interface HouseMethodPairChanges {
  readonly leftHouseSystem: HouseMethod;
  readonly rightHouseSystem: HouseMethod;
  /** Point IDs appear in caller-supplied order. */
  readonly changedPointIds: readonly string[];
  readonly changedCount: number;
}
/** Immutable point membership in a numbered house (1..12). */
export interface HouseMatrixOccupancyHouse {
  readonly house: number;
  readonly count: number;
  /** IDs preserve the original caller-supplied point order. */
  readonly pointIds: readonly string[];
}
/** One complete 12-house summary per selected method, in display order. */
export interface HouseMatrixMethodOccupancy {
  readonly houseSystem: HouseMethod;
  readonly houses: readonly HouseMatrixOccupancyHouse[];
}
export interface SourcedHousePlacementMatrixResult {
  readonly contract: 'SourcedHousePlacementMatrix';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'MATCHING_CALLER_ASSERTED_SOURCES_NOT_INDEPENDENTLY_VERIFIED';
  readonly pointProvenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly source: Readonly<DeclaredHouseSource>;
  readonly methodNames: readonly HouseMethod[];
  readonly rows: readonly HouseMatrixRow[];
  readonly changedPointIds: readonly string[];
  readonly pairwiseChanges: readonly HouseMethodPairChanges[];
  readonly occupancyByMethod: readonly HouseMatrixMethodOccupancy[];
  readonly pointCount: number;
  readonly changedCount: number;
}
export declare function buildSourcedHousePlacementMatrix(
  input: SourcedHousePlacementMatrixInput,
): Readonly<SourcedHousePlacementMatrixResult>;
