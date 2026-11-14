import { compareUtcGregorianInstants, createUtcGregorianInterval } from '../src/utc-calendar-intervals.mjs';

const start = {
  datetimeUtc: '2026-11-14T12:00:00.000000001Z',
  calendar: 'PROLEPTIC_GREGORIAN' as const,
  timeScale: 'UTC' as const,
};
const end = { ...start, datetimeUtc: '2026-11-14T12:00:00.000000002Z' };
const order: -1 | 0 | 1 = compareUtcGregorianInstants(start, end);
const result = createUtcGregorianInterval({ start, end });
const boundary: 'START_INCLUSIVE_END_EXCLUSIVE' = result.boundary;
void [order, boundary];

// @ts-expect-error: result snapshots are immutable.
result.end.nanosecond = 123;
// @ts-expect-error: TT must not be implicitly treated as UTC.
compareUtcGregorianInstants({ ...start, timeScale: 'TT' }, end);
// @ts-expect-error: both endpoints are required.
createUtcGregorianInterval({ start });
