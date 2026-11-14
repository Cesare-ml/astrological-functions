/**
 * Deterministic reconciliation of caller-supplied temporal event candidates.
 * Does not calculate roots, sky positions, event kinds or astronomical time.
 */
import { AstrologyError } from './index.mjs';
import { parseStrictUtcInstant } from './utc-search-window.mjs';
import { splitUtcSearchWindow } from './utc-search-window-chunks.mjs';

const MAX_INPUT_HITS = 16384;

/**
 * Accepts chunk-local closed-endpoint candidates, and assigns each event to
 * exactly one half-open UTC chunk. Exact same eventKey + millisecond is merged;
 * different keys or different milliseconds always remain distinct.
 */
export function reconcileUtcChunkEventHits(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Event reconciliation options must be an object');
  const { windowInput, chunkResults, maxInputHits } = input;
  if (!Number.isSafeInteger(maxInputHits) || maxInputHits < 1 || maxInputHits > MAX_INPUT_HITS)
    throw new AstrologyError('INVALID_EVENT_LIMIT', 'maxInputHits must be an explicit integer between 1 and 16384');
  const plan = splitUtcSearchWindow(windowInput);
  if (!Array.isArray(chunkResults) || chunkResults.length !== plan.chunks.length)
    throw new AstrologyError('INVALID_CHUNK_RESULTS', 'Exactly one result per expected chunk is required');

  let rawHitCount = 0;
  const seenChunks = new Set();
  const unique = new Map();
  for (const result of chunkResults) {
    if (!result || typeof result !== 'object' || Array.isArray(result) ||
        !Number.isInteger(result.chunkIndex) || result.chunkIndex < 0 ||
        result.chunkIndex >= plan.chunks.length || seenChunks.has(result.chunkIndex) ||
        !Array.isArray(result.hits))
      throw new AstrologyError('INVALID_CHUNK_RESULTS', 'Chunks must be unique, indexed and contain hit arrays');
    seenChunks.add(result.chunkIndex);
    if (result.hits.length > maxInputHits - rawHitCount)
      throw new AstrologyError('TOO_MANY_EVENT_HITS', 'Candidate count exceeds maxInputHits');
    rawHitCount += result.hits.length;

    const chunk = plan.chunks[result.chunkIndex];
    for (const candidate of result.hits) {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
          Object.keys(candidate).length !== 2 || !Object.hasOwn(candidate, 'eventKey') ||
          !Object.hasOwn(candidate, 'instantUtc') ||
          typeof candidate.eventKey !== 'string' || !candidate.eventKey.trim() ||
          candidate.eventKey.length > 256 || candidate.eventKey !== candidate.eventKey.trim())
        throw new AstrologyError('INVALID_EVENT_HIT', 'Each hit requires only a nonempty eventKey and instantUtc');
      let epochMs;
      try {
        epochMs = parseStrictUtcInstant(candidate.instantUtc, 'instantUtc');
      } catch (error) {
        if (error instanceof AstrologyError && error.code === 'INVALID_UTC')
          throw new AstrologyError('INVALID_EVENT_TIME', 'Hit must have a real millisecond-precision UTC instant');
        throw error;
      }
      // A bracket solver may report its closed right endpoint; the next chunk
      // owns that instant. The overall end is excluded by the search contract.
      if (epochMs < chunk.startEpochMs || epochMs > chunk.endEpochMs ||
          epochMs >= plan.window.endEpochMs)
        throw new AstrologyError('EVENT_OUTSIDE_CHUNK', 'Hit falls outside its reported chunk or search window');
      const ownerChunkIndex = Math.floor((epochMs - plan.window.startEpochMs) / plan.chunkDurationMs);
      const key = JSON.stringify([candidate.eventKey, epochMs]);
      if (!unique.has(key))
        unique.set(key, Object.freeze({
          eventKey: candidate.eventKey,
          instantUtc: new Date(epochMs).toISOString(),
          epochMs,
          ownerChunkIndex,
        }));
    }
  }
  const hits = [...unique.values()].sort((a, b) =>
    a.epochMs - b.epochMs || (a.eventKey < b.eventKey ? -1 : a.eventKey > b.eventKey ? 1 : 0));
  return Object.freeze({
    window: plan.window,
    chunkCount: plan.chunks.length,
    rawHitCount,
    duplicateCount: rawHitCount - hits.length,
    hits: Object.freeze(hits),
  });
}
