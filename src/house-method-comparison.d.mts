/** Experimental comparison of two existing symbolic cusp results. */
export type ComparisonLongitudeBasis =
  | Readonly<{ type: 'TROPICAL'; ayanamsaId?: never }>
  | Readonly<{ type: 'SIDEREAL'; ayanamsaId: string }>;
export interface ComparableHouseSnapshot {
  readonly contract: 'WholeSignHouseCusps' | 'EqualHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'WHOLE_SIGN' | 'EQUAL_ASCENDANT';
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: ComparisonLongitudeBasis;
  readonly ascendantLongitudeDeg: number;
  readonly cuspsDeg: readonly number[];
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
}
export type WholeSignSnapshot = Readonly<ComparableHouseSnapshot & {
  contract: 'WholeSignHouseCusps'; houseSystem: 'WHOLE_SIGN'; birthTimeKnown: true;
}>;
export type EqualAscendantSnapshot = Readonly<ComparableHouseSnapshot & {
  contract: 'EqualHouseCusps'; houseSystem: 'EQUAL_ASCENDANT';
}>;
export interface HouseComparisonPoint {
  readonly id: string;
  readonly longitudeDeg: number;
}
export interface HouseMethodComparisonInput {
  readonly birthTimeKnown: true;
  readonly wholeSign: WholeSignSnapshot;
  readonly equalAscendant: EqualAscendantSnapshot;
  readonly points: readonly HouseComparisonPoint[];
}
export interface HousePlacementFact {
  readonly house: number;
  readonly startDeg: number;
  readonly endDeg: number;
  readonly distanceFromCuspDeg: number;
}
export interface HouseMethodComparisonResult {
  readonly contract: 'HouseMethodComparison';
  readonly contractVersion: '0.1.0-experimental';
  readonly factsOnly: true;
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: ComparisonLongitudeBasis;
  readonly ascendantLongitudeDeg: number;
  readonly comparedHouseSystems: readonly ['WHOLE_SIGN', 'EQUAL_ASCENDANT'];
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly placements: readonly Readonly<{
    id: string; longitudeDeg: number;
    wholeSign: Readonly<HousePlacementFact>;
    equalAscendant: Readonly<HousePlacementFact>;
    houseChanged: boolean;
  }>[];
  readonly changedPointIds: readonly string[];
}
export declare function compareWholeSignAndEqualAscendant(
  input: HouseMethodComparisonInput,
): Readonly<HouseMethodComparisonResult>;
