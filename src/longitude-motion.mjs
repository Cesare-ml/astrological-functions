/**
 * An astrological *fact* derived only from a caller-supplied longitude rate.
 * This module performs no astronomical calculations and does not infer
 * synodic cycle phases (D1/R2/R3/D4).
 */
import { AstrologyError } from './index.mjs';

/**
 * Classify signed ecliptic longitude speed using an explicit station tolerance.
 * A null rate is deliberately UNAVAILABLE, not STATIONARY.
 * The inclusive threshold belongs to STATIONARY.
 *
 * @param {{longitudeSpeedDegPerDay: number|null, stationaryThresholdDegPerDay: number}} input
 */
export function classifyLongitudinalMotion(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Object.hasOwn(input, 'longitudeSpeedDegPerDay')) {
    throw new AstrologyError('INVALID_LONGITUDE_SPEED', 'An explicit longitudeSpeedDegPerDay number or null is required');
  }
  const { longitudeSpeedDegPerDay: speed, stationaryThresholdDegPerDay: threshold } = input;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0) {
    throw new AstrologyError('INVALID_MOTION_THRESHOLD', 'Explicit finite stationaryThresholdDegPerDay >= 0 is required');
  }
  if (speed !== null && (typeof speed !== 'number' || !Number.isFinite(speed))) {
    throw new AstrologyError('INVALID_LONGITUDE_SPEED', 'longitudeSpeedDegPerDay must be finite or explicit null');
  }
  const motion = speed === null ? 'UNAVAILABLE'
    : speed > threshold ? 'DIRECT'
    : speed < -threshold ? 'RETROGRADE'
    : 'STATIONARY';
  return Object.freeze({
    contract: 'LongitudeMotionFact',
    contractVersion: '0.1.0-experimental',
    motion,
    longitudeSpeedDegPerDay: speed,
    stationaryThresholdDegPerDay: threshold,
  });
}
