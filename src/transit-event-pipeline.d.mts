/** Experimental single-aspect event-candidate workflow; not validated astronomy. */
import type { TransitIntervalProvider, TransitIntervalSegment,
  TransitUnresolvedInterval } from './transit-interval-scan.mjs';
import type { TransitAspectOrientation, TransitHitProvenance,
  BracketedTransitAspectHit } from './transit-exact-hit.mjs';

export interface TransitRefinementLimits {
  readonly timeToleranceMs: number;
  readonly residualToleranceDeg: number;
  readonly maxIterations: number;
  readonly maxCandidateRefinements: number;
  readonly maxRefinementCalls: number;
}
export interface TransitEventCandidate {
  readonly candidate: TransitIntervalSegment;
  readonly refinement: BracketedTransitAspectHit;
  readonly uniqueness: 'MULTIPLE_ROOTS_NOT_EXCLUDED';
}
export interface TransitAspectEventCandidates {
  readonly contract: 'TransitAspectEventCandidates';
  readonly contractVersion: '0.1.0-experimental';
  readonly direction: 'SKY_TO_NATAL';
  readonly startUtc: string;
  readonly endUtc: string;
  readonly skyBodyName: string;
  readonly natalBodyName: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly orientation: TransitAspectOrientation;
  readonly ephemerisProvenance: TransitHitProvenance;
  readonly refinedCandidates: readonly TransitEventCandidate[];
  readonly sampledZeros: readonly Readonly<{datetimeUtc: string; residualDeg: 0}>[];
  readonly unresolvedIntervals: readonly TransitUnresolvedInterval[];
  readonly excludedIntervals: number;
  readonly inspectedIntervals: number;
  readonly scanProviderCalls: number;
  readonly refinementProviderCalls: number;
  readonly hasUnresolvedIntervals: boolean;
  readonly completeness: 'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE';
  readonly verification: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly scientificallyValidated: false;
}
export declare function prepareTransitAspectEventCandidates(input: {
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
  readonly refinement: TransitRefinementLimits;
}): Promise<TransitAspectEventCandidates>;
