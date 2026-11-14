import { makeTransitChunkPipelineRunner } from '../../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from '../../src/transit-chunk-candidate-reports.mjs';
import { prepareTransitAspectEventCandidates } from '../../src/transit-event-pipeline.mjs';
import type { TransitIntervalProvider } from '../../src/transit-interval-scan.mjs';

// Compile-time contract check across the typed PR #21 and PR #72 entrypoints.
const provider = undefined as unknown as TransitIntervalProvider;
const windowInput = {
  startUtc: '2026-11-14T00:00:00Z', endUtc: '2026-11-14T01:00:00Z',
  maxDurationMs: 3600000, chunkDurationMs: 1800000, maxChunks:2,
};
const identity = {skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',
  exactAngleDeg:90,orientation:'POSITIVE' as const,
  ephemerisProvenance:{engineVersion:'test',kernelSetId:'test',timeModel:'test-TDB'}};
const runChunk = makeTransitChunkPipelineRunner({windowInput,identity,
  scan:{targetIntervalMs:60_000,maxDepth:10,maxProviderCalls:400},
  refinement:{timeToleranceMs:100,residualToleranceDeg:.0001,
    maxIterations:40,maxCandidateRefinements:64,maxRefinementCalls:1000},
  provider,maxTotalProviderCalls:2800,
  prepareCandidates:prepareTransitAspectEventCandidates,
});
void collectTransitChunkCandidateReports({windowInput,identity,maxCandidateRecords:128,runChunk});
