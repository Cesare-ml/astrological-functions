import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareUtcGregorianInstants,
  createUtcGregorianInterval,
} from '../src/utc-calendar-intervals.mjs';
import { UtcInputError } from '../src/utc-calendar-contract.mjs';

const instant = (datetimeUtc, changes = {}) => ({
  datetimeUtc, calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC', ...changes,
});

test('civil chronological order crosses leap days, midnight and centuries', () => {
  const ordered = [
    '1900-02-28T23:59:59Z',
    '1900-03-01T00:00:00Z',
    '2000-02-29T00:00:00Z',
    '2024-02-29T23:59:59.999999999Z',
    '2024-03-01T00:00:00Z',
  ];
  for (let i = 1; i < ordered.length; i++) {
    assert.equal(compareUtcGregorianInstants(instant(ordered[i - 1]), instant(ordered[i])), -1);
    assert.equal(compareUtcGregorianInstants(instant(ordered[i]), instant(ordered[i - 1])), 1);
  }
});

test('unequal fraction widths compare by nanoseconds rather than strings', () => {
  const base = '2026-11-14T12:00:00';
  assert.equal(compareUtcGregorianInstants(instant(`${base}.1Z`), instant(`${base}.100000000Z`)), 0);
  assert.equal(compareUtcGregorianInstants(instant(`${base}Z`), instant(`${base}.000Z`)), 0);
  assert.equal(compareUtcGregorianInstants(instant(`${base}.1Z`), instant(`${base}.100000001Z`)), -1);
  assert.equal(compareUtcGregorianInstants(instant(`${base}.999999999Z`), instant('2026-11-14T12:00:01Z')), -1);
});

test('creates immutable detached half-open intervals with exact precision', () => {
  const start = instant('2026-11-14T12:00:00.123456789Z');
  const end = instant('2026-11-14T12:00:00.123456790Z');
  const result = createUtcGregorianInterval({ start, end });
  assert.equal(result.boundary, 'START_INCLUSIVE_END_EXCLUSIVE');
  assert.equal(result.start.nanosecond, 123456789);
  assert.equal(result.end.nanosecond, 123456790);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.start));
  assert.ok(Object.isFrozen(result.end));
  start.datetimeUtc = '1900-01-01T00:00:00Z';
  assert.equal(result.start.datetimeUtc, '2026-11-14T12:00:00.123456789Z');
  assert.throws(() => { result.end.year = 1900; }, TypeError);
});

test('rejects intervals with equal instants or a reversed order', () => {
  for (const [start, end] of [
    ['2026-11-14T12:00:00.1Z', '2026-11-14T12:00:00.100000000Z'],
    ['2026-11-14T12:00:01Z', '2026-11-14T12:00:00.999999999Z'],
    ['2027-01-01T00:00:00Z', '2026-12-31T23:59:59Z'],
  ]) {
    assert.throws(() => createUtcGregorianInterval({ start: instant(start), end: instant(end) }),
      (error) => error instanceof UtcInputError && error.code === 'INVALID_UTC_INTERVAL');
  }
  for (const invalid of [null, [], '2026-11-14', {}]) {
    assert.throws(() => createUtcGregorianInterval(invalid),
      (error) => error.code === 'INVALID_UTC_INTERVAL' || error.code === 'INVALID_UTC_INPUT');
  }
});

test('rejects invalid endpoints and unsupported timescales without fallback', () => {
  assert.throws(() => compareUtcGregorianInstants(
    instant('2026-02-30T00:00:00Z'), instant('2026-03-01T00:00:00Z')),
  (error) => error.code === 'INVALID_UTC_INPUT');
  assert.throws(() => createUtcGregorianInterval({
    start: instant('2026-11-14T12:00:00Z'),
    end: instant('2026-11-15T12:00:00Z', { timeScale: 'TT' }),
  }), (error) => error.code === 'UNSUPPORTED_TIME_SCALE');
  assert.throws(() => createUtcGregorianInterval({
    start: instant('2026-11-14T12:00:00Z'),
    end: instant('2026-11-15T12:00:00+01:00'),
  }), (error) => error.code === 'INVALID_UTC_INPUT');
});
