/** Numeric facts only. Ephemeris computation and synodic phase belong elsewhere. */
export type LongitudeMotion = 'DIRECT' | 'RETROGRADE' | 'STATIONARY';

export interface LongitudeMotionInput {
  /** Already computed rate in degrees per day, for a documented zodiac frame. */
  readonly longitudeSpeedDegPerDay: number;
  /** Caller-selected absolute inclusive stationary band in degrees per day. */
  readonly stationaryThresholdDegPerDay: number;
}

export interface LongitudeMotionFacts {
  readonly contract: 'LongitudeMotionFacts';
  readonly contractVersion: '0.1.0-experimental';
  readonly motion: LongitudeMotion;
  readonly longitudeSpeedDegPerDay: number;
  readonly stationaryThresholdDegPerDay: number;
  readonly motionBasis: 'LONGITUDE_DERIVATIVE';
  readonly interpretation: 'FACTS_ONLY';
}

export class LongitudeMotionError extends Error {
  readonly code: 'INVALID_MOTION_INPUT' | 'MISSING_LONGITUDE_SPEED' |
    'INVALID_LONGITUDE_SPEED' | 'INVALID_STATIONARY_THRESHOLD';
  constructor(code: LongitudeMotionError['code'], message: string);
}

export function classifyLongitudeMotion(input: LongitudeMotionInput): Readonly<LongitudeMotionFacts>;
