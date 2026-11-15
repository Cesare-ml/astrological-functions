import type { DeclinationDirection, DeclinationContactDefinition } from './declination-contacts.mjs';
import type { DeclinationSourceProvenance, SourcedDeclinationContactsResult } from './sourced-declination-contacts.mjs';

export interface DeclinationProviderSelection {
  readonly snapshotId: string;
  readonly datetimeUtc: string;
  readonly bodyIds: readonly string[];
}
export interface DeclinationProviderCoordinates {
  readonly origin: 'EARTH_GEOCENTER';
  readonly kind: 'EQUATORIAL_DECLINATION';
  readonly frame: 'ICRS' | 'TRUE_EQUATOR_OF_DATE';
  readonly corrections: 'GEOMETRIC' | 'APPARENT';
}
export interface DeclinationProviderRequest {
  readonly snapshotId: string;
  readonly datetimeUtc: string;
  readonly bodyId: string;
  readonly coordinates: Readonly<DeclinationProviderCoordinates & { readonly frameEpochUtc: string | null }>;
  readonly expectedProvenance: Readonly<DeclinationSourceProvenance>;
  /** Optional cancellation token; the provider may cooperate or ignore it. */
  readonly signal?: AbortSignal;
}
export interface DeclinationProviderResponse {
  readonly snapshotId: string;
  readonly bodyId: string;
  readonly datetimeUtc: string;
  readonly declinationDeg: number;
  readonly coordinates: DeclinationProviderRequest['coordinates'];
  readonly provenance: Readonly<DeclinationSourceProvenance>;
}
/** Proposed adapter interface: not yet provided by published Rust/WASM bindings. */
export interface ExperimentalDeclinationProvider {
  getGeocentricEquatorialDeclination(
    request: DeclinationProviderRequest,
  ): Promise<DeclinationProviderResponse>;
}
export interface DeclinationWithProviderOptions {
  readonly direction: DeclinationDirection;
  readonly source: DeclinationProviderSelection;
  readonly target: DeclinationProviderSelection;
  readonly coordinates: DeclinationProviderCoordinates;
  readonly expectedProvenance: DeclinationSourceProvenance;
  readonly contactDefinitions: readonly DeclinationContactDefinition[];
  readonly provider: ExperimentalDeclinationProvider;
  /** Optional; no timeout or cancellation is inferred when omitted. */
  readonly signal?: AbortSignal;
}
export declare function calculateDeclinationContactsWithProvider(
  options: DeclinationWithProviderOptions,
): Promise<SourcedDeclinationContactsResult>;
