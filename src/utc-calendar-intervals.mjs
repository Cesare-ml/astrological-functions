/**
 * Ordered civil UTC instants and half-open windows for future astrological
 * event-search inputs. No JD, UTC elapsed-time duration or astronomy here.
 */
import { parseUtcGregorianInstant, UtcInputError } from './utc-calendar-contract.mjs';

const SORT_FIELDS = Object.freeze([
  'year', 'month', 'day', 'hour', 'minute', 'second', 'nanosecond',
]);

function compareParsed(left, right) {
  for (const field of SORT_FIELDS) {
    if (left[field] < right[field]) return -1;
    if (left[field] > right[field]) return 1;
  }
  return 0;
}

/**
 * Compare two independently validated civil UTC instants. Returns -1/0/1.
 * Fractions with different literal widths but equal numeric value compare
 * equal (for example, .1Z === .100000000Z).
 */
export function compareUtcGregorianInstants(left, right) {
  return compareParsed(parseUtcGregorianInstant(left), parseUtcGregorianInstant(right));
}

/**
 * Validate a strictly increasing, half-open UTC search interval [start, end).
 * Endpoint snapshots are frozen and detached from caller-owned input objects.
 * No assumption about UTC-to-TT/TDB conversions or elapsed SI seconds.
 */
export function createUtcGregorianInterval(interval) {
  if (interval === null || typeof interval !== 'object' || Array.isArray(interval)) {
    throw new UtcInputError('INVALID_UTC_INTERVAL', 'An interval with start and end is required');
  }
  const start = parseUtcGregorianInstant(interval.start);
  const end = parseUtcGregorianInstant(interval.end);
  if (compareParsed(start, end) >= 0) {
    throw new UtcInputError('INVALID_UTC_INTERVAL', 'UTC interval end must be strictly after start');
  }
  return Object.freeze({
    start,
    end,
    boundary: 'START_INCLUSIVE_END_EXCLUSIVE',
  });
}
