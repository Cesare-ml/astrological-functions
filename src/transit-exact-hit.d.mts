/** Experimental single-bracket solver; does not discover or verify real events. */
export type TransitHitCoverage = 'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED';
export type TransitAspectOrientation = 'POSITIVE' | 'NEGATIVE';
export interface TransitHitProvenance {
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModel: string;
}
export interface TransitResidualCapabilities {
  readonly contractVersion: '0.1.0-experimental';
  readonly coverage: TransitHitCoverage;
  readonly center: 'EARTH';
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly corrections: 'APPARENT';
}
export interface TransitResidualRequest {
  readonly datetimeUtc: string;
  readonly skyBodyName: string;
  readonly natalBodyName: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly orientation: TransitAspectOrientation;
  readonly ephemerisProvenance: TransitHitProvenance;
}
export interface TransitResidualResponse {
  readonly datetimeUtc: string;
  readonly residualDeg: number;
  readonly metadata: TransitResidualCapabilities & TransitHitProvenance;
}
export interface TransitResidualProvider {
  readonly capabilities: TransitResidualCapabilities;
  getUnwrappedAspectResidual(request: TransitResidualRequest): Promise<TransitResidualResponse>;
}
export interface BracketedTransitAspectHit {
  readonly contract: 'BracketedTransitAspectHit';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'SAMPLED_WITHIN_RESIDUAL_TOLERANCE' | 'SAMPLED_ZERO' | 'BRACKETED_APPROXIMATION';
  readonly direction: 'SKY_TO_NATAL';
  readonly skyBodyName: string;
  readonly natalBodyName: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly orientation: TransitAspectOrientation;
  readonly datetimeUtc: string;
  readonly residualDeg: number;
  readonly bracketStartUtc: string;
  readonly bracketEndUtc: string;
  readonly iterations: number;
  readonly evaluations: number;
  readonly timeToleranceMs: number;
  readonly residualToleranceDeg: number;
  readonly ephemerisProvenance: TransitHitProvenance;
  readonly coverage: TransitHitCoverage;
  readonly verification: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function refineBracketedTransitAspectHit(input: {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly skyBodyName: string;
  readonly natalBodyName: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly orientation: TransitAspectOrientation;
  readonly timeToleranceMs: number;
  readonly residualToleranceDeg: number;
  readonly maxIterations: number;
  readonly ephemerisProvenance: TransitHitProvenance;
  readonly provider: TransitResidualProvider;
}): Promise<BracketedTransitAspectHit>;
