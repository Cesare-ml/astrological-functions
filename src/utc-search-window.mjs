/**
 * UTC civil-time range validation for experimental event-search consumers.
 * Pure input validation; does not calculate astronomical time scales/events.
 */
import { AstrologyError } from './index.mjs';

const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,3}))?Z$/;

function parseStrictUtcInstant(value, field) {
  if (typeof value !== 'string')
    throw new AstrologyError('INVALID_UTC', `${field} must be an explicit UTC ISO instant`);
  const match = UTC_INSTANT.exec(value);
  if (!match)
    throw new AstrologyError('INVALID_UTC', `${field} must use YYYY-MM-DDTHH:mm:ss[.SSS]Z`);
  const epochMs = Date.parse(value);
  // Date.parse may normalize impossible dates, so compare every civil-time field.
  const expected = `${value.slice(0, 19)}.${(match[1] ?? '').padEnd(3, '0')}Z`;
  if (!Number.isFinite(epochMs) || new Date(epochMs).toISOString() !== expected)
    throw new AstrologyError('INVALID_UTC', `${field} is not a real UTC calendar instant`);
  return epochMs;
}

/**
 * A caller-bounded, strictly increasing UTC interval. Both ends are instants;
 * endpoints themselves are not interpreted as event hits here.
 * No implicit search horizon or rounding is applied.
 */
export function validateUtcSearchWindow(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Search window options must be an object');
  const { startUtc, endUtc, maxDurationMs } = input;
  if (!Number.isSafeInteger(maxDurationMs) || maxDurationMs <= 0)
    throw new AstrologyError('INVALID_INTERVAL_LIMIT', 'maxDurationMs must be an explicit positive safe integer');
  const startEpochMs = parseStrictUtcInstant(startUtc, 'startUtc');
  const endEpochMs = parseStrictUtcInstant(endUtc, 'endUtc');
  const durationMs = endEpochMs - startEpochMs;
  if (durationMs <= 0)
    throw new AstrologyError('INVALID_INTERVAL', 'endUtc must be strictly after startUtc');
  if (durationMs > maxDurationMs)
    throw new AstrologyError('INTERVAL_TOO_LONG', 'Search window exceeds maxDurationMs');
  return Object.freeze({ startUtc, endUtc, startEpochMs, endEpochMs, durationMs, maxDurationMs });
}
