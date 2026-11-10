/** Experimental typed contract for the future Rust/WASM-backed ephemeris adapter.
 * This package does not implement astronomical calculations.
 */
export interface ApparentGeocentricState {
  longitudeDeg: number;
  latitudeDeg: number;
  longitudeSpeedDegPerDay?: number | null;
  metadata: {
    center: 'EARTH';
    frame: 'ECLIPTIC_OF_DATE';
    corrections: 'APPARENT';
    engineVersion?: string;
    kernelSetId?: string;
    [key: string]: unknown;
  };
}
export interface EphemerisProvider {
  getGeocentricEcliptic(input: {
    datetimeUtc: string;
    bodyName: string;
    corrections: 'APPARENT';
    frame: 'ECLIPTIC_OF_DATE';
  }): Promise<ApparentGeocentricState>;
}
export interface NatalInput {
  datetimeUtc: string;
  latitudeDeg: number;
  longitudeDegEast: number;
  bodyNames: string[];
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
  houses: null;
  angles: null;
  warnings: ReadonlyArray<{code: string; message: string}>;
}
export declare function calculateNatalWithProvider(input: NatalInput): Promise<ExperimentalNatalResult>;
