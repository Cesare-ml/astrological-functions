import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUtcGregorianInstant, UtcInputError } from '../src/utc-calendar-contract.mjs';

const input = (datetimeUtc, changes = {}) => ({
  datetimeUtc, calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC', ...changes,
});

const invalid = (datetimeUtc) => {
  assert.throws(() => parseUtcGregorianInstant(input(datetimeUtc)),
    (error) => error instanceof UtcInputError && error.code === 'INVALID_UTC_INPUT');
};

test('valid Gregorian leap and century boundaries are retained exactly', () => {
  for (const value of [
    '0001-01-01T00:00:00Z', '1600-02-29T23:59:59Z',
    '2000-02-29T12:34:56Z', '2024-02-29T00:00:00Z',
    '9999-12-31T23:59:59Z',
  ]) {
    const result = parseUtcGregorianInstant(input(value));
    assert.equal(result.datetimeUtc, value);
    assert.equal(result.calendar, 'PROLEPTIC_GREGORIAN');
    assert.equal(result.timeScale, 'UTC');
    assert.ok(Object.isFrozen(result));
  }
});

test('rejects impossible calendar days instead of Date.parse rollover', () => {
  for (const value of [
    '0000-01-01T00:00:00Z', '1900-02-29T12:00:00Z',
    '2100-02-29T12:00:00Z', '2026-02-29T12:00:00Z',
    '2026-02-30T12:00:00Z', '2026-04-31T12:00:00Z',
    '2026-00-10T12:00:00Z', '2026-13-10T12:00:00Z',
    '2026-11-00T12:00:00Z', '2026-11-32T12:00:00Z',
  ]) invalid(value);
});

test('rejects implicit timezone, local time, leap second, and 24-hour rollover', () => {
  for (const value of [
    '2026-11-14T12:00:00+00:00', '2026-11-14T12:00:00+01:00',
    '2026-11-14T12:00:00', '2026-11-14 12:00:00Z',
    '2026-11-14T24:00:00Z', '2026-11-14T23:60:00Z',
    '2026-11-14T23:59:60Z', '2026-11-14t12:00:00z',
    '2026-11-14T12:00Z', '2026-11-14T12:00:00.Z',
    '2026-11-14T12:00:00.1234567890Z',
    '2026-11-14T12:00:00Z ',
  ]) invalid(value);
});

test('retains 1–9 fractional digits and nanoseconds without lossy conversion', () => {
  const cases = [
    ['2026-11-14T12:00:00.1Z', 100000000, 1],
    ['2026-11-14T12:00:00.000000001Z', 1, 9],
    ['2026-11-14T12:00:00.123456789Z', 123456789, 9],
    ['2026-11-14T12:00:00.000Z', 0, 3],
    ['2026-11-14T12:00:00Z', 0, 0],
  ];
  for (const [text, nanosecond, digits] of cases) {
    const result = parseUtcGregorianInstant(input(text));
    assert.equal(result.nanosecond, nanosecond);
    assert.equal(result.fractionalSecondDigits, digits);
    assert.equal(result.datetimeUtc, text);
  }
});

test('explicit unsupported calendar, time scale and malformed input fail closed', () => {
  assert.throws(() => parseUtcGregorianInstant(input('2026-11-14T12:00:00Z', { calendar: 'JULIAN' })),
    (error) => error.code === 'UNSUPPORTED_CALENDAR');
  assert.throws(() => parseUtcGregorianInstant(input('2026-11-14T12:00:00Z', { timeScale: 'TT' })),
    (error) => error.code === 'UNSUPPORTED_TIME_SCALE');
  assert.throws(() => parseUtcGregorianInstant(null),
    (error) => error.code === 'INVALID_UTC_INPUT');
  assert.throws(() => parseUtcGregorianInstant([]),
    (error) => error.code === 'INVALID_UTC_INPUT');
  invalid(12345);
});

test('returned data cannot be mutated or used to silently change input', () => {
  const source = input('2026-11-14T12:00:00.123456789Z');
  const result = parseUtcGregorianInstant(source);
  source.datetimeUtc = '1999-01-01T00:00:00Z';
  assert.equal(result.datetimeUtc, '2026-11-14T12:00:00.123456789Z');
  assert.throws(() => { result.year = 1999; }, TypeError);
});
