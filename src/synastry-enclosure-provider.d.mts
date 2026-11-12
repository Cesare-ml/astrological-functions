/** Experimental provider gate for a future Rust/WASM interval-enclosure engine. */
import type { SynastryAspectsOnlyResult } from './synastry-aspects-only.mjs';
import type { SynastryAspectUncertaintyResult, LongitudeArcEnclosure } from './synastry-aspect-uncertainty.mjs';

export interface EnclosureCoordinates {
  readonly center:'EARTH';
  readonly frame:'ECLIPTIC_OF_DATE';
  readonly corrections:'APPARENT';
}
export interface EnclosureProvenance {
  readonly engineVersion:string;
  readonly kernelSetId:string;
  readonly timeModel:string;
}
export interface LongitudeEnclosureCapabilities {
  readonly contract:'LongitudeEnclosureProviderCapabilities';
  readonly contractVersion:'0.1.0-experimental';
  readonly continuousCoverage:'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS';
  readonly coordinates:Readonly<EnclosureCoordinates>;
}
export interface LongitudeEnclosureRequest {
  readonly contract:'LongitudeEnclosureRequest';
  readonly contractVersion:'0.1.0-experimental';
  readonly chart:'A'|'B';
  readonly intervalStartUtc:string;
  readonly intervalEndUtc:string;
  readonly representativeUtc:string;
  readonly birthTimeKnown:boolean;
  readonly bodyNames:readonly string[];
  readonly coordinates:Readonly<EnclosureCoordinates>;
  readonly coverageRequirement:'FULL_INTERVAL_INCLUDING_STATIONS';
  readonly ephemerisProvenance:Readonly<EnclosureProvenance>;
}
export interface LongitudeEnclosureEvidence {
  /** A self-declared algorithm identifier, not independent scientific proof. */
  readonly algorithmId:string;
  readonly method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS';
  readonly stationHandling:'INCLUDED';
  readonly errorIncludedInArcs:true;
  readonly maxLongitudeErrorDeg:number;
}
export interface LongitudeEnclosureResponse {
  readonly contract:'LongitudeEnclosureResponse';
  readonly contractVersion:'0.1.0-experimental';
  readonly chart:'A'|'B';
  readonly intervalStartUtc:string;
  readonly intervalEndUtc:string;
  readonly representativeUtc:string;
  readonly coverage:'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS';
  readonly coordinates:Readonly<EnclosureCoordinates>;
  readonly ephemerisProvenance:Readonly<EnclosureProvenance>;
  readonly coverageEvidence:Readonly<LongitudeEnclosureEvidence>;
  readonly bodies:Readonly<Record<string,Readonly<LongitudeArcEnclosure>>>;
}
export interface LongitudeEnclosureProvider {
  readonly capabilities:Readonly<LongitudeEnclosureCapabilities>;
  getContinuousLongitudeEnclosure(
    request:Readonly<LongitudeEnclosureRequest>
  ): Promise<Readonly<LongitudeEnclosureResponse>> | Readonly<LongitudeEnclosureResponse>;
}
export interface SynastryEnclosureProviderInput {
  readonly aspectsOnlyResult:SynastryAspectsOnlyResult;
  readonly provider:LongitudeEnclosureProvider;
  readonly intervalA:Readonly<{startUtc:string;endUtc:string}>;
  readonly intervalB:Readonly<{startUtc:string;endUtc:string}>;
}
export interface SynastryProviderUncertaintyResult {
  readonly contract:'SynastryProviderUncertaintyResult';
  readonly contractVersion:'0.1.0-experimental';
  readonly status:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly evidence:Readonly<{
    A:Readonly<LongitudeEnclosureEvidence>;
    B:Readonly<LongitudeEnclosureEvidence>;
  }>;
  readonly analysis:Readonly<SynastryAspectUncertaintyResult>;
}
export declare function analyzeSynastryUncertaintyWithProvider(
  input:Readonly<SynastryEnclosureProviderInput>
):Promise<Readonly<SynastryProviderUncertaintyResult>>;
