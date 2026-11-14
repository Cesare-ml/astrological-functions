import test from 'node:test';
import assert from 'node:assert/strict';
import { scanUtcChunkCandidatesWithProvider } from '../src/utc-chunk-provider-runner.mjs';

const windowInput = () => ({
  startUtc: '2024-02-29T23:59:59Z',
  endUtc: '2024-03-01T00:00:00Z',
  maxDurationMs: 1000,
  chunkDurationMs: 500,
  maxChunks: 2,
});
const candidate = (eventKey, instantUtc) => ({eventKey, instantUtc});
const options = (provider, overrides = {}) => ({windowInput:windowInput(), maxInputHits: 8, provider, ...overrides});
const hasCode = code => error => error?.name === 'AstrologyError' && error.code === code;

test('sequential scans reconcile a duplicate boundary hit once', async () => {
  const calls = [];
  const provider = {async scanChunk(request) {
    assert.ok(Object.isFrozen(request));
    calls.push(request.chunkIndex);
    return [candidate('SUN_INGRESS','2024-02-29T23:59:59.500Z')];
  }};
  const result = await scanUtcChunkCandidatesWithProvider(options(provider));
  assert.deepEqual(calls,[0,1]);
  assert.equal(result.providerCallCount,2);
  assert.equal(result.rawHitCount,2);
  assert.equal(result.duplicateCount,1);
  assert.deepEqual(result.hits.map(x => [x.eventKey,x.ownerChunkIndex]),[['SUN_INGRESS',1]]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.hits));
});

test('different event keys at one instant survive, including __proto__', async () => {
  const provider = {async scanChunk({chunkIndex}) {
    return chunkIndex === 0 ? [candidate('__proto__','2024-02-29T23:59:59.500Z')]
      : [candidate('STATION','2024-02-29T23:59:59.500Z')];
  }};
  const result = await scanUtcChunkCandidatesWithProvider(options(provider));
  assert.deepEqual(result.hits.map(x => x.eventKey),['STATION','__proto__']);
  assert.equal(result.duplicateCount,0);
});

test('the snapshot is unaffected by provider mutation of caller options and past results', async () => {
  const input = options({async scanChunk(request) {
    if (request.chunkIndex === 0) {
      input.windowInput.endUtc = '2024-03-10T00:00:00Z';
      input.windowInput.chunkDurationMs = 1;
      const stale = candidate('ONE','2024-02-29T23:59:59.001Z');
      input.stale = stale;
      return [stale];
    }
    input.stale.eventKey = 'MUTATED';
    input.stale.instantUtc = '2024-02-29T23:59:59.777Z';
    return [candidate('TWO','2024-02-29T23:59:59.900Z')];
  }});
  const result = await scanUtcChunkCandidatesWithProvider(input);
  assert.equal(result.window.endUtc,'2024-03-01T00:00:00Z');
  assert.deepEqual(result.hits.map(x => x.eventKey),['ONE','TWO']);
  assert.deepEqual(result.hits.map(x => x.ownerChunkIndex),[0,1]);
});

test('bad bounds and missing provider reject before any request', async () => {
  let called = 0;
  const provider = {async scanChunk(){called++;return [];}};
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider,{maxInputHits:0})),hasCode('INVALID_EVENT_LIMIT'));
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider,{windowInput:{...windowInput(), maxChunks: 1}})),hasCode('TOO_MANY_CHUNKS'));
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(null)),hasCode('MISSING_EVENT_PROVIDER'));
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider,{windowInput:null})),hasCode('INVALID_ARGUMENT'));
  assert.equal(called,0);
});

test('invalid provider response fails closed and skips later scans', async () => {
  let called = 0;
  const provider = {async scanChunk() {called++;return null;}};
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider)),hasCode('INVALID_CHUNK_RESULTS'));
  assert.equal(called,1);
});

test('over-budget provider output aborts before scanning later chunks', async () => {
  let called = 0;
  const provider={async scanChunk(){called++;return [candidate('A','2024-02-29T23:59:59Z'),candidate('B','2024-02-29T23:59:59Z')];}};
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider,{maxInputHits:1})),hasCode('TOO_MANY_EVENT_HITS'));
  assert.equal(called,1);
});

test('malformed UTC and out-of-chunk candidates reject immediately', async () => {
  for(const [bad,code] of [
    [candidate('BAD','2023-02-29T00:00:00Z'),'INVALID_EVENT_TIME'],
    [candidate('BAD','2024-03-01T00:00:00Z'),'EVENT_OUTSIDE_CHUNK'],
    [candidate('BAD','2024-02-29T23:59:59.501Z'),'EVENT_OUTSIDE_CHUNK'],
    [{eventKey:'X',instantUtc:'2024-02-29T23:59:59.100Z',secret:'NO'},'INVALID_EVENT_HIT'],
  ]){
    let count=0;
    const provider={async scanChunk(){count++;return [bad];}};
    await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider)),hasCode(code));
    assert.equal(count,1);
  }
});

test('provider exceptions propagate, never become an empty event list', async () => {
  const reason = new Error('synthetic provider failure');
  let count=0;
  const provider={async scanChunk(){count++;throw reason;}};
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider)),error=>error===reason);
  assert.equal(count,1);
});

test('empty candidates are permitted but never interpreted as scientific proof', async () => {
  const result=await scanUtcChunkCandidatesWithProvider(options({async scanChunk(){return [];}}));
  assert.deepEqual(result.hits,[]);
  assert.equal(result.providerCallCount,2);
  assert.equal(result.rawHitCount,0);
});

test('accessor-based candidates are rejected before reading untrusted getters', async () => {
  let getterCalls=0;
  let providerCalls=0;
  const crafted={instantUtc:'2024-02-29T23:59:59Z'};
  Object.defineProperty(crafted,'eventKey',{enumerable:true,get(){getterCalls++;return 'FORGED';}});
  const provider={async scanChunk(){providerCalls++;return [crafted];}};
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider)),hasCode('INVALID_EVENT_HIT'));
  assert.equal(getterCalls,0);
  assert.equal(providerCalls,1);
});

test('aggregate event budget is enforced across chunks', async () => {
  let calls=0;
  const provider={async scanChunk({chunkIndex}) {
    calls++;
    const at=chunkIndex===0?'2024-02-29T23:59:59.100Z':'2024-02-29T23:59:59.600Z';
    return [candidate('A',at),candidate('B',at)];
  }};
  await assert.rejects(() => scanUtcChunkCandidatesWithProvider(options(provider,{maxInputHits:3})),hasCode('TOO_MANY_EVENT_HITS'));
  assert.equal(calls,2);
});
