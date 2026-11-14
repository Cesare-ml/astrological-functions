import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileUtcChunkEventHits } from '../src/utc-chunk-event-reconciliation.mjs';

const windowInput = Object.freeze({
  startUtc: '2024-02-29T23:59:59Z',
  endUtc: '2024-03-01T00:00:00Z',
  maxDurationMs: 1000,
  chunkDurationMs: 500,
  maxChunks: 2,
});
const hit = (eventKey, instantUtc) => ({ eventKey, instantUtc });
const options = (a, b, maxInputHits = 20) => ({ windowInput, chunkResults: [
  { chunkIndex: 0, hits: a },
  { chunkIndex: 1, hits: b },
], maxInputHits });
const hasCode = code => error => error?.code === code && error?.name === 'AstrologyError';

test('seam duplicates resolve once, owned by next half-open chunk', () => {
  const instant = '2024-02-29T23:59:59.500Z';
  const result = reconcileUtcChunkEventHits(options(
    [hit('SUN_INGRESS', instant)], [hit('SUN_INGRESS', instant)],
  ));
  assert.equal(result.rawHitCount, 2);
  assert.equal(result.duplicateCount, 1);
  assert.deepEqual(result.hits.map(({ eventKey, ownerChunkIndex }) => [eventKey, ownerChunkIndex]), [['SUN_INGRESS', 1]]);
});

test('different events at same time survive; identical event with alternate UTC spelling merges', () => {
  const seam = '2024-02-29T23:59:59.500Z';
  const result = reconcileUtcChunkEventHits(options(
    [hit('STATION', seam), hit('ASPECT', seam)],
    [hit('STATION', seam), hit('ASPECT', seam)],
  ));
  assert.equal(result.hits.length, 2);
  assert.deepEqual(result.hits.map(x => x.eventKey), ['ASPECT', 'STATION']);
  const sameInstant = reconcileUtcChunkEventHits(options(
    [hit('INGRESS', '2024-02-29T23:59:59.5Z')], [hit('INGRESS', seam)],
  ));
  assert.equal(sameInstant.duplicateCount, 1);
  assert.equal(sameInstant.hits[0].instantUtc, seam);
});

test('right-endpoint reported only by preceding chunk is reassigned, not lost', () => {
  const result = reconcileUtcChunkEventHits(options(
    [hit('__proto__', '2024-02-29T23:59:59.500Z')], [],
  ));
  assert.deepEqual(result.hits.map(x => [x.eventKey, x.ownerChunkIndex]), [['__proto__', 1]]);
});

test('unsorted chunks and hits produce immutable, stable chronological output', () => {
  const input = { windowInput, maxInputHits: 20, chunkResults: [
    { chunkIndex: 1, hits: [hit('Z', '2024-02-29T23:59:59.999Z'), hit('B', '2024-02-29T23:59:59.5Z')] },
    { chunkIndex: 0, hits: [hit('A', '2024-02-29T23:59:59Z'), hit('C', '2024-02-29T23:59:59.499Z')] },
  ] };
  const before = structuredClone(input);
  const result = reconcileUtcChunkEventHits(input);
  assert.deepEqual(input, before);
  assert.deepEqual(result.hits.map(x => x.eventKey), ['A', 'C', 'B', 'Z']);
  assert.deepEqual(result.hits.map(x => x.ownerChunkIndex), [0, 0, 1, 1]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.window) && Object.isFrozen(result.hits));
  assert.ok(result.hits.every(Object.isFrozen));
  assert.throws(() => result.hits.push(result.hits[0]), TypeError);
});

test('terminal window edge and out-of-chunk candidates fail closed', () => {
  for (const [a,b] of [
    [[], [hit('A', '2024-03-01T00:00:00Z')]],
    [[hit('A', '2024-02-29T23:59:59.501Z')], []],
    [[], [hit('A', '2024-02-29T23:59:59.499Z')]],
    [[hit('A', '2024-02-29T23:59:58.999Z')], []],
  ]) assert.throws(() => reconcileUtcChunkEventHits(options(a,b)), hasCode('EVENT_OUTSIDE_CHUNK'));
  const included = reconcileUtcChunkEventHits(options([hit('START', windowInput.startUtc)], []));
  assert.equal(included.hits[0].ownerChunkIndex, 0);
});

test('every chunk result is required exactly once', () => {
  assert.throws(() => reconcileUtcChunkEventHits({windowInput, maxInputHits:10, chunkResults: []}), hasCode('INVALID_CHUNK_RESULTS'));
  assert.throws(() => reconcileUtcChunkEventHits({windowInput, maxInputHits:10, chunkResults: null}), hasCode('INVALID_CHUNK_RESULTS'));
  assert.throws(() => reconcileUtcChunkEventHits({windowInput, maxInputHits:10, chunkResults: [
    { chunkIndex: 0, hits: [] }, { chunkIndex: 0, hits: [] },
  ]}), hasCode('INVALID_CHUNK_RESULTS'));
  assert.throws(() => reconcileUtcChunkEventHits({windowInput, maxInputHits:10, chunkResults: [
    { chunkIndex: 0, hits: [] }, { chunkIndex: 2, hits: [] },
  ]}), hasCode('INVALID_CHUNK_RESULTS'));
  assert.throws(() => reconcileUtcChunkEventHits({windowInput, maxInputHits:10, chunkResults: [
    { chunkIndex: 0, hits: [] }, { chunkIndex: 1, hits: null },
  ]}), hasCode('INVALID_CHUNK_RESULTS'));
});

test('invalid events, dates and counts are rejected rather than ignored', () => {
  for (const bad of [null, {}, {eventKey:'',instantUtc:windowInput.startUtc},
    hit('A', '2023-02-29T23:59:59Z'), hit('A', '2024-02-29T23:59:60Z'),
    {eventKey:'A',instantUtc:windowInput.startUtc, payload: 42},
    hit(' A', windowInput.startUtc)]) {
    const code = bad?.eventKey === 'A' && !Object.hasOwn(bad,'payload') ? 'INVALID_EVENT_TIME' : 'INVALID_EVENT_HIT';
    assert.throws(() => reconcileUtcChunkEventHits(options([bad], [])), hasCode(code));
  }
  assert.throws(() => reconcileUtcChunkEventHits(options([hit('A',windowInput.startUtc)],[],0)), hasCode('INVALID_EVENT_LIMIT'));
  assert.throws(() => reconcileUtcChunkEventHits(options([hit('A',windowInput.startUtc)],[],16385)), hasCode('INVALID_EVENT_LIMIT'));
  assert.throws(() => reconcileUtcChunkEventHits(options([hit('A',windowInput.startUtc),hit('B',windowInput.startUtc)],[],1)), hasCode('TOO_MANY_EVENT_HITS'));
});

test('no events is valid and never implies an astronomical search', () => {
  const result = reconcileUtcChunkEventHits(options([],[]));
  assert.deepEqual(result.hits, []);
  assert.equal(result.rawHitCount, 0);
  assert.equal(result.duplicateCount, 0);
});
