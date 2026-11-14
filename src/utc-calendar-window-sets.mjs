/**
 * Half-open UTC civil-time membership and intersection for event-search inputs.
 * Only ordering is asserted: no leap-second arithmetic, JD, or astronomy.
 */
import { parseUtcGregorianInstant } from './utc-calendar-contract.mjs';
import { compareUtcGregorianInstants, createUtcGregorianInterval } from './utc-calendar-intervals.mjs';

/**
 * Membership in [start, end). A candidate exactly on end is excluded.
 * Input intervals and candidate instants are revalidated; no input is mutated.
 */
export function containsUtcGregorianInstant(interval, instant) {
  const window = createUtcGregorianInterval(interval);
  const candidate = parseUtcGregorianInstant(instant);
  return compareUtcGregorianInstants(window.start, candidate) <= 0 &&
    compareUtcGregorianInstants(candidate, window.end) < 0;
}

/**
 * Intersection of two validated [start, end) windows.
 * Returns null for disjoint OR merely touching endpoints, never a zero-width
 * interval. Successful snapshots are deeply frozen by the input validator.
 */
export function intersectUtcGregorianIntervals(left, right) {
  const first = createUtcGregorianInterval(left);
  const second = createUtcGregorianInterval(right);
  const start = compareUtcGregorianInstants(first.start, second.start) >= 0
    ? first.start : second.start;
  const end = compareUtcGregorianInstants(first.end, second.end) <= 0
    ? first.end : second.end;
  return compareUtcGregorianInstants(start, end) < 0
    ? Object.freeze({ start, end, boundary: 'START_INCLUSIVE_END_EXCLUSIVE' })
    : null;
}
