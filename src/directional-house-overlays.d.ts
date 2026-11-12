/** Experimental, astronomy-free directional synastry overlays. */
import type {
  ExperimentalNatalResult, HouseCuspContextInput,
  CanonicalHouseSystem, CalculationProfile,
} from './ephemeris-provider.js';

export type SynastryHouseDirection = 'A_TO_B' | 'B_TO_A';

type SharedOverlayInput = Readonly<{
  chartA: ExperimentalNatalResult;
  chartB: ExperimentalNatalResult;
  /** Both must be narrowed to literal true by the caller. */
  birthTimeKnownA: true;
  birthTimeKnownB: true;
}>;

/** The source/target direction determines which target cusp set is mandatory. */
export type DirectionalHouseOverlayInput = SharedOverlayInput & (
  | Readonly<{
      direction: 'A_TO_B';
      cuspSetB: HouseCuspContextInput['cuspSet'];
      cuspSetA?: HouseCuspContextInput['cuspSet'];
    }>
  | Readonly<{
      direction: 'B_TO_A';
      cuspSetA: HouseCuspContextInput['cuspSet'];
      cuspSetB?: HouseCuspContextInput['cuspSet'];
    }>
);

export interface DirectionalHouseOverlayResult {
  readonly contract: 'DirectionalHouseOverlayResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly direction: SynastryHouseDirection;
  readonly sourceChart: 'A' | 'B';
  readonly targetChart: 'A' | 'B';
  readonly sourceDatetimeUtc: string;
  readonly targetDatetimeUtc: string;
  readonly sourceEphemerisProvenance: Readonly<{
    engineVersion: string; kernelSetId: string; timeModel: string;
  }>;
  readonly targetCuspMetadata: ReturnType<typeof import('./ephemeris-provider.js').validateHouseCuspContext>['metadata'];
  readonly houseSystem: CanonicalHouseSystem;
  readonly calculationProfile: CalculationProfile;
  readonly placementMethod: 'CUSP_INTERVAL';
  readonly placements: ReadonlyArray<Readonly<{
    bodyName: string; longitudeDeg: number;
    houseSystem: CanonicalHouseSystem;
    calculationProfile: CalculationProfile;
    placementMethod: 'CUSP_INTERVAL';
    house: number; startDeg: number; endDeg: number; distanceFromCuspDeg: number;
  }>>;
}

export declare function calculateDirectionalHouseOverlays(
  input: Readonly<DirectionalHouseOverlayInput>
): Readonly<DirectionalHouseOverlayResult>;

/** Caller must supply both independently computed house contexts. */
export type BidirectionalHouseOverlayInput = SharedOverlayInput & Readonly<{
  cuspSetA: HouseCuspContextInput['cuspSet'];
  cuspSetB: HouseCuspContextInput['cuspSet'];
}>;

export interface BidirectionalHouseOverlayResult {
  readonly contract: 'BidirectionalHouseOverlayResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly aToB: Readonly<DirectionalHouseOverlayResult & {
    direction: 'A_TO_B'; sourceChart: 'A'; targetChart: 'B';
  }>;
  readonly bToA: Readonly<DirectionalHouseOverlayResult & {
    direction: 'B_TO_A'; sourceChart: 'B'; targetChart: 'A';
  }>;
}

export declare function calculateBidirectionalHouseOverlays(
  input: Readonly<BidirectionalHouseOverlayInput>
): Readonly<BidirectionalHouseOverlayResult>;
