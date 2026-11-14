import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTransitChunkPipelineRunner } from '../src/transit-chunk-pipeline-adapter.mjs';

const windowInput = {
  startUtc: '2026-11-14T00:00:00Z', endUtc: '2026-11-14T00:00:02Z',
  maxDurationMs: 2000, chunkDurationMs: 1000, maxChunks: 2,
};
const identity = () => ({
  skyBodyName: 'Mars', natalBodyName: 'Sun', aspectId: 'square',
  exactAngleDeg: 90, orientation: 'POSITIVE',
  ephemerisProvenance: { engineVersion: 'rust-test', kernelSetId: 'jpl-test', timeModel: 'test-TDB' },
});
const capabilities = {
  contractVersion: '0.1.0-experimental',
  coverage: 'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage: 'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage: 'INCLUDED', numericErrorCoverage: 'INCLUDED',
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
};
const options = prepareCandidates => ({
  windowInput, identity: identity(), scan: { targetIntervalMs: 1000, maxDepth: 4, maxProviderCalls: 8 },
  refinement: { timeToleranceMs: 1, residualToleranceDeg: .0001,
    maxIterations: 8, maxCandidateRefinements: 2, maxRefinementCalls: 8 },
  maxTotalProviderCalls: 32,
  provider: { capabilities, async getUnwrappedAspectResidual() {}, async getUnwrappedResidualEnclosure() {} },
  prepareCandidates,
});
const chunk = (index, id = identity()) => ({
  ...id, chunkIndex: index,
  startUtc: index ? '2026-11-14T00:00:01.000Z' : '2026-11-14T00:00:00.000Z',
  endUtc: index ? '2026-11-14T00:00:02.000Z' : '2026-11-14T00:00:01.000Z',
});
const code = expected => error => error?.name === 'AstrologyError' && error.code === expected;

test('direct runner pins aspect and body identity across chunk boundaries', async () => {
  let calls = 0;
  const runner = makeTransitChunkPipelineRunner(options(async () => { calls++; return {}; }));
  await runner(chunk(0));
  for (const patch of [
    {skyBodyName:'Venus'}, {natalBodyName:'Moon'}, {aspectId:'opposition'},
    {exactAngleDeg: 180}, {orientation:'NEGATIVE'},
  ]) {
    await assert.rejects(() => runner(chunk(1, {...identity(), ...patch})), code('INCOMPATIBLE_CHUNK_REQUEST'));
    assert.equal(calls, 1);
  }
  await runner(chunk(1));
  assert.equal(calls, 2);
});

test('direct runner rejects silent engine/kernel/time-model changes', async () => {
  let calls = 0;
  const runner = makeTransitChunkPipelineRunner(options(async () => { calls++; return {}; }));
  await runner(chunk(0));
  for (const patch of [
    {engineVersion:'different-engine'}, {kernelSetId:'different-kernel'}, {timeModel:'TT'},
  ]) {
    const id = identity();
    await assert.rejects(() => runner(chunk(1, {
      ...id, ephemerisProvenance: {...id.ephemerisProvenance, ...patch},
    })), code('INCOMPATIBLE_CHUNK_REQUEST'));
    assert.equal(calls, 1);
  }
  await runner(chunk(1));
  assert.equal(calls, 2);
});

test('constructor identity is a detached immutable snapshot, not a live caller object', async () => {
  const seen = [];
  const runner = makeTransitChunkPipelineRunner(options(async r => {
    seen.push(r.ephemerisProvenance);
    assert.ok(Object.isFrozen(r.ephemerisProvenance));
    return {};
  }));
  const original = chunk(0);
  await runner(original);
  original.skyBodyName = 'Venus';
  original.ephemerisProvenance.kernelSetId = 'poisoned';
  await runner(chunk(1));
  assert.deepEqual(seen.map(x => x.kernelSetId), ['jpl-test', 'jpl-test']);
});

test('invalid identity never reaches the injected pipeline', async () => {
  let calls = 0;
  const runner = makeTransitChunkPipelineRunner(options(async () => { calls++; return {}; }));
  for (const bad of [
    {aspectId:'  '}, {orientation:'OTHER'}, {exactAngleDeg:NaN}, {skyBodyName:' Mars'},
    {ephemerisProvenance:{...identity().ephemerisProvenance, engineVersion:''}},
  ]) await assert.rejects(() => runner(chunk(0,{...identity(), ...bad})), code('INCOMPATIBLE_CHUNK_REQUEST'));
  assert.equal(calls, 0);
  await runner(chunk(0));
  assert.equal(calls, 1);
});

test('accessor-based identity cannot execute user getters', async () => {
  let getterCalls = 0;
  let pipelineCalls = 0;
  const runner = makeTransitChunkPipelineRunner(options(async () => { pipelineCalls++; return {}; }));
  const forged = chunk(0);
  Object.defineProperty(forged, 'aspectId', {enumerable: true, get() { getterCalls++; return 'square'; }});
  await assert.rejects(() => runner(forged), code('INCOMPATIBLE_CHUNK_REQUEST'));
  const nested = chunk(0);
  Object.defineProperty(nested.ephemerisProvenance, 'kernelSetId', {enumerable: true, get() {
    getterCalls++; return 'jpl-test';
  }});
  await assert.rejects(() => runner(nested), code('INCOMPATIBLE_CHUNK_REQUEST'));
  assert.equal(getterCalls, 0);
  assert.equal(pipelineCalls, 0);
});


test('constructor requires a validated explicit identity before any provider call', () => {
  let calls = 0;
  const prep = async () => { calls++; return {}; };
  assert.throws(() => makeTransitChunkPipelineRunner({...options(prep), identity: undefined}), code('INVALID_ARGUMENT'));
  assert.throws(() => makeTransitChunkPipelineRunner({...options(prep), identity: {...identity(), aspectId:' '}}), code('INVALID_TRANSIT_IDENTITY'));
  const forged = identity();
  let getters = 0;
  Object.defineProperty(forged, 'skyBodyName', {get(){getters++;return 'Mars';}});
  assert.throws(() => makeTransitChunkPipelineRunner({...options(prep), identity:forged}), code('INVALID_TRANSIT_IDENTITY'));
  assert.equal(getters, 0);
  assert.equal(calls, 0);
});
