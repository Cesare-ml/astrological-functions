/** Strict civil UTC validation only; no ephemeris, timezone, epoch or Julian day conversion. */
export type UtcCalendar = 'PROLEPTIC_GREGORIAN';
export type UtcTimeScale = 'UTC';

export interface UtcGregorianInstantInput {
  readonly datetimeUtc: string;
  readonly calendar: UtcCalendar;
  readonly timeScale: UtcTimeScale;
}

export interface ParsedUtcGregorianInstant extends UtcGregorianInstantInput {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  /** 0..999999999, retaining sub-millisecond precision without Date rounding. */
  readonly nanosecond: number;
  /** Number of literal decimal places in the input: 0..9. */
  readonly fractionalSecondDigits: number;
}

export type UtcInputErrorCode =
  | 'INVALID_UTC_INPUT'
  | 'UNSUPPORTED_CALENDAR'
  | 'UNSUPPORTED_TIME_SCALE'
  | 'INVALID_UTC_INTERVAL'
  | 'INVALID_INTERVAL_LIMIT'
  | 'UNSUPPORTED_UTC_PRECISION';

export declare class UtcInputError extends Error {
  readonly code: UtcInputErrorCode;
  constructor(code: UtcInputErrorCode, message: string);
}

/** Rejects invalid calendar days and unsupported time semantics, without rollover. */
export declare function parseUtcGregorianInstant(
  input: UtcGregorianInstantInput,
): Readonly<ParsedUtcGregorianInstant>;
