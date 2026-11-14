import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUtcSearchWindow } from '../src/utc-search-window.mjs';

const base = {
  startUtc: '2024-02-29T23:59:59.999Z',
  endUtc: '2024-03-01T00:00:00Z',
  maxDurationMs: 1,
};
const errorCode = code => error => error?.name === 'AstrologyError' && error.code === code;

test('leap-day midnight crossing is one millisecond and fully frozen', () => {
  const window = validateUtcSearchWindow(base);
  assert.equal(window.durationMs, 1);
  assert.equal(window.endEpochMs - window.startEpochMs, 1);
  assert.ok(Object.isFrozen(window));
  assert.deepEqual(Object.keys(window), [
    'startUtc', 'endUtc', 'startEpochMs', 'endEpochMs', 'durationMs', 'maxDurationMs',
  ]);
});

test('fractional UTC precision is explicit and limited to milliseconds', () => {
  const input = { startUtc: '2026-11-14T01:02:03.1Z', endUtc: '2026-11-14T01:02:03.123Z', maxDurationMs: 23 };
  assert.equal(validateUtcSearchWindow(input).durationMs, 23);
  assert.throws(() => validateUtcSearchWindow({ ...input, maxDurationMs: 22 }), errorCode('INTERVAL_TOO_LONG'));
  for (const bad of ['2026-11-14T01:02:03.1234Z', '2026-11-14T01:02:03.Z', '2026-11-14T01:02:03.0000Z'])
    assert.throws(() => validateUtcSearchWindow({ ...input, startUtc: bad }), errorCode('INVALID_UTC'));
});

test('strict calendar checking rejects rollover, leap seconds and offsets', () => {
  const bad = [
    '2023-02-29T00:00:00Z', '2026-02-30T00:00:00Z', '2026-13-01T00:00:00Z',
    '2026-11-14T24:00:00Z', '2026-11-14T23:59:60Z', '2026-11-14T01:00:00+01:00',
    '2026-11-14T01:00:00', '2026-11-14', '', null, 1720000000000,
  ];
  for (const startUtc of bad)
    assert.throws(() => validateUtcSearchWindow({ ...base, startUtc }), errorCode('INVALID_UTC'), String(startUtc));
});

test('must be strictly increasing, with no implicit max-horizon default', () => {
  for (const endUtc of [base.startUtc, '2024-02-29T23:59:59.998Z'])
    assert.throws(() => validateUtcSearchWindow({ ...base, endUtc }), errorCode('INVALID_INTERVAL'));
  assert.throws(() => validateUtcSearchWindow({ ...base, maxDurationMs: undefined }), errorCode('INVALID_INTERVAL_LIMIT'));
  for (const maxDurationMs of [0, -1, 0.5, NaN, Infinity, '1000', Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => validateUtcSearchWindow({ ...base, maxDurationMs }), errorCode('INVALID_INTERVAL_LIMIT'));
  assert.throws(() => validateUtcSearchWindow(null), errorCode('INVALID_ARGUMENT'));
  assert.throws(() => validateUtcSearchWindow([]), errorCode('INVALID_ARGUMENT'));
});

test('a full-day window is permitted only within an explicit day-sized limit', () => {
  const input = { startUtc: '2026-11-14T00:00:00Z', endUtc: '2026-11-15T00:00:00Z', maxDurationMs: 86400000 };
  assert.equal(validateUtcSearchWindow(input).durationMs, 86400000);
  assert.throws(() => validateUtcSearchWindow({ ...input, maxDurationMs: 86399999 }), errorCode('INTERVAL_TOO_LONG'));
});
