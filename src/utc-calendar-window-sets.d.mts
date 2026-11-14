/** Half-open UTC civil interval operations; not SI duration or ephemeris time. */
import type { UtcGregorianInstantInput } from './utc-calendar-contract.mjs';
import type { UtcGregorianInterval, UtcGregorianIntervalInput } from './utc-calendar-intervals.mjs';

/** True for start <= instant < end, with exact nanosecond ordering. */
export declare function containsUtcGregorianInstant(
  interval: UtcGregorianIntervalInput,
  instant: UtcGregorianInstantInput,
): boolean;

/** An immutable [start, end) snapshot, or null if intervals do not overlap. */
export declare function intersectUtcGregorianIntervals(
  left: UtcGregorianIntervalInput,
  right: UtcGregorianIntervalInput,
): Readonly<UtcGregorianInterval> | null;
