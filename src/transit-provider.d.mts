/** Experimental consumer contract: this is not an astronomical Rust/WASM implementation. */
import type { TransitBodyPoint, TransitEphemerisProvenance, TransitSnapshotInput, TransitZodiac } from './transit-facts.mjs';

export interface TransitPositionRequest {
  readonly datetimeUtc: string;
  readonly bodyName: string;
  readonly center: 'EARTH';
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly corrections: 'APPARENT';
  readonly kernelSetId: string;
  readonly timeModel: string;
}
export interface TransitPositionResponse {
  readonly datetimeUtc: string;
  readonly bodyName: string;
  readonly longitudeDeg: number;
  readonly latitudeDeg: number;
  readonly longitudeSpeedDegPerDay?: number | null;
  readonly metadata: TransitEphemerisProvenance;
}
export interface TransitPositionProvider {
  readonly capabilities: TransitEphemerisProvenance & Readonly<{
    contract: 'TransitPositionProviderCapabilities';
    contractVersion: '0.1.0-experimental';
  }>;
  getGeocentricEcliptic(request: Readonly<TransitPositionRequest>): Promise<Readonly<TransitPositionResponse>>;
}
export interface TransitSkyProviderInput {
  readonly datetimeUtc: string;
  readonly zodiac: TransitZodiac;
  readonly bodyNames: readonly string[];
  readonly expectedEphemeris: TransitEphemerisProvenance;
  readonly provider: TransitPositionProvider;
}
export interface TransitSkyProviderResult {
  readonly contract: 'TransitSkyProviderResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly sky: Readonly<TransitSnapshotInput & { points: readonly Readonly<TransitBodyPoint>[] }>;
  readonly requests: readonly Readonly<TransitPositionRequest>[];
  readonly warnings: readonly Readonly<{
    code: 'EPHEMERIS_ACCURACY_NOT_VERIFIED'; message: string;
  }>[];
}
export declare function getTransitSkySnapshotWithProvider(input: Readonly<TransitSkyProviderInput>): Promise<TransitSkyProviderResult>;
