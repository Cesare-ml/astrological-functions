import test from 'node:test';
import assert from 'node:assert/strict';
import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import { UtcInputError } from '../src/utc-calendar-contract.mjs';

const utc = (datetimeUtc, more = {}) => ({
  datetimeUtc, calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC', ...more,
});
const interval = (start, end) => ({start: utc(start), end: utc(end)});
const convert = (start, end, maxDurationMs = 86400000) =>
  toF5MillisecondWindowInput({interval: interval(start, end), maxDurationMs});

test('converts zero and aligned 9-digit UTC fractions without rounding', () => {
  const result = convert('2026-11-14T12:00:00.123000000Z', '2026-11-14T12:00:00.124Z', 1);
  assert.deepEqual(result, {
    startUtc: '2026-11-14T12:00:00.123Z',
    endUtc: '2026-11-14T12:00:00.124Z',
    maxDurationMs: 1,
  });
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(convert('2026-11-14T00:00:00Z', '2026-11-15T00:00:00.000000000Z'), {
    startUtc: '2026-11-14T00:00:00.000Z',
    endUtc: '2026-11-15T00:00:00.000Z',
    maxDurationMs: 86400000,
  });
});

test('refuses loss of single nanosecond at either endpoint', () => {
  for (const [start, end] of [
    ['2026-11-14T00:00:00.000000001Z', '2026-11-14T00:00:01Z'],
    ['2026-11-14T00:00:00Z', '2026-11-14T00:00:01.999999999Z'],
    ['2026-11-14T00:00:00.123000001Z', '2026-11-14T00:00:00.124000000Z'],
  ]) {
    assert.throws(() => convert(start, end), e => e instanceof UtcInputError &&
      e.code === 'UNSUPPORTED_UTC_PRECISION');
  }
});

test('preserves chronological and half-open endpoint identity across Gregorian leap day', () => {
  assert.deepEqual(convert('2024-02-29T23:59:59.999000000Z', '2024-03-01T00:00:00Z', 1), {
    startUtc: '2024-02-29T23:59:59.999Z',
    endUtc: '2024-03-01T00:00:00.000Z',
    maxDurationMs: 1,
  });
});

test('rejects missing, invalid, or unsafe explicit F5 duration ceilings', () => {
  for (const maxDurationMs of [undefined, null, 0, -1, 0.1, 1.5, Number.NaN,
    Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, '1000']) {
    assert.throws(() => toF5MillisecondWindowInput({
      interval: interval('2026-11-14T00:00:00Z', '2026-11-14T00:00:01Z'),
      maxDurationMs,
    }), e => e.code === 'INVALID_INTERVAL_LIMIT');
  }
});

test('never accepts impossible dates, unsupported timescales or reversed/empty windows', () => {
  assert.throws(() => convert('1900-02-29T00:00:00Z', '1900-03-01T00:00:00Z'),
    e => e.code === 'INVALID_UTC_INPUT');
  assert.throws(() => convert('2026-11-14T00:00:00Z', '2026-11-14T00:00:00.000Z'),
    e => e.code === 'INVALID_UTC_INTERVAL');
  assert.throws(() => convert('2026-11-15T00:00:00Z', '2026-11-14T00:00:00Z'),
    e => e.code === 'INVALID_UTC_INTERVAL');
  assert.throws(() => toF5MillisecondWindowInput({interval: {
    start: utc('2026-11-14T00:00:00Z', { timeScale: 'TT' }),
    end: utc('2026-11-15T00:00:00Z'),
  }, maxDurationMs: 86400000}), e => e.code === 'UNSUPPORTED_TIME_SCALE');
});

test('returns detached results and never claims to enforce maxDurationMs', () => {
  const original = interval('2026-11-14T00:00:00Z', '2026-11-15T00:00:00Z');
  const result = toF5MillisecondWindowInput({interval: original, maxDurationMs: 1});
  original.start.datetimeUtc = '1900-01-01T00:00:00Z';
  assert.equal(result.startUtc, '2026-11-14T00:00:00.000Z');
  assert.equal(result.maxDurationMs, 1);
  assert.throws(() => { result.endUtc = '1999-01-01T00:00:00.000Z'; }, TypeError);
});
