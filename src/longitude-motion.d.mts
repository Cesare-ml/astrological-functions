/** Caller-supplied longitudinal rate, not a synodic D1/R2/R3/D4 phase. */
export type LongitudeMotion = 'DIRECT' | 'RETROGRADE' | 'STATIONARY' | 'UNAVAILABLE';

export interface LongitudeMotionInput {
  /** Degrees per day, or explicit null if the provider has no validated rate. */
  readonly longitudeSpeedDegPerDay: number | null;
  /** Caller-defined non-negative finite cutoff, inclusive for STATIONARY. */
  readonly stationaryThresholdDegPerDay: number;
}

export interface LongitudeMotionFact {
  readonly contract: 'LongitudeMotionFact';
  readonly contractVersion: '0.1.0-experimental';
  readonly motion: LongitudeMotion;
  readonly longitudeSpeedDegPerDay: number | null;
  readonly stationaryThresholdDegPerDay: number;
}

/** Pure, synchronous rate classifier; no ephemeris or synodic algorithm. */
export declare function classifyLongitudinalMotion(input: LongitudeMotionInput): LongitudeMotionFact;
