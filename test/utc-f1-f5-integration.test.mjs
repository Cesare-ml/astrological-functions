import test from 'node:test';
import assert from 'node:assert/strict';
import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import { containsUtcGregorianInstant } from '../src/utc-calendar-window-sets.mjs';
import { splitUtcSearchWindow } from '../src/utc-search-window-chunks.mjs';
import { scanUtcChunkCandidatesWithProvider } from '../src/utc-chunk-provider-runner.mjs';
import { validateUtcSearchWindow } from '../src/utc-search-window.mjs';

const utc = (datetimeUtc) => Object.freeze({
  datetimeUtc, calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC',
});
const input = (start, end, maxDurationMs) => ({
  interval: { start: utc(start), end: utc(end) }, maxDurationMs,
});
const windowInput = (options, chunkDurationMs, maxChunks) => ({
  ...toF5MillisecondWindowInput(options), chunkDurationMs, maxChunks,
});
const hasCode = code => error => error?.code === code;

test('F1 nanosecond endpoints bridge exactly to F5 leap-day chunks and deduplicated seam', async () => {
  const options = input('2024-02-29T23:59:59.000000000Z', '2024-03-01T00:00:00Z', 1000);
  const window = windowInput(options, 500, 2);
  assert.deepEqual(window, {
    startUtc: '2024-02-29T23:59:59.000Z',
    endUtc: '2024-03-01T00:00:00.000Z',
    maxDurationMs: 1000, chunkDurationMs: 500, maxChunks: 2,
  });
  const plan = splitUtcSearchWindow(window);
  assert.deepEqual(plan.chunks.map(chunk => chunk.durationMs), [500, 500]);
  const calls = [];
  const provider = { async scanChunk(request) {
    calls.push(request.chunkIndex);
    assert.ok(Object.isFrozen(request));
    return request.chunkIndex === 0
      ? [{ eventKey: 'SYNTHETIC_SEAM', instantUtc: request.endUtc }]
      : [
        { eventKey: 'SYNTHETIC_SEAM', instantUtc: request.startUtc },
        { eventKey: 'SYNTHETIC_LAST', instantUtc: '2024-02-29T23:59:59.999Z' },
      ];
  }};
  const result = await scanUtcChunkCandidatesWithProvider({windowInput:window, maxInputHits:3, provider});
  assert.deepEqual(calls, [0, 1]);
  assert.equal(result.rawHitCount, 3);
  assert.equal(result.duplicateCount, 1);
  assert.deepEqual(result.hits.map(({ eventKey, ownerChunkIndex }) => [eventKey, ownerChunkIndex]), [
    ['SYNTHETIC_SEAM', 1], ['SYNTHETIC_LAST', 1],
  ]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.hits));
  assert.equal(containsUtcGregorianInstant(options.interval, utc(result.hits[0].instantUtc)), true);
  assert.equal(containsUtcGregorianInstant(options.interval, options.interval.end), false);
});

test('F1 refuses sub-millisecond time before F5 accepts an ambiguous endpoint', () => {
  const options = input('2026-11-14T00:00:00.000000001Z', '2026-11-14T00:00:01Z', 1000);
  assert.throws(() => toF5MillisecondWindowInput(options), hasCode('UNSUPPORTED_UTC_PRECISION'));
  assert.throws(() => toF5MillisecondWindowInput(input(
    '2026-11-14T00:00:00Z', '2026-11-14T00:00:01.000000001Z', 1000,
  )), hasCode('UNSUPPORTED_UTC_PRECISION'));
});

test('F5 retains its own duration gate after valid precision conversion', async () => {
  const window = windowInput(input('2026-11-14T00:00:00Z', '2026-11-14T00:00:02Z', 1000), 500, 4);
  assert.throws(() => validateUtcSearchWindow(window), hasCode('INTERVAL_TOO_LONG'));
  let calls=0;
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider({
    windowInput:window, maxInputHits:3,
    provider:{async scanChunk(){calls++;return [];}}
  }), hasCode('INTERVAL_TOO_LONG'));
  assert.equal(calls, 0);
});

test('overall terminal event never leaks through a provider supplied closed-edge hit', async () => {
  const window = windowInput(input('2026-11-14T00:00:00Z', '2026-11-14T00:00:01Z', 1000), 500, 2);
  let calls=0;
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider({
    windowInput:window, maxInputHits:2,
    provider:{async scanChunk(request){calls++;return request.chunkIndex === 0 ? [] : [
      { eventKey: 'SYNTHETIC_TERMINAL', instantUtc: request.endUtc },
    ];}},
  }), hasCode('EVENT_OUTSIDE_CHUNK'));
  assert.equal(calls, 2);
});

test('a snapshot is not changed by later caller mutation', async () => {
  const userInput = input('2024-02-29T23:59:59Z', '2024-03-01T00:00:00Z', 1000);
  const window = windowInput(userInput, 500, 2);
  userInput.interval.start = utc('2024-02-28T00:00:00Z');
  userInput.interval.end = utc('2024-03-30T00:00:00Z');
  const response = await scanUtcChunkCandidatesWithProvider({
    windowInput:window, maxInputHits:1,
    provider:{async scanChunk(){return [];}}
  });
  assert.equal(response.window.startUtc, '2024-02-29T23:59:59.000Z');
  assert.equal(response.providerCallCount, 2);
  assert.deepEqual(response.hits, []);
});
