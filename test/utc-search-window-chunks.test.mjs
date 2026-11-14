import test from 'node:test';
import assert from 'node:assert/strict';
import { splitUtcSearchWindow } from '../src/utc-search-window-chunks.mjs';

const base = {
  startUtc: '2024-02-29T23:59:59Z',
  endUtc: '2024-03-01T00:00:00.001Z',
  maxDurationMs: 1001,
  chunkDurationMs: 400,
  maxChunks: 3,
};
const errorCode = code => error => error?.name === 'AstrologyError' && error.code === code;

test('leap-day seam: exact adjacent chunks retain every millisecond', () => {
  const result = splitUtcSearchWindow(base);
  assert.deepEqual(result.chunks.map(chunk => chunk.durationMs), [400, 400, 201]);
  assert.equal(result.chunks[0].startEpochMs, result.window.startEpochMs);
  assert.equal(result.chunks.at(-1).endEpochMs, result.window.endEpochMs);
  for (let i = 0; i < result.chunks.length - 1; i++)
    assert.equal(result.chunks[i].endEpochMs, result.chunks[i + 1].startEpochMs);
  assert.equal(result.chunks.reduce((sum, chunk) => sum + chunk.durationMs, 0), result.window.durationMs);
  assert.equal(result.chunks[0].startUtc, '2024-02-29T23:59:59.000Z');
  assert.equal(result.chunks[2].endUtc, '2024-03-01T00:00:00.001Z');
});

test('exact multiple creates no zero-length chunk; a larger chunk makes one', () => {
  const exact = splitUtcSearchWindow({ ...base, chunkDurationMs: 250, maxChunks: 4, endUtc: '2024-03-01T00:00:00Z' });
  assert.deepEqual(exact.chunks.map(chunk => chunk.durationMs), [250, 250, 250, 250]);
  const one = splitUtcSearchWindow({ ...base, chunkDurationMs: 2000, maxChunks: 1 });
  assert.deepEqual(one.chunks.map(chunk => chunk.durationMs), [1001]);
});

test('results and nested arrays are immutable; inputs remain unchanged', () => {
  const input = { ...base };
  const a = splitUtcSearchWindow(input), b = splitUtcSearchWindow(input);
  assert.deepEqual(a, b);
  assert.deepEqual(input, base);
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(a.window));
  assert.ok(Object.isFrozen(a.chunks));
  assert.ok(a.chunks.every(Object.isFrozen));
  assert.throws(() => { a.chunks[0].durationMs = -1; }, TypeError);
});

test('invalid limits fail closed and prevent unbounded materialization', () => {
  for (const chunkDurationMs of [undefined, null, '200', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => splitUtcSearchWindow({ ...base, chunkDurationMs }), errorCode('INVALID_CHUNK_DURATION'));
  for (const maxChunks of [undefined, null, '3', 0, -1, 1.5, 4097, Infinity, NaN])
    assert.throws(() => splitUtcSearchWindow({ ...base, maxChunks }), errorCode('INVALID_CHUNK_LIMIT'));
  assert.throws(() => splitUtcSearchWindow({ ...base, chunkDurationMs: 1, maxChunks: 4096 - 4093 }), errorCode('TOO_MANY_CHUNKS'));
});

test('invalid UTC window rejected before splitting', () => {
  assert.throws(() => splitUtcSearchWindow(null), errorCode('INVALID_ARGUMENT'));
  assert.throws(() => splitUtcSearchWindow([]), errorCode('INVALID_ARGUMENT'));
  assert.throws(() => splitUtcSearchWindow({ ...base, startUtc: '2023-02-29T23:59:59Z' }), errorCode('INVALID_UTC'));
  assert.throws(() => splitUtcSearchWindow({ ...base, endUtc: base.startUtc }), errorCode('INVALID_INTERVAL'));
  assert.throws(() => splitUtcSearchWindow({ ...base, maxDurationMs: 1000 }), errorCode('INTERVAL_TOO_LONG'));
});
