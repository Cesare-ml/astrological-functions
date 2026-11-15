import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import type { F5UtcWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';

const start = { datetimeUtc: '2026-11-14T00:00:00.123000000Z',
  calendar: 'PROLEPTIC_GREGORIAN' as const, timeScale: 'UTC' as const };
const end = { ...start, datetimeUtc: '2026-11-14T00:00:01Z' };
const result: Readonly<F5UtcWindowInput> = toF5MillisecondWindowInput({
  interval: {start, end}, maxDurationMs: 1_000,
});
const ceiling: number = result.maxDurationMs;
void ceiling;

// @ts-expect-error the bound is required; there is no hidden search horizon.
toF5MillisecondWindowInput({ interval: {start, end} });
// @ts-expect-error no implicit TT to UTC conversion.
toF5MillisecondWindowInput({interval: {start: {...start, timeScale: 'TT'}, end}, maxDurationMs: 1000});
// @ts-expect-error the validated F5 snapshot must be immutable.
result.startUtc = '2026-01-01T00:00:00.000Z';
