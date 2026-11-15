import type { UtcGregorianIntervalInput } from './utc-calendar-intervals.mjs';

/** Exact millisecond-precision input for a future PR #72 F5 validator. */
export interface F5UtcWindowInput {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly maxDurationMs: number;
}

/** Explicit bound required; no implicit horizon, rounding or conversion. */
export declare function toF5MillisecondWindowInput(input: {
  readonly interval: UtcGregorianIntervalInput;
  readonly maxDurationMs: number;
}): Readonly<F5UtcWindowInput>;
