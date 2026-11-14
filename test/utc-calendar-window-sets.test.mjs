import test from 'node:test';
import assert from 'node:assert/strict';
import {
  containsUtcGregorianInstant,
  intersectUtcGregorianIntervals,
} from '../src/utc-calendar-window-sets.mjs';
import { UtcInputError } from '../src/utc-calendar-contract.mjs';

const instant = (datetimeUtc, changes = {}) => ({
  datetimeUtc, calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC', ...changes,
});
const window = (start, end) => ({ start: instant(start), end: instant(end) });

test('membership is inclusive at start and exclusive at end, even at one nanosecond', () => {
  const range = window('2026-11-14T12:00:00.000000001Z', '2026-11-14T12:00:00.000000003Z');
  assert.equal(containsUtcGregorianInstant(range, instant('2026-11-14T12:00:00Z')), false);
  assert.equal(containsUtcGregorianInstant(range, instant('2026-11-14T12:00:00.000000001Z')), true);
  assert.equal(containsUtcGregorianInstant(range, instant('2026-11-14T12:00:00.000000002Z')), true);
  assert.equal(containsUtcGregorianInstant(range, instant('2026-11-14T12:00:00.000000003Z')), false);
});

test('membership handles dates, leap days, and equivalent fractional encodings', () => {
  const range = window('2024-02-29T23:59:59.1Z', '2024-03-01T00:00:00Z');
  assert.equal(containsUtcGregorianInstant(range, instant('2024-02-29T23:59:59.100000000Z')), true);
  assert.equal(containsUtcGregorianInstant(range, instant('2024-02-29T23:59:59.999999999Z')), true);
  assert.equal(containsUtcGregorianInstant(range, instant('2024-03-01T00:00:00.000Z')), false);
});

test('overlap is maximal half-open intersection with frozen snapshots', () => {
  const first = window('2026-11-14T12:00:00.000000001Z', '2026-11-14T12:00:00.000000004Z');
  const second = window('2026-11-14T12:00:00.000000003Z', '2026-11-14T12:00:00.000000005Z');
  const overlap = intersectUtcGregorianIntervals(first, second);
  assert.equal(overlap.start.nanosecond, 3);
  assert.equal(overlap.end.nanosecond, 4);
  assert.equal(overlap.boundary, 'START_INCLUSIVE_END_EXCLUSIVE');
  assert.ok(Object.isFrozen(overlap));
  assert.ok(Object.isFrozen(overlap.start));
  assert.ok(Object.isFrozen(overlap.end));
  first.end.datetimeUtc = '2026-11-14T12:00:01Z';
  assert.equal(overlap.end.nanosecond, 4);
  assert.throws(() => { overlap.start.year = 1900; }, TypeError);
});

test('intersection returns null for both disjoint and touching windows', () => {
  const first = window('2026-11-14T12:00:00Z', '2026-11-14T12:00:01Z');
  const touching = window('2026-11-14T12:00:01.000Z', '2026-11-14T12:00:02Z');
  const distant = window('2026-11-14T12:00:03Z', '2026-11-14T12:00:04Z');
  assert.equal(intersectUtcGregorianIntervals(first, touching), null);
  assert.equal(intersectUtcGregorianIntervals(touching, first), null);
  assert.equal(intersectUtcGregorianIntervals(first, distant), null);
  assert.equal(intersectUtcGregorianIntervals(distant, first), null);
});

test('intersection handles full containment, equality, and operand symmetry', () => {
  const outer = window('2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z');
  const inner = window('2026-05-01T00:00:00Z', '2026-06-01T00:00:00Z');
  for (const [a, b] of [[outer, inner], [inner, outer], [inner, inner]]) {
    const result = intersectUtcGregorianIntervals(a, b);
    assert.equal(result.start.datetimeUtc, inner.start.datetimeUtc);
    assert.equal(result.end.datetimeUtc, inner.end.datetimeUtc);
  }
});

test('both operations fail closed on invalid times or inverted windows', () => {
  const valid = window('2026-11-14T12:00:00Z', '2026-11-14T12:00:01Z');
  const invalid = window('2026-11-14T12:00:01Z', '2026-11-14T12:00:00Z');
  assert.throws(() => containsUtcGregorianInstant(invalid, instant('2026-11-14T12:00:00Z')),
    (error) => error instanceof UtcInputError && error.code === 'INVALID_UTC_INTERVAL');
  assert.throws(() => intersectUtcGregorianIntervals(valid, invalid),
    (error) => error instanceof UtcInputError && error.code === 'INVALID_UTC_INTERVAL');
  assert.throws(() => containsUtcGregorianInstant(valid, instant('2026-11-14T12:00:00+01:00')),
    (error) => error instanceof UtcInputError && error.code === 'INVALID_UTC_INPUT');
  assert.throws(() => intersectUtcGregorianIntervals(
    valid, { start: instant('2026-02-30T00:00:00Z'), end: valid.end },
  ), (error) => error instanceof UtcInputError && error.code === 'INVALID_UTC_INPUT');
});
