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
      windowInput,scan,provider,
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
