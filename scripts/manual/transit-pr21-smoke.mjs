/**
 * Run ONLY after stacking PR #13 -> #14 -> #17 -> #21 with PR #72.
 * `node scripts/manual/transit-pr21-smoke.mjs`
 * Fails intentionally on PR #72 alone: the actual F5 pipeline is not present.
 * All residuals and enclosures here are synthetic, NOT astronomy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTransitAspectEventCandidates } from '../../src/transit-event-pipeline.mjs';
import { makeTransitChunkPipelineRunner } from '../../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from '../../src/transit-chunk-candidate-reports.mjs';

const epoch = Date.parse('2026-11-14T00:00:00Z');
const metadata = Object.freeze({
  contractVersion:'0.1.0-experimental',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage:'INCLUDED',numericErrorCoverage:'INCLUDED',
  center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
  engineVersion:'SYNTHETIC',kernelSetId:'TEST-KERNEL',timeModel:'TEST-TDB',
});
const identity = {
  skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',exactAngleDeg:90,
  orientation:'POSITIVE',
  ephemerisProvenance:{engineVersion:'SYNTHETIC',kernelSetId:'TEST-KERNEL',timeModel:'TEST-TDB'},
};
const windowInput = {
  startUtc:'2026-11-14T00:00:00Z',endUtc:'2026-11-14T01:00:00Z',
  maxDurationMs:3600000,chunkDurationMs:1800000,maxChunks:2,
};
function providerWith(fn, bounds) {
  return {capabilities:{...metadata},
    async getUnwrappedAspectResidual(request) {
      return {datetimeUtc:request.datetimeUtc,
        residualDeg:fn(Date.parse(request.datetimeUtc)),metadata:{...metadata}};
    },
    async getUnwrappedResidualEnclosure(request) {
      const [lowerDeg,upperDeg]=bounds(Date.parse(request.startUtc),Date.parse(request.endUtc));
      return {startUtc:request.startUtc,endUtc:request.endUtc,
        lowerDeg,upperDeg,metadata:{...metadata}};
    },
  };
}
async function run(provider, scan={targetIntervalMs:60000,maxDepth:10,maxProviderCalls:400}) {
  return collectTransitChunkCandidateReports({
    windowInput,identity,maxCandidateRecords:128,
    runChunk:makeTransitChunkPipelineRunner({
      windowInput,identity,scan,provider,
      refinement:{timeToleranceMs:150,residualToleranceDeg:0.0001,
        maxIterations:40,maxCandidateRefinements:64,maxRefinementCalls:1000},
      maxTotalProviderCalls:2800,
      prepareCandidates:prepareTransitAspectEventCandidates,
    }),
  });
}
test('actual F5 stack: one synthetic conditional sign-change candidate, no certified hit',async()=>{
  const line=ms=>(ms-epoch)/3600000-.37;
  const report=await run(providerWith(line,(a,b)=>[line(a),line(b)]));
  assert.equal(report.chunkCount,2);
  assert.equal(report.totals.refinedCandidateCount,1);
  assert.equal(report.scientificallyValidated,false);
  assert.equal(report.completeness,'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE');
  assert.equal(Object.hasOwn(report,'hits'),false);
  assert.ok(report.totals.scanProviderCalls>0);
});
test('actual F5 stack: a synthetic tangency remains unresolved, not absent',async()=>{
  const fn=ms=>((ms-epoch)/3600000-.371)**2;
  const report=await run(providerWith(fn,()=>[0,2]),
    {targetIntervalMs:60000,maxDepth:4,maxProviderCalls:400});
  assert.equal(report.totals.refinedCandidateCount,0);
  assert.ok(report.totals.unresolvedIntervalCount>0);
  assert.ok(report.reports.some(part=>part.hasUnresolvedIntervals));
  assert.equal(report.scientificallyValidated,false);
});

test('actual F5 stack: repeated synthetic crossings across a chunk seam remain provisional',async()=>{
  const f=ms=>{const t=(ms-epoch)/3600000; return (t-1/6)*(t-.5)*(t-5/6)*100;};
  const report=await run(providerWith(f,()=>[-100,100]));
  assert.equal(report.chunkCount,2);
  assert.ok(report.totals.sampledZeroCount>=2);
  assert.ok(report.totals.unresolvedIntervalCount>0);
  assert.equal(report.scientificallyValidated,false);
  assert.equal(Object.hasOwn(report,'hits'),false);
});

test('actual F5 stack: provider frame mismatch fails instead of returning a false no-event result',async()=>{
  const point=ms=>(ms-epoch)/3600000-.37;
  const provider=providerWith(point,(a,b)=>[point(a),point(b)]);
  const original=provider.getUnwrappedAspectResidual.bind(provider);
  provider.getUnwrappedAspectResidual=async request=>{
    const result=await original(request);
    return {...result,metadata:{...result.metadata,frame:'J2000'}};
  };
  await assert.rejects(()=>run(provider),error=>error?.code==='INCOMPATIBLE_EPHEMERIS');
});

test('actual F5 stack: scanner call budget exhaustion propagates without a partial report',async()=>{
  const point=ms=>(ms-epoch)/3600000-.37;
  await assert.rejects(()=>run(providerWith(point,(a,b)=>[point(a),point(b)]),
    {targetIntervalMs:60000,maxDepth:10,maxProviderCalls:1}),
    error=>error?.code==='SEARCH_BUDGET_EXHAUSTED');
});


test('actual F5 stack: a tight live cap permits only two excluding-enclosure provider calls',async()=>{
  let providerCalls=0;
  const constant=()=>1;
  const provider=providerWith(constant,()=>{providerCalls++;return [.9,1.1];});
  const runner=makeTransitChunkPipelineRunner({
    windowInput,identity,
    scan:{targetIntervalMs:60000,maxDepth:10,maxProviderCalls:400},
    refinement:{timeToleranceMs:150,residualToleranceDeg:.0001,maxIterations:40,
      maxCandidateRefinements:64,maxRefinementCalls:1000},
    maxTotalProviderCalls:2, // Much less than worst-case theoretical 2800.
    provider,prepareCandidates:prepareTransitAspectEventCandidates,
  });
  const report=await collectTransitChunkCandidateReports({
    windowInput,identity,maxCandidateRecords:128,runChunk:runner,
  });
  assert.equal(providerCalls,2);
  assert.equal(report.totals.refinedCandidateCount,0);
  assert.equal(report.scientificallyValidated,false);
});

test('actual F5 stack: live cap interrupts an ongoing scan after one provider call',async()=>{
  let providerCalls=0;
  const line=ms=>(ms-epoch)/3600000-.37;
  const p=providerWith(line,(a,b)=>[line(a),line(b)]);
  const prior=p.getUnwrappedResidualEnclosure.bind(p);
  p.getUnwrappedResidualEnclosure=async request=>{providerCalls++;return prior(request);};
  const runner=makeTransitChunkPipelineRunner({
    windowInput,identity,
    scan:{targetIntervalMs:60000,maxDepth:10,maxProviderCalls:400},
    refinement:{timeToleranceMs:150,residualToleranceDeg:.0001,maxIterations:40,
      maxCandidateRefinements:64,maxRefinementCalls:1000},
    maxTotalProviderCalls:1,provider:p,prepareCandidates:prepareTransitAspectEventCandidates,
  });
  await assert.rejects(()=>collectTransitChunkCandidateReports({
    windowInput,identity,maxCandidateRecords:128,runChunk:runner,
  }),e=>e?.code==='GLOBAL_PIPELINE_BUDGET');
  assert.equal(providerCalls,1);
});
