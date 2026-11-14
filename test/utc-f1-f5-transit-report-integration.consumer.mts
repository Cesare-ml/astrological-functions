import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import { makeTransitChunkPipelineRunner } from '../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from '../src/transit-chunk-candidate-reports.mjs';
import type { TransitCandidatePipelineReport, ChunkedTransitCandidateReportSummary } from '../src/transit-chunk-candidate-reports.mjs';

const start = { datetimeUtc: '2026-11-14T00:00:00.000000000Z',
  calendar: 'PROLEPTIC_GREGORIAN' as const, timeScale: 'UTC' as const };
const end = { ...start, datetimeUtc: '2026-11-14T00:00:01.000000000Z' };
const times = toF5MillisecondWindowInput({interval:{start,end},maxDurationMs:1_000});
const windowInput = {...times,chunkDurationMs:500,maxChunks:2};
const identity = {skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',
  exactAngleDeg:90,orientation:'POSITIVE' as const,
  ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'test',timeModel:'UTC-test'}};
const provider = {
  capabilities: {contractVersion:'0.1.0-experimental',coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
    enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',stationCoverage:'INCLUDED',
    numericErrorCoverage:'INCLUDED',center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT'},
  async getUnwrappedAspectResidual() {return null;},
  async getUnwrappedResidualEnclosure() {return null;},
};
const runChunk = makeTransitChunkPipelineRunner({
  windowInput,provider,
  scan:{targetIntervalMs:1,maxDepth:8,maxProviderCalls:20},
  refinement:{timeToleranceMs:1,residualToleranceDeg:0.001,maxIterations:16,
    maxCandidateRefinements:8,maxRefinementCalls:12},
  maxTotalProviderCalls:64,
  async prepareCandidates(request): Promise<TransitCandidatePipelineReport> {
    return {contract:'TransitAspectEventCandidates',contractVersion:'0.1.0-experimental',
      direction:'SKY_TO_NATAL',startUtc:request.startUtc,endUtc:request.endUtc,
      ...identity,refinedCandidates:[],sampledZeros:[],unresolvedIntervals:[],
      hasUnresolvedIntervals:false,scanProviderCalls:0,refinementProviderCalls:0,
      inspectedIntervals:0,excludedIntervals:0,scientificallyValidated:false,
      verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
      completeness:'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE'};
  },
});
async function consumer(): Promise<number> {
  const result: ChunkedTransitCandidateReportSummary = await collectTransitChunkCandidateReports({
    windowInput,identity,maxCandidateRecords:4,runChunk,
  });
  // @ts-expect-error provisional report cannot be typed as scientifically validated
  const scientificallyValidated: true = result.scientificallyValidated;
  void scientificallyValidated;
  return result.chunkCount;
}
void consumer;

// @ts-expect-error valid F1 inputs cannot silently become TT timestamps.
toF5MillisecondWindowInput({interval:{start:{...start,timeScale:'TT'},end},maxDurationMs:1000});
// @ts-expect-error F5 runner requires explicit global provider-call budget.
makeTransitChunkPipelineRunner({windowInput,provider,scan:{targetIntervalMs:1,maxDepth:8,maxProviderCalls:20},refinement:{timeToleranceMs:1,residualToleranceDeg:0.001,maxIterations:16,maxCandidateRefinements:8,maxRefinementCalls:12},prepareCandidates:async()=>({} as TransitCandidatePipelineReport)});
