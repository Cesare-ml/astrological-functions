import type {
  HouseCuspSnapshot, HouseMethodComparisonResult, LongitudeBasis,
} from './house-method-comparison.mjs';

/** Metadata declared by the caller, not independently proven by this package. */
export interface DeclaredHouseSource {
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
  readonly observerType: 'TOPOCENTRIC';
  readonly observer: Readonly<{ latitudeDeg: number; longitudeDegEast: number }>;
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModel: string;
  readonly corrections: 'APPARENT';
  readonly calculationProfileId: string;
}
export interface SourcedHouseSnapshot {
  readonly snapshot: HouseCuspSnapshot;
  readonly source: DeclaredHouseSource;
}
export interface PinnedHouseComparisonInput {
  readonly birthTimeKnown: true;
  readonly left: SourcedHouseSnapshot;
  readonly right: SourcedHouseSnapshot;
  readonly points: readonly Readonly<{ id: string; longitudeDeg: number }>[];
}
export interface PinnedHouseComparisonResult {
  readonly contract: 'PinnedHouseMethodComparison';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED';
  readonly source: Readonly<DeclaredHouseSource>;
  readonly comparison: Readonly<HouseMethodComparisonResult>;
}
export declare function compareHousePlacementsWithPinnedSource(
  input: PinnedHouseComparisonInput,
): Readonly<PinnedHouseComparisonResult>;
