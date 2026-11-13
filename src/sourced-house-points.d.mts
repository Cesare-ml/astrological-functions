import type {
  DeclaredHouseSource, PinnedHouseComparisonResult, SourcedHouseSnapshot,
} from './house-source-consistency.mjs';

export interface CallerAssertedPointSnapshot {
  readonly source: DeclaredHouseSource;
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly points: readonly Readonly<{ id: string; longitudeDeg: number }>[];
}

export interface SourcedHousePointComparisonInput {
  readonly birthTimeKnown: true;
  readonly left: SourcedHouseSnapshot;
  readonly right: SourcedHouseSnapshot;
  readonly positions: CallerAssertedPointSnapshot;
}

export interface SourcedHousePointComparisonResult {
  readonly contract: 'SourcedHousePointComparison';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'MATCHING_CALLER_ASSERTED_HOUSE_AND_POINT_SOURCES_NOT_INDEPENDENTLY_VERIFIED';
  readonly pointProvenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly source: Readonly<DeclaredHouseSource>;
  readonly pointCount: number;
  readonly houseComparison: Readonly<PinnedHouseComparisonResult>;
}

export declare function compareHousePlacementsWithSourcedPoints(
  input: SourcedHousePointComparisonInput,
): Readonly<SourcedHousePointComparisonResult>;
