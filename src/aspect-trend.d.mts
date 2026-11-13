/** Experimental fact-only local derivative; no provider or astronomy implementation. */
export type AspectTrend = 'APPLYING' | 'SEPARATING' | 'EXACT' | 'RELATIVE_STATIONARY' | 'UNAVAILABLE' | 'OUTSIDE_ORB';
export type AspectBranch = 'FORWARD' | 'REVERSE';
export type AspectMotionFrame = 'COEVOLVING' | 'TARGET_FIXED';
export interface AspectTrendPoint {
  readonly longitudeDeg: number;
  /** Degrees/day in the same caller-asserted zodiac frame; null means unavailable. */
  readonly longitudeSpeedDegPerDay: number | null;
}
export interface AspectTrendInput {
  readonly source: AspectTrendPoint;
  readonly target: AspectTrendPoint;
  readonly aspectAngleDeg: number;
  readonly branch: AspectBranch;
  /** Inclusive angular orb, strictly below the half-gap between oriented branches (or 90° for 0/180). */
  readonly maxOrbDeg: number;
  /** Inclusive exact-angle tolerance in [0,maxOrbDeg]. */
  readonly exactToleranceDeg: number;
  /** Inclusive relative-rate stationary threshold in degrees/day. */
  readonly stationaryRelativeSpeedDegPerDay: number;
  readonly motionFrame: AspectMotionFrame;
}
export interface OrientedAspectTrendFact {
  readonly contract: 'OrientedAspectTrendFact';
  readonly contractVersion: '0.1.0-experimental';
  readonly trend: AspectTrend;
  readonly motionFrame: AspectMotionFrame;
  readonly branch: AspectBranch;
  readonly aspectAngleDeg: number;
  readonly exactForwardDeg: number;
  /** Normalized for display; may alias 0 when a negative offset is below a binary64 ULP near 360. */
  readonly observedForwardDeg: number;
  /** Locally wrapped signed offset, computed before display normalization for precision. */
  readonly signedResidualDeg: number;
  readonly absoluteResidualDeg: number;
  readonly relativeSpeedDegPerDay: number | null;
  readonly maxOrbDeg: number;
  readonly exactToleranceDeg: number;
  readonly stationaryRelativeSpeedDegPerDay: number;
  readonly withinOrb: boolean;
  readonly interpretation: 'FACTS_ONLY';
  readonly validation: 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED';
}
export declare class AspectTrendError extends Error {
  readonly code: 'INVALID_INPUT' | 'INVALID_POINT' | 'INVALID_ASPECT' | 'INVALID_ORB_POLICY' |
    'INVALID_SPEED_POLICY' | 'INVALID_MOTION_FRAME' | 'INVALID_FIXED_TARGET' | 'INVALID_RELATIVE_SPEED';
  constructor(code: AspectTrendError['code'], message: string);
}
export declare function classifyOrientedAspectTrend(input: AspectTrendInput): Readonly<OrientedAspectTrendFact>;
