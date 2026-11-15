/**
 * Opt-in boundary between the nanosecond civil UTC contracts of PR #70 and
 * the millisecond-limited F5 window input proposed in PR #72.
 * No imports from PR #72, no ephemeris, no rounding or duration calculation.
 */
import { UtcInputError } from './utc-calendar-contract.mjs';
import { createUtcGregorianInterval } from './utc-calendar-intervals.mjs';

/** An exact representation of a validated instant in the F5 1-3 digit syntax. */
function exactMillisecondUtc(instant) {
  if (instant.nanosecond % 1_000_000 !== 0) {
    throw new UtcInputError('UNSUPPORTED_UTC_PRECISION',
      'F5 millisecond windows cannot represent a sub-millisecond UTC endpoint without loss');
  }
  // The Gregorian parser guarantees a fixed 19-character second prefix.
  // Canonicalize to three decimal places without converting calendars/time scales.
  const milliseconds = String(instant.nanosecond / 1_000_000).padStart(3, '0');
  return instant.datetimeUtc.slice(0, 19) + '.' + milliseconds + 'Z';
}

/**
 * Convert a strictly increasing civil UTC interval into the exact input shape
 * accepted by PR #72 validateUtcSearchWindow()/splitUtcSearchWindow().
 * The F5 function itself must *still* check actual elapsed milliseconds and
 * enforce maxDurationMs; this adapter does not validate durations.
 */
export function toF5MillisecondWindowInput({ interval, maxDurationMs } = {}) {
  if (!Number.isSafeInteger(maxDurationMs) || maxDurationMs <= 0) {
    throw new UtcInputError('INVALID_INTERVAL_LIMIT',
      'maxDurationMs must be an explicit positive safe integer');
  }
  const snapshot = createUtcGregorianInterval(interval);
  const startUtc = exactMillisecondUtc(snapshot.start);
  const endUtc = exactMillisecondUtc(snapshot.end);
  return Object.freeze({ startUtc, endUtc, maxDurationMs });
}
