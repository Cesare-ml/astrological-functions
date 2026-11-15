/**
 * Synthetic-only orchestration boundary: one injected scan per bounded UTC chunk.
 * Provider chooses event semantics; this module computes no astronomical facts.
 */
import { AstrologyError } from './index.mjs';
import { parseStrictUtcInstant } from './utc-search-window.mjs';
import { splitUtcSearchWindow } from './utc-search-window-chunks.mjs';
import { reconcileUtcChunkEventHits } from './utc-chunk-event-reconciliation.mjs';

/**
 * Sequential, fail-closed scan for caller-owned candidate results.
 * Provider may report both chunk endpoints; only the overall end is excluded.
 * The caller must separately enforce timeouts, cancellation and astronomical
 * provenance/continuity for the underlying solver.
 */
export async function scanUtcChunkCandidatesWithProvider(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Chunk scan options must be an object');
  const { windowInput, maxInputHits, provider } = input;
  if (!windowInput || typeof windowInput !== 'object' || Array.isArray(windowInput))
    throw new AstrologyError('INVALID_ARGUMENT', 'windowInput must be an object');
  // Snapshot before the first await: an asynchronous provider cannot redirect
  // later chunk requests by mutating the caller-owned input.
  const stableWindowInput = Object.freeze({
    startUtc: windowInput.startUtc,
    endUtc: windowInput.endUtc,
    maxDurationMs: windowInput.maxDurationMs,
    chunkDurationMs: windowInput.chunkDurationMs,
    maxChunks: windowInput.maxChunks,
  });
  const plan = splitUtcSearchWindow(stableWindowInput);
  if (!Number.isSafeInteger(maxInputHits) || maxInputHits < 1 || maxInputHits > 16384)
    throw new AstrologyError('INVALID_EVENT_LIMIT', 'maxInputHits must be an explicit integer between 1 and 16384');
  if (!provider || (typeof provider !== 'object' && typeof provider !== 'function') ||
      Array.isArray(provider) || typeof provider.scanChunk !== 'function')
    throw new AstrologyError('MISSING_EVENT_PROVIDER', 'Explicit candidate scan provider required');
  const scanChunk = provider.scanChunk;
  const chunkResults = [];
  let seenHits = 0;
  for (const chunk of plan.chunks) {
    const request = Object.freeze({
      chunkIndex: chunk.index,
      startUtc: chunk.startUtc,
      endUtc: chunk.endUtc,
      startEpochMs: chunk.startEpochMs,
      endEpochMs: chunk.endEpochMs,
    });
    const returnedHits = await scanChunk.call(provider, request);
    if (!Array.isArray(returnedHits))
      throw new AstrologyError('INVALID_CHUNK_RESULTS', 'Provider must return an array of candidate hits');
    // Check budget before reading or copying any returned candidate.
    if (returnedHits.length > maxInputHits - seenHits)
      throw new AstrologyError('TOO_MANY_EVENT_HITS', 'Provider returned more candidates than maxInputHits');
    const hits = [];
    for (const hit of returnedHits) {
      if (!hit || typeof hit !== 'object' || Array.isArray(hit) ||
          Reflect.ownKeys(hit).length !== 2)
        throw new AstrologyError('INVALID_EVENT_HIT', 'Candidate must contain only eventKey and instantUtc');
      // Read own data descriptors once: accessor getters can lie or mutate
      // between validation and snapshotting, so they are not accepted.
      const key = Object.getOwnPropertyDescriptor(hit, 'eventKey');
      const time = Object.getOwnPropertyDescriptor(hit, 'instantUtc');
      if (!key || !time || !Object.hasOwn(key, 'value') || !Object.hasOwn(time, 'value') ||
          typeof key.value !== 'string' || !key.value.trim() ||
          key.value !== key.value.trim() || key.value.length > 256)
        throw new AstrologyError('INVALID_EVENT_HIT', 'Candidate must contain only eventKey and instantUtc');
      let epochMs;
      try {
        epochMs = parseStrictUtcInstant(time.value, 'instantUtc');
      } catch (error) {
        if (error instanceof AstrologyError && error.code === 'INVALID_UTC')
          throw new AstrologyError('INVALID_EVENT_TIME', 'Candidate must contain a real UTC instant');
        throw error;
      }
      if (epochMs < chunk.startEpochMs || epochMs > chunk.endEpochMs ||
          epochMs >= plan.window.endEpochMs)
        throw new AstrologyError('EVENT_OUTSIDE_CHUNK', 'Candidate is outside its chunk or search window');
      hits.push(Object.freeze({ eventKey: key.value, instantUtc: time.value }));
    }
    seenHits += hits.length;
    chunkResults.push(Object.freeze({ chunkIndex: chunk.index, hits: Object.freeze(hits) }));
  }
  const reconciled = reconcileUtcChunkEventHits({
    windowInput: stableWindowInput,
    chunkResults,
    maxInputHits,
  });
  return Object.freeze({ ...reconciled, providerCallCount: plan.chunks.length });
}
