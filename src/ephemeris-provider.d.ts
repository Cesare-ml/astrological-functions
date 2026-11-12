/** Experimental typed contract for the future Rust/WASM-backed ephemeris adapter.
 * This package does not implement astronomical calculations.
 */
export interface ApparentGeocentricState {
  longitudeDeg: number;
  latitudeDeg: number;
  longitudeSpeedDegPerDay?: number | null;
  metadata: Readonly<{
    center: 'EARTH';
    frame: 'ECLIPTIC_OF_DATE';
    corrections: 'APPARENT';
    [key: string]: unknown;
  } & (
    | { engineVersion: string; kernelSetId: string; timeModel: string }
    | { engineVersion?: never; kernelSetId?: never; timeModel?: never }
  )>;
}
/** Runtime passes frozen requests to the future Rust/WASM adapter. */
export interface EphemerisRequest {
  readonly datetimeUtc: string;
  readonly bodyName: string;
  readonly corrections: 'APPARENT';
  readonly frame: 'ECLIPTIC_OF_DATE';
}
export interface EphemerisProvider {
  getGeocentricEcliptic(input: Readonly<EphemerisRequest>): Promise<ApparentGeocentricState>;
}
export interface NatalInput {
  datetimeUtc: string;
  latitudeDeg: number;
  longitudeDegEast: number;
  bodyNames: readonly string[];
  provider: EphemerisProvider;
}
export interface NatalBody {
  name: string;
  longitudeDeg: number;
  latitudeDeg: number;
  zodiacSignIndex: number;
  longitudeSpeedDegPerDay: number | null;
  ephemerisMetadata: ApparentGeocentricState['metadata'];
}
export interface ExperimentalNatalResult {
  contract: 'NatalChartResult';
  contractVersion: '0.1.0-experimental';
  datetimeUtc: string;
  latitudeDeg: number;
  longitudeDegEast: number;
  bodies: Readonly<Record<string, Readonly<NatalBody>>>;
  /** Snapshot of the consistent provider provenance; null means unavailable. */
  ephemerisProvenance: Readonly<{
    engineVersion: string | null;
    kernelSetId: string | null;
    timeModel: string | null;
  }>;
  houses: null;
  angles: null;
  warnings: ReadonlyArray<Readonly<{code: string; message: string}>>;
}
export declare function calculateNatalWithProvider(input: NatalInput): Promise<ExperimentalNatalResult>;

/** Identifier-only house-system compatibility; does not compute house cusps. */
export type CalculationProfile = 'CANONICAL_V1' | 'VIRGOSTARS_LEGACY_V1';
export type CanonicalHouseSystem = 'VEHLOW' | 'PLACIDUS' | 'KOCH' | 'REGIOMONTANUS' | 'PORPHYRY';
export type LegacyHouseSystemLabel = 'egizia' | 'placido' | 'koch' | 'regio-montano' | 'porfirio';
export declare function resolveHouseSystem(input: Readonly<{
  houseSystem: CanonicalHouseSystem | LegacyHouseSystemLabel;
  calculationProfile: CalculationProfile;
}>): Readonly<{ houseSystem: CanonicalHouseSystem; calculationProfile: CalculationProfile }>;

/** House placement policy only: no cusp computation or Swiss houses_pos port. */
export type HousePlacementMethod = 'CUSP_INTERVAL' | 'LEGACY_HOUSES_POS';
export declare function resolveHousePlacementPolicy(input: Readonly<{
  houseSystem: CanonicalHouseSystem | LegacyHouseSystemLabel;
  calculationProfile: CalculationProfile;
  placementMethod: HousePlacementMethod;
}>): Readonly<{
  houseSystem: CanonicalHouseSystem;
  calculationProfile: CalculationProfile;
  placementMethod: 'CUSP_INTERVAL';
}>;

/** Geometric cusp placement only. Cusps must already be supplied by a validated source. */
export declare function locateLongitudeWithHousePolicy(input: Readonly<{
  longitudeDeg: number;
  cusps: readonly number[];
  houseSystem: CanonicalHouseSystem | LegacyHouseSystemLabel;
  calculationProfile: CalculationProfile;
  placementMethod: HousePlacementMethod;
}>): Readonly<{
  houseSystem: CanonicalHouseSystem;
  calculationProfile: CalculationProfile;
  placementMethod: 'CUSP_INTERVAL';
  house: number;
  startDeg: number;
  endDeg: number;
  distanceFromCuspDeg: number;
}>;


/** Validates an externally calculated cusp payload; no astronomical calculation. */
export interface HouseCuspSetInput {
  readonly houseSystem: CanonicalHouseSystem | LegacyHouseSystemLabel;
  readonly calculationProfile: CalculationProfile;
  readonly cusps: readonly number[];
  readonly metadata: Readonly<{
    houseSystem: CanonicalHouseSystem;
    placementMethod: HousePlacementMethod;
  }>;
}
export declare function validateHouseCuspSet(input: Readonly<HouseCuspSetInput>): Readonly<{
  houseSystem: CanonicalHouseSystem;
  calculationProfile: CalculationProfile;
  placementMethod: 'CUSP_INTERVAL';
  cusps: readonly number[];
  metadata: Readonly<{houseSystem: CanonicalHouseSystem; placementMethod: 'CUSP_INTERVAL'}>;
}>;

/** Context match for externally computed cusp data; no astronomical computation. */
export interface HouseCuspContextInput {
  readonly chart: Readonly<Pick<ExperimentalNatalResult,
    'datetimeUtc' | 'latitudeDeg' | 'longitudeDegEast' | 'ephemerisProvenance'>>;
  readonly cuspSet: Readonly<Omit<HouseCuspSetInput, 'metadata'> & {
    metadata: Readonly<HouseCuspSetInput['metadata'] & {
      datetimeUtc: string;
      latitudeDeg: number;
      longitudeDegEast: number;
      ephemerisProvenance: Readonly<{
        engineVersion: string; kernelSetId: string; timeModel: string;
      }>;
    }>;
  }>;
}
export declare function validateHouseCuspContext(input: Readonly<HouseCuspContextInput>): Readonly<{
  houseSystem: CanonicalHouseSystem;
  calculationProfile: CalculationProfile;
  placementMethod: 'CUSP_INTERVAL';
  cusps: readonly number[];
  metadata: Readonly<{
    houseSystem: CanonicalHouseSystem;
    placementMethod: 'CUSP_INTERVAL';
    datetimeUtc: string; latitudeDeg: number; longitudeDegEast: number;
    ephemerisProvenance: Readonly<{
      engineVersion: string; kernelSetId: string; timeModel: string;
    }>;
  }>;
}>;

/** Optional, separate geometric house placements for an experimental natal chart.
 * Requires explicit birth time and a context-matched external cusp set.
 */
export declare function placeNatalBodiesInHouses(input: Readonly<{
  chart: ExperimentalNatalResult;
  cuspSet: HouseCuspContextInput['cuspSet'];
  birthTimeKnown: true;
}>): Readonly<{
  houseSystem: CanonicalHouseSystem;
  calculationProfile: CalculationProfile;
  placementMethod: 'CUSP_INTERVAL';
  metadata: ReturnType<typeof validateHouseCuspContext>['metadata'];
  placements: Readonly<Record<string, ReturnType<typeof locateLongitudeWithHousePolicy>>>;
}>;
