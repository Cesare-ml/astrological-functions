/** Experimental, astronomy-free directional synastry overlays. */
import type {
  ExperimentalNatalResult, HouseCuspContextInput,
  CanonicalHouseSystem, CalculationProfile,
} from './ephemeris-provider.js';

export type SynastryHouseDirection = 'A_TO_B' | 'B_TO_A';

export interface DirectionalHouseOverlayInput {
  readonly direction: SynastryHouseDirection;
  readonly chartA: ExperimentalNatalResult;
  readonly chartB: ExperimentalNatalResult;
  /** Both must be narrowed to literal true by the caller. */
  readonly birthTimeKnownA: true;
  readonly birthTimeKnownB: true;
  /** Only the target chart's cusp set is read (B for A_TO_B, A for B_TO_A). */
  readonly cuspSetA?: HouseCuspContextInput['cuspSet'];
  readonly cuspSetB?: HouseCuspContextInput['cuspSet'];
}

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
