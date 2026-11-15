import { parseUtcGregorianInstant, UtcInputError } from '../src/utc-calendar-contract.mjs';

const parsed = parseUtcGregorianInstant({
  datetimeUtc: '2026-11-14T12:00:00.123456789Z',
  calendar: 'PROLEPTIC_GREGORIAN',
  timeScale: 'UTC',
});
const nanos: number = parsed.nanosecond;
const calendar: 'PROLEPTIC_GREGORIAN' = parsed.calendar;
const text: string = parsed.datetimeUtc;
void [nanos, calendar, text];

// @ts-expect-error: frozen return contract must not expose mutable fields.
parsed.year = 1999;
// @ts-expect-error: unsupported calendars must be rejected at compile time.
parseUtcGregorianInstant({ datetimeUtc: '2026-11-14T12:00:00Z', calendar: 'JULIAN', timeScale: 'UTC' });
// @ts-expect-error: no unversioned TT/TDB conversion is implied.
parseUtcGregorianInstant({ datetimeUtc: '2026-11-14T12:00:00Z', calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'TT' });

function codeOf(error: UtcInputError): string { return error.code; }
void codeOf;
