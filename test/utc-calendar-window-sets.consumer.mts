import {
  containsUtcGregorianInstant,
  intersectUtcGregorianIntervals,
} from '../src/utc-calendar-window-sets.mjs';
import type { UtcGregorianInterval } from '../src/utc-calendar-intervals.mjs';

const start = { datetimeUtc: '2026-11-14T12:00:00Z', calendar: 'PROLEPTIC_GREGORIAN' as const, timeScale: 'UTC' as const };
const end = { ...start, datetimeUtc: '2026-11-14T12:00:01Z' };
const range = { start, end };
const membership: boolean = containsUtcGregorianInstant(range, start);
const overlap: Readonly<UtcGregorianInterval> | null = intersectUtcGregorianIntervals(range, range);
void [membership, overlap];

// @ts-expect-error UTC instants require an explicit proleptic Gregorian calendar.
containsUtcGregorianInstant(range, { datetimeUtc: '2026-11-14T12:00:00Z', timeScale: 'UTC' });
// @ts-expect-error no silent TT conversion.
containsUtcGregorianInstant(range, { ...start, timeScale: 'TT' });
// @ts-expect-error the interval must have both endpoints.
intersectUtcGregorianIntervals(range, { start });
// @ts-expect-error result is readonly; null must also be handled before mutation.
overlap.start.year = 2020;
