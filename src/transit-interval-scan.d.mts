/** Experimental interval candidate discovery; provider claims are not independently validated. */
import type { TransitResidualProvider, TransitResidualRequest, TransitHitProvenance,
  TransitAspectOrientation, TransitResidualCapabilities } from './transit-exact-hit.mjs';

export interface TransitIntervalCapabilities extends TransitResidualCapabilities {
  readonly enclosureCoverage: 'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES';
  readonly stationCoverage: 'INCLUDED';
  readonly numericErrorCoverage: 'INCLUDED';
}
export interface TransitRangeRequest extends Omit<TransitResidualRequest, 'datetimeUtc'> {
  readonly startUtc: string;
  readonly endUtc: string;
}
export interface TransitRangeResponse {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly lowerDeg: number;
  readonly upperDeg: number;
  readonly metadata: TransitIntervalCapabilities & TransitHitProvenance;
}
export interface TransitIntervalProvider extends TransitResidualProvider {
  readonly capabilities: TransitIntervalCapabilities;
  getUnwrappedResidualEnclosure(request: TransitRangeRequest): Promise<TransitRangeResponse>;
}
export interface TransitIntervalSegment {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly startResidualDeg: number;
  readonly endResidualDeg: number;
  readonly lowerDeg: number;
  readonly upperDeg: number;
}
export interface TransitUnresolvedInterval extends TransitIntervalSegment {
  readonly reason: 'MAX_DEPTH_REACHED' | 'POSSIBLE_TANGENCY_OR_MULTIPLE_ROOTS';
}
export interface TransitCandidateIntervals {
  readonly contract: 'TransitAspectCandidateIntervals';
  readonly contractVersion: '0.1.0-experimental';
  readonly direction: 'SKY_TO_NATAL';
  readonly skyBodyName: string;
  readonly natalBodyName: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly orientation: TransitAspectOrientation;
  readonly startUtc: string;
  readonly endUtc: string;
  readonly targetIntervalMs: number;
  readonly maxDepth: number;
  readonly ephemerisProvenance: TransitHitProvenance;
  readonly providerCalls: number;
  readonly inspectedIntervals: number;
  readonly excludedIntervals: number;
  readonly signChangeCandidates: readonly TransitIntervalSegment[];
  readonly sampledZeros: readonly Readonly<{datetimeUtc:string; residualDeg:0}>[];
  readonly unresolvedIntervals: readonly TransitUnresolvedInterval[];
  readonly verification: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly completeness: 'CONDITIONAL_ON_CALLER_ENCLOSURES_NOT_SCIENTIFICALLY_VALIDATED';
}
export declare function scanTransitAspectCandidateIntervals(input: {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly skyBodyName: string;
  readonly natalBodyName: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly orientation: TransitAspectOrientation;
  readonly targetIntervalMs: number;
  readonly maxDepth: number;
  readonly maxProviderCalls: number;
  readonly ephemerisProvenance: TransitHitProvenance;
  readonly provider: TransitIntervalProvider;
}): Promise<TransitCandidateIntervals>;
