/**
 * Split a validated civil-UTC search window into finite, contiguous intervals.
 * No astronomy, root-finding, inferred endpoint hits, or implicit limits.
 */
import { AstrologyError } from './index.mjs';
import { validateUtcSearchWindow } from './utc-search-window.mjs';

const HARD_MAX_CHUNKS = 4096;

/**
 * Chunk intervals are half-open [startEpochMs, endEpochMs).
 * No interval includes the original end instant; any root/event solver must
 * define endpoint inclusion, exact-hit deduplication, and convergence itself.
 */
export function splitUtcSearchWindow(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Search-window chunk options must be an object');
  const { startUtc, endUtc, maxDurationMs, chunkDurationMs, maxChunks } = input;
  // Recheck caller input rather than accepting a possibly forged window snapshot.
  const window = validateUtcSearchWindow({ startUtc, endUtc, maxDurationMs });
  if (!Number.isSafeInteger(chunkDurationMs) || chunkDurationMs <= 0)
    throw new AstrologyError('INVALID_CHUNK_DURATION', 'chunkDurationMs must be an explicit positive safe integer');
  if (!Number.isSafeInteger(maxChunks) || maxChunks < 1 || maxChunks > HARD_MAX_CHUNKS)
    throw new AstrologyError('INVALID_CHUNK_LIMIT', 'maxChunks must be a positive safe integer <= 4096');
  const count = Math.ceil(window.durationMs / chunkDurationMs);
  // Check BEFORE allocation so a 1-ms chunk over a century cannot exhaust memory.
  if (count > maxChunks)
    throw new AstrologyError('TOO_MANY_CHUNKS', 'Search window requires more than maxChunks');
  const chunks = [];
  for (let index = 0; index < count; index++) {
    const startEpochMs = window.startEpochMs + index * chunkDurationMs;
    const endEpochMs = Math.min(window.endEpochMs, startEpochMs + chunkDurationMs);
    chunks.push(Object.freeze({
      index,
      startUtc: new Date(startEpochMs).toISOString(),
      endUtc: new Date(endEpochMs).toISOString(),
      startEpochMs,
      endEpochMs,
      durationMs: endEpochMs - startEpochMs,
    }));
  }
  return Object.freeze({ window, chunkDurationMs, maxChunks, chunks: Object.freeze(chunks) });
}
