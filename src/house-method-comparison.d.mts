export type HouseMethod = 'WHOLE_SIGN' | 'EQUAL_ASCENDANT' | 'PORPHYRY';
export type LongitudeBasis =
  | Readonly<{ type: 'TROPICAL'; ayanamsaId?: never }>
  | Readonly<{ type: 'SIDEREAL'; ayanamsaId: string }>;
export type CallerAssertedStatus =
  | 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'
  | 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';

export interface HouseCuspSnapshot {
  readonly houseSystem: HouseMethod;
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
  readonly provenanceStatus: CallerAssertedStatus;
  readonly cuspsDeg: readonly number[];
  readonly birthTimeKnown?: true;
}
export interface HouseMethodComparisonInput {
  readonly birthTimeKnown: true;
  readonly left: HouseCuspSnapshot;
  readonly right: HouseCuspSnapshot;
  readonly points: readonly Readonly<{ id: string; longitudeDeg: number }>[];
}
export interface HouseMethodPlacementFact {
  readonly id: string;
  readonly longitudeDeg: number;
  readonly leftHouse: number;
  readonly rightHouse: number;
  readonly changed: boolean;
}
export interface HouseMethodComparisonResult {
  readonly contract: 'HouseMethodPlacementComparison';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED';
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
  readonly left: HouseCuspSnapshot;
  readonly right: HouseCuspSnapshot;
  readonly facts: readonly HouseMethodPlacementFact[];
  readonly changedCount: number;
}
export declare function compareHouseMethodPlacements(input: HouseMethodComparisonInput):
  Readonly<HouseMethodComparisonResult>;
