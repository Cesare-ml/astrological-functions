import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import { scanUtcChunkCandidatesWithProvider } from '../src/utc-chunk-provider-runner.mjs';
import type { UtcChunkScanInput, UtcChunkScanResult } from '../src/utc-chunk-provider-runner.mjs';

const start = { datetimeUtc: '2026-11-14T00:00:00.000000000Z',
  calendar: 'PROLEPTIC_GREGORIAN' as const, timeScale: 'UTC' as const };
const end = { ...start, datetimeUtc: '2026-11-14T00:00:01.000000000Z' };
const window = toF5MillisecondWindowInput({ interval: {start, end}, maxDurationMs: 1000 });
const request: UtcChunkScanInput = {
  windowInput: {...window, chunkDurationMs: 500, maxChunks: 2}, maxInputHits: 10,
  provider:{async scanChunk(chunk){ return [{eventKey:'SYNTHETIC', instantUtc:chunk.startUtc}]; }},
};
async function consumer(): Promise<number> {
  const result: UtcChunkScanResult = await scanUtcChunkCandidatesWithProvider(request);
  return result.providerCallCount;
}
void consumer;

// @ts-expect-error cannot mutate readonly validated UTC input
window.startUtc = '2026-11-14T12:00:00Z';
// @ts-expect-error no implicit maxDurationMs
const missingLimit: UtcChunkScanInput = {windowInput: {startUtc: window.startUtc, endUtc: window.endUtc, chunkDurationMs:500, maxChunks:2}, maxInputHits:1, provider:request.provider};
void missingLimit;
