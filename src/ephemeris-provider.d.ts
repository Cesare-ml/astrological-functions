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
    engineVersion?: string;
    kernelSetId?: string;
    timeModel?: string;
    [key: string]: unknown;
  }>;
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
