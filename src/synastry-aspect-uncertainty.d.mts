/** Conditional geometric aspect uncertainty, not an astronomical enclosure producer. */
import type { SynastryAspectsOnlyResult } from './synastry-aspects-only.mjs';

export interface LongitudeArcEnclosure {
  /** Canonical longitude: 0 <= startDeg < 360 (runtime validated). */
  readonly startDeg: number;
  /** Forward closed arc width: 0 <= spanDeg <= 360, wrapping through zero. */
  readonly spanDeg: number;
}
export interface ChartLongitudeEnclosure {
  /** Assertion by caller, NOT proof checked by this package. */
  readonly coverage: 'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE';
  readonly intervalStartUtc: string;
  readonly intervalEndUtc: string;
  readonly ephemerisProvenance: Readonly<{
    engineVersion:string;kernelSetId:string;timeModel:string;
  }>;
  /** Exactly the selected body IDs present in the input aspects-only result. */
  readonly bodies: Readonly<Record<string, Readonly<LongitudeArcEnclosure>>>;
}
export interface SynastryAspectUncertaintyInput {
  readonly aspectsOnlyResult: SynastryAspectsOnlyResult;
  readonly enclosureA: ChartLongitudeEnclosure;
  readonly enclosureB: ChartLongitudeEnclosure;
}
export type ConditionalAspectStatus =
  | 'ALWAYS_WITHIN_BOUNDS'
  | 'NEVER_WITHIN_BOUNDS'
  | 'MAYBE_WITHIN_BOUNDS';
export interface ConditionalAspectFact {
  readonly direction: 'A_TO_B'|'B_TO_A';
  readonly sourceBodyName: string;
  readonly targetBodyName: string;
  readonly aspectId: string;
  readonly angleDeg: number;
  readonly maxOrbDeg: number;
  readonly separationBoundsDeg: Readonly<{minDeg:number;maxDeg:number}>;
  readonly orbBoundsDeg: Readonly<{minDeg:number;maxDeg:number}>;
  readonly status: ConditionalAspectStatus;
}
export interface ConditionalAspectDirectionResult {
  readonly direction:'A_TO_B'|'B_TO_A';
  readonly facts: readonly Readonly<ConditionalAspectFact>[];
  readonly counts: Readonly<{
    ALWAYS_WITHIN_BOUNDS: number;
    NEVER_WITHIN_BOUNDS: number;
    MAYBE_WITHIN_BOUNDS: number;
  }>;
}
export interface SynastryAspectUncertaintyResult {
  readonly contract: 'SynastryAspectUncertaintyResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly interpretation: 'CONDITIONAL_ON_CALLER_ENCLOSURES';
  readonly houseMode: 'UNAVAILABLE';
  readonly angles: null;
  readonly enclosures: Readonly<{
    A: Readonly<{
      intervalStartUtc:string;intervalEndUtc:string;
      coverage:'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE';
      birthTimeKnown:boolean;representativeUtc:string;
      ephemerisProvenance: ChartLongitudeEnclosure['ephemerisProvenance'];
      points:readonly Readonly<{name:string;startDeg:number;spanDeg:number}>[];
    }>;
    B: Readonly<{
      intervalStartUtc:string;intervalEndUtc:string;
      coverage:'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE';
      birthTimeKnown:boolean;representativeUtc:string;
      ephemerisProvenance: ChartLongitudeEnclosure['ephemerisProvenance'];
      points:readonly Readonly<{name:string;startDeg:number;spanDeg:number}>[];
    }>;
  }>;
  readonly aspectDefinitions: SynastryAspectsOnlyResult['aspectDefinitions'];
  readonly warning: Readonly<{
    code:'ENCLOSURE_COVERAGE_NOT_VERIFIED';message:string;
  }>;
  readonly aToB: Readonly<ConditionalAspectDirectionResult & {direction:'A_TO_B'}>;
  readonly bToA: Readonly<ConditionalAspectDirectionResult & {direction:'B_TO_A'}>;
}
export declare function analyzeSynastryAspectUncertainty(
  input: Readonly<SynastryAspectUncertaintyInput>
): Readonly<SynastryAspectUncertaintyResult>;
