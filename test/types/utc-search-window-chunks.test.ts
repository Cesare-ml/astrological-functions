import {
  splitUtcSearchWindow,
  type UtcSearchChunkInput,
  type UtcSearchChunks,
} from '../../src/utc-search-window-chunks.mjs';

const input: UtcSearchChunkInput = {
  startUtc: '2026-11-14T00:00:00Z',
  endUtc: '2026-11-15T00:00:00Z',
  maxDurationMs: 86_400_000,
  chunkDurationMs: 3_600_000,
  maxChunks: 24,
};
const result: UtcSearchChunks = splitUtcSearchWindow(input);
const lengthMs: number = result.chunks[0].durationMs;
void lengthMs;

// @ts-expect-error caller must supply an explicit chunk limit.
splitUtcSearchWindow({ ...input, maxChunks: undefined });
// @ts-expect-error the input must use UTC strings, not Date objects.
splitUtcSearchWindow({ ...input, startUtc: new Date() });
// @ts-expect-error the result's chunk array is readonly.
result.chunks.push(result.chunks[0]);
// @ts-expect-error each result chunk is readonly.
result.chunks[0].endEpochMs = 0;
