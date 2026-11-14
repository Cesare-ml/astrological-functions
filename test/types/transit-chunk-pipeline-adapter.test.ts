import {
  makeTransitChunkPipelineRunner,
  type F5PipelineChunkInput,
  type F5ScanLimits,
  type F5RefinementLimits,
} from '../../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports,
  type TransitCandidatePipelineReport } from '../../src/transit-chunk-candidate-reports.mjs';

const windowInput = {
  startUtc: '2026-11-14T00:00:00Z', endUtc: '2026-11-14T01:00:00Z',
  maxDurationMs: 3_600_000, chunkDurationMs: 1_800_000, maxChunks: 2,
};
const identity = {
  skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square', exactAngleDeg:90,
  orientation:'POSITIVE' as const,
  ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'test',timeModel:'mock'},
};
const scan: F5ScanLimits = {targetIntervalMs:60_000, maxDepth:10,maxProviderCalls:400};
const refinement: F5RefinementLimits = {
  timeToleranceMs:100,residualToleranceDeg:0.0001,
  maxIterations:40,maxCandidateRefinements:64,maxRefinementCalls:1000,
};
const provider = {
  capabilities: {coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED'},
  async getUnwrappedAspectResidual() {return 0;},
  async getUnwrappedResidualEnclosure() {return [-1,1];},
};
const runChunk = makeTransitChunkPipelineRunner({
  windowInput,identity,scan,refinement,provider,maxTotalProviderCalls:2800,
  async prepareCandidates(request: F5PipelineChunkInput<typeof provider>): Promise<TransitCandidatePipelineReport> {
    const typedProvider: typeof provider = request.provider;
    void typedProvider;
    return {contract:'TransitAspectEventCandidates',contractVersion:'0.1.0-experimental',
      direction:'SKY_TO_NATAL',startUtc:request.startUtc,endUtc:request.endUtc,
      ...identity,refinedCandidates:[],sampledZeros:[],unresolvedIntervals:[],
      hasUnresolvedIntervals:false,excludedIntervals:0,inspectedIntervals:0,
      scanProviderCalls:0,refinementProviderCalls:0,
      completeness:'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE',
      verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',scientificallyValidated:false};
  },
});
async function check() {
  const result = await collectTransitChunkCandidateReports({
    windowInput,identity,maxCandidateRecords:128,runChunk,
  });
  const count: number = result.chunkCount;
  void count;
  // @ts-expect-error summaries remain readonly
  result.totals.unresolvedIntervalCount = 0;
}
void check;
// @ts-expect-error mandatory explicit maxDepth
const incompleteScan: F5ScanLimits = {targetIntervalMs:60_000,maxProviderCalls:400};
void incompleteScan;
// @ts-expect-error mandatory refinement budget
const incompleteRefinement: F5RefinementLimits = {timeToleranceMs:100,maxIterations:40};
void incompleteRefinement;

// @ts-expect-error caller must pin identity explicitly at construction
makeTransitChunkPipelineRunner({windowInput,scan,refinement,provider,maxTotalProviderCalls:2800,
  prepareCandidates:async()=>({} as TransitCandidatePipelineReport)});
