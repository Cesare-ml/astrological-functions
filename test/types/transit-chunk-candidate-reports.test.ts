import {
  collectTransitChunkCandidateReports,
  type TransitCandidatePipelineReport,
  type ChunkedTransitCandidateReportSummary,
} from '../../src/transit-chunk-candidate-reports.mjs';
const identity = {skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',
  exactAngleDeg:90,orientation:'POSITIVE' as const,
  ephemerisProvenance:{engineVersion:'test',kernelSetId:'mock',timeModel:'UTC'}};
const input = {
  windowInput:{startUtc:'2026-11-14T00:00:00Z',endUtc:'2026-11-14T01:00:00Z',
    maxDurationMs:3600000,chunkDurationMs:1800000,maxChunks:2},
  identity,maxCandidateRecords:12,
  async runChunk(request: {startUtc:string;endUtc:string}): Promise<TransitCandidatePipelineReport> {
    return {contract:'TransitAspectEventCandidates',contractVersion:'0.1.0-experimental',
      direction:'SKY_TO_NATAL', ...identity, startUtc:request.startUtc,endUtc:request.endUtc,
      refinedCandidates:[],sampledZeros:[],unresolvedIntervals:[],
      hasUnresolvedIntervals:false,scanProviderCalls:0,refinementProviderCalls:0,
      inspectedIntervals:0,excludedIntervals:0,
      verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
      completeness:'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE',
      scientificallyValidated:false};
  }
};
async function verify() {
  const result: ChunkedTransitCandidateReportSummary = await collectTransitChunkCandidateReports(input);
  const count:number = result.totals.sampledZeroCount;
  void count;
  // @ts-expect-error summary is immutable
  result.reports.push(result.reports[0]);
  // @ts-expect-error never scientific validated
  result.scientificallyValidated=true;
}
void verify;
// @ts-expect-error explicit maxCandidateRecords required
collectTransitChunkCandidateReports({...input,maxCandidateRecords:undefined});
