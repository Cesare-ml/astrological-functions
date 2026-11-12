/**
 * Pure classification of a supplied zodiac longitude derivative.
 * The independent ephemeris provider owns the actual velocity computation.
 * This function never infers a synodic D1/R2/R3/D4 phase.
 */
export class LongitudeMotionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LongitudeMotionError';
    this.code = code;
  }
}

/**
 * Classify an already-computed ecliptic longitude speed using a caller-selected
 * inclusive stationary band. Both quantities are expressed in degrees/day.
 * No implicit threshold or astronomical fallback is permitted.
 */
export function classifyLongitudeMotion(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new LongitudeMotionError('INVALID_MOTION_INPUT', 'Expected motion input object');
  }
  const { longitudeSpeedDegPerDay: speed, stationaryThresholdDegPerDay: threshold } = input;
  if (speed === null || speed === undefined) {
    throw new LongitudeMotionError('MISSING_LONGITUDE_SPEED', 'A computed longitude speed is required');
  }
  if (typeof speed !== 'number' || !Number.isFinite(speed)) {
    throw new LongitudeMotionError('INVALID_LONGITUDE_SPEED', 'Longitude speed must be a finite number');
  }
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0) {
    throw new LongitudeMotionError('INVALID_STATIONARY_THRESHOLD', 'Explicit finite, nonnegative stationary threshold required');
  }

  const longitudeSpeedDegPerDay = Object.is(speed, -0) ? 0 : speed;
  const stationaryThresholdDegPerDay = Object.is(threshold, -0) ? 0 : threshold;
  const motion = Math.abs(longitudeSpeedDegPerDay) <= stationaryThresholdDegPerDay
    ? 'STATIONARY'
    : longitudeSpeedDegPerDay > 0 ? 'DIRECT' : 'RETROGRADE';

  return Object.freeze({
    contract: 'LongitudeMotionFacts',
    contractVersion: '0.1.0-experimental',
    motion,
    longitudeSpeedDegPerDay,
    stationaryThresholdDegPerDay,
    motionBasis: 'LONGITUDE_DERIVATIVE',
    interpretation: 'FACTS_ONLY',
  });
}
