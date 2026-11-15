import {
  scanUtcChunkCandidatesWithProvider,
  type UtcCandidateChunkRequest,
  type UtcChunkScanInput,
  type UtcChunkScanResult,
} from '../../src/utc-chunk-provider-runner.mjs';
const input: UtcChunkScanInput = {
  windowInput: {
    startUtc: '2026-11-14T00:00:00Z',
    endUtc: '2026-11-14T01:00:00Z',
    maxDurationMs: 3_600_000,
    chunkDurationMs: 1_800_000,
    maxChunks: 2,
  },
  maxInputHits: 20,
  provider: {async scanChunk(request: UtcCandidateChunkRequest) {
    return [{eventKey:'SUN_INGRESS',instantUtc:request.startUtc}];
  }},
};
async function consume() {
  const result: UtcChunkScanResult = await scanUtcChunkCandidatesWithProvider(input);
  const count: number = result.providerCallCount;
  void count;
  // @ts-expect-error immutable scan result
  result.hits.push(result.hits[0]);
  // @ts-expect-error immutable provider call count
  result.providerCallCount = 0;
}
void consume;
// @ts-expect-error caller must supply explicit maxInputHits
scanUtcChunkCandidatesWithProvider({windowInput:input.windowInput,provider:input.provider});
// @ts-expect-error chunk time is always UTC string rather than Date object
scanUtcChunkCandidatesWithProvider({...input,provider:{async scanChunk(){return [{eventKey:'X',instantUtc:new Date()}];}}});
