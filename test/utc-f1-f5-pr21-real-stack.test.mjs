import test from 'node:test';
import assert from 'node:assert/strict';
import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import { prepareTransitAspectEventCandidates } from '../src/transit-event-pipeline.mjs';
import { makeTransitChunkPipelineRunner } from '../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from '../src/transit-chunk-candidate-reports.mjs';

const epoch = Date.parse('2026-11-14T00:00:00Z');
const utc = datetimeUtc => ({datetimeUtc, calendar:'PROLEPTIC_GREGORIAN', timeScale:'UTC'});
const metadata = Object.freeze({
  contractVersion:'0.1.0-experimental',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage:'INCLUDED', numericErrorCoverage:'INCLUDED',
  center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT',
  engineVersion:'SYNTHETIC', kernelSetId:'TEST-KERNEL', timeModel:'TEST-TDB',
});
const identity = Object.freeze({
  skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square', exactAngleDeg:90,
  orientation:'POSITIVE',
  ephemerisProvenance:Object.freeze({
    engineVersion:'SYNTHETIC', kernelSetId:'TEST-KERNEL', timeModel:'TEST-TDB',
  }),
});
const civil = (start, end, limit=3600000) =>
  toF5MillisecondWindowInput({
    interval:{start:utc(start), end:utc(end)}, maxDurationMs:limit,
  });
function providerWith(fn, bounds, count) {
  return {
    capabilities:{...metadata},
    async getUnwrappedAspectResidual(request) {
      count.calls++;
      return {
        datetimeUtc:request.datetimeUtc,
        residualDeg:fn(Date.parse(request.datetimeUtc)),
        metadata:{...metadata},
      };
    },
    async getUnwrappedResidualEnclosure(request) {
      count.calls++;
      const [lowerDeg,upperDeg]=bounds(Date.parse(request.startUtc),Date.parse(request.endUtc));
      return {
        startUtc:request.startUtc, endUtc:request.endUtc, lowerDeg, upperDeg,
        metadata:{...metadata},
      };
    },
  };
}
async function run(windowInput, provider, maxDepth=10) {
  const scan={targetIntervalMs:60000, maxDepth, maxProviderCalls:400};
  const refinement={
    timeToleranceMs:150, residualToleranceDeg:0.0001,
    maxIterations:40, maxCandidateRefinements:64, maxRefinementCalls:1000,
  };
  return collectTransitChunkCandidateReports({
    windowInput, identity, maxCandidateRecords:128,
    runChunk:makeTransitChunkPipelineRunner({
      windowInput,identity,scan,refinement,provider,maxTotalProviderCalls:2800,
      prepareCandidates:prepareTransitAspectEventCandidates,
    }),
  });
}
test('real PR21 pipeline accepts F1 nanosecond-aligned UTC and reports one conditional candidate',async()=>{
  const input=civil('2026-11-14T00:00:00.000000000Z','2026-11-14T01:00:00.000000000Z');
  const windowInput={...input,chunkDurationMs:1800000,maxChunks:2};
  const count={calls:0};
  const line=ms=>(ms-epoch)/3600000-.37;
  const report=await run(windowInput,providerWith(line,(a,b)=>[line(a),line(b)],count));
  assert.equal(report.chunkCount,2);
  assert.equal(report.totals.refinedCandidateCount,1);
  assert.equal(report.scientificallyValidated,false);
  assert.equal(report.verification,'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(report.completeness,'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE');
  assert.equal(Object.hasOwn(report,'hits'),false);
  assert.ok(count.calls>0);
  assert.ok(Object.isFrozen(report.reports));
});
test('F1 rejects a non-millisecond UTC instant instead of truncating an event window',()=>{
  assert.throws(()=>civil('2026-11-14T00:00:00.000000001Z',
    '2026-11-14T01:00:00Z'),error=>error.code==='UNSUPPORTED_UTC_PRECISION');
  assert.throws(()=>civil('2026-11-14T00:00:00Z',
    '2026-11-14T01:00:00.000000001Z'),error=>error.code==='UNSUPPORTED_UTC_PRECISION');
});
test('true F5 stack preserves synthetic tangency uncertainty after F1 conversion',async()=>{
  const input=civil('2026-11-14T00:00:00Z','2026-11-14T01:00:00Z');
  const windowInput={...input,chunkDurationMs:1800000,maxChunks:2};
  const fn=ms=>((ms-epoch)/3600000-.371)**2;
  const count={calls:0};
  const report=await run(windowInput,providerWith(fn,()=>[0,2],count),4);
  assert.equal(report.totals.refinedCandidateCount,0);
  assert.ok(report.totals.unresolvedIntervalCount>0);
  assert.equal(report.scientificallyValidated,false);
  assert.ok(count.calls>0);
});
test('F5 duration guard denies the true PR21 pipeline before an astronomical callback',async()=>{
  const input=civil('2026-11-14T00:00:00Z','2026-11-14T01:00:00Z',1000);
  const windowInput={...input,chunkDurationMs:1800000,maxChunks:2};
  const count={calls:0};
  const line=ms=>(ms-epoch)/3600000-.37;
  await assert.rejects(()=>run(windowInput,providerWith(line,(a,b)=>[line(a),line(b)],count)),
    error=>error.code==='INTERVAL_TOO_LONG');
  assert.equal(count.calls,0);
});
