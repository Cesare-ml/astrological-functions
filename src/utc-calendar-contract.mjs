/**
 * A strict, deterministic *civil UTC* input contract for experimental astrology
 * consumers. This module performs no astronomy, timezone conversion or JD math.
 * It deliberately does not use Date.parse(), which normalizes some invalid dates.
 */
export class UtcInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UtcInputError';
    this.code = code;
  }
}

const UTC_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?Z$/;
const MONTH_LENGTHS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

function leapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Parse an explicit proleptic Gregorian UTC civil timestamp without rollover.
 * Year 0000, leap seconds (:60), non-Z offsets and >9 fractional digits are
 * intentionally unsupported until separately versioned time policies exist.
 *
 * Returns a frozen value, preserving the caller's original timestamp text and
 * exact fractional-second precision (up to nanoseconds), not an epoch/JD.
 */
export function parseUtcGregorianInstant(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new UtcInputError('INVALID_UTC_INPUT', 'An explicit UTC instant contract object is required');
  }
  if (input.calendar !== 'PROLEPTIC_GREGORIAN') {
    throw new UtcInputError('UNSUPPORTED_CALENDAR', 'calendar must be PROLEPTIC_GREGORIAN');
  }
  if (input.timeScale !== 'UTC') {
    throw new UtcInputError('UNSUPPORTED_TIME_SCALE', 'timeScale must be UTC');
  }
  const text = input.datetimeUtc;
  const match = typeof text === 'string' ? UTC_PATTERN.exec(text) : null;
  if (!match) {
    throw new UtcInputError('INVALID_UTC_INPUT', 'datetimeUtc must use YYYY-MM-DDTHH:mm:ss[.1-9 digits]Z');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? '';
  const daysInMonth = month >= 1 && month <= 12
    ? MONTH_LENGTHS[month - 1] + (month === 2 && leapYear(year) ? 1 : 0)
    : 0;
  if (year === 0 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) {
    throw new UtcInputError('INVALID_UTC_INPUT', 'datetimeUtc is not a valid proleptic Gregorian UTC civil instant');
  }
  return Object.freeze({
    datetimeUtc: text,
    calendar: 'PROLEPTIC_GREGORIAN',
    timeScale: 'UTC',
    year, month, day, hour, minute, second,
    nanosecond: fraction ? Number(fraction.padEnd(9, '0')) : 0,
    fractionalSecondDigits: fraction.length,
  });
}
