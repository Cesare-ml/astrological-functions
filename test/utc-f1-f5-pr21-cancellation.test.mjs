import test from 'node:test';
import assert from 'node:assert/strict';
import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import { prepareTransitAspectEventCandidates } from '../src/transit-event-pipeline.mjs';
import { makeTransitChunkPipelineRunner } from '../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from '../src/transit-chunk-candidate-reports.mjs';

/** Conditional PR21 candidates only; no astronomical positions are evaluated. */
const instant = datetimeUtc => ({
  datetimeUtc, calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC',
});
const windowInput = {
  ...toF5MillisecondWindowInput({
    interval: {
      start: instant('2026-11-14T00:00:00.000000000Z'),
      end: instant('2026-11-14T00:00:02.000000000Z'),
    },
    maxDurationMs: 2000,
  }),
  chunkDurationMs: 1000, maxChunks: 2,
};
const identity = {
  skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square',
  exactAngleDeg:90, orientation:'POSITIVE',
  ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'test',timeModel:'UTC-test'},
};
const capabilities = {
  contractVersion:'0.1.0-experimental',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage:'INCLUDED', numericErrorCoverage:'INCLUDED',
  center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT',
};
function runWith(provider, overrides={}) {
  const runChunk = makeTransitChunkPipelineRunner({
    windowInput, identity,
    scan:{targetIntervalMs:1,maxDepth:4,maxProviderCalls:12},
    refinement:{timeToleranceMs:1,residualToleranceDeg:0.0001,
      maxIterations:10,maxCandidateRefinements:4,maxRefinementCalls:12},
    maxTotalProviderCalls:40,provider,
    prepareCandidates:prepareTransitAspectEventCandidates,
    ...overrides,
  });
  return {
    runChunk,
    collect:()=>collectTransitChunkCandidateReports({
      windowInput,identity,maxCandidateRecords:12,runChunk,
    }),
  };
}
function hungProvider(onCall) {
  const hang = (_request, signal) => {
    onCall(signal);
    return new Promise(()=>{});
  };
  return {capabilities:{...capabilities},
    getUnwrappedAspectResidual:hang,
    getUnwrappedResidualEnclosure:hang,
  };
}
function firstRequest() {
  return {...identity,chunkIndex:0,
    startUtc:'2026-11-14T00:00:00.000Z',
    endUtc:'2026-11-14T00:00:01.000Z',
  };
}
const code = expected => err => err?.name === 'AstrologyError' && err.code === expected;

test('real PR21: pre-aborted caller never invokes point or enclosure provider', async()=>{
  let calls=0;
  const controller=new AbortController();
  controller.abort('cancel before start');
  const runner=runWith(hungProvider(()=>{calls++;}),{signal:controller.signal});
  await assert.rejects(runner.collect,code('SEARCH_CANCELLED'));
  assert.equal(calls,0);
  await assert.rejects(()=>runner.runChunk(firstRequest()),code('PIPELINE_SEQUENCE_ERROR'));
});

test('real PR21: external cancellation interrupts a hung provider and seals the runner',async()=>{
  let started;
  const began=new Promise(resolve=>{started=resolve;});
  let calls=0, providerSignal;
  const controller=new AbortController();
  const runner=runWith(hungProvider(signal=>{
    calls++;providerSignal=signal;started();
  }),{signal:controller.signal});
  const pending=runner.collect();
  await began;
  assert.ok(providerSignal instanceof AbortSignal);
  assert.equal(providerSignal.aborted,false);
  controller.abort('user');
  await assert.rejects(()=>pending,code('SEARCH_CANCELLED'));
  assert.equal(providerSignal.aborted,true);
  assert.equal(calls,1);
  await assert.rejects(()=>runner.runChunk(firstRequest()),code('PIPELINE_SEQUENCE_ERROR'));
});

test('real PR21: timeout interrupts a hung provider without certifying any event',async()=>{
  let calls=0, providerSignal;
  const runner=runWith(hungProvider(signal=>{
    calls++;providerSignal=signal;
  }),{chunkTimeoutMs:20});
  await assert.rejects(runner.collect,code('CHUNK_TIMEOUT'));
  assert.equal(calls,1);
  assert.equal(providerSignal?.aborted,true);
  await assert.rejects(()=>runner.runChunk(firstRequest()),code('PIPELINE_SEQUENCE_ERROR'));
});
