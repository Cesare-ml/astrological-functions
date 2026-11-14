import {
  reconcileUtcChunkEventHits,
  type UtcEventReconciliationInput,
  type ReconciledUtcChunkEventHits,
} from '../../src/utc-chunk-event-reconciliation.mjs';

const input: UtcEventReconciliationInput = {
  windowInput: {
    startUtc: '2026-11-14T00:00:00Z',
    endUtc: '2026-11-14T01:00:00Z',
    maxDurationMs: 3_600_000,
    chunkDurationMs: 1_800_000,
    maxChunks: 2,
  },
  chunkResults: [
    { chunkIndex: 0, hits: [{ eventKey: 'SUN_INGRESS', instantUtc: '2026-11-14T00:30:00Z' }] },
    { chunkIndex: 1, hits: [] },
  ],
  maxInputHits: 20,
};
const result: ReconciledUtcChunkEventHits = reconcileUtcChunkEventHits(input);
const owner: number = result.hits[0].ownerChunkIndex;
void owner;

// @ts-expect-error caller must declare a candidate allocation limit.
reconcileUtcChunkEventHits({windowInput: input.windowInput, chunkResults: input.chunkResults});
// @ts-expect-error event identifiers are strings.
reconcileUtcChunkEventHits({ ...input, chunkResults: [{chunkIndex: 0, hits: [{eventKey: 1, instantUtc: input.windowInput.startUtc}]}] });
// @ts-expect-error reconciled hits cannot be altered in place.
result.hits[0].ownerChunkIndex = 1;
// @ts-expect-error reconciled hits array is immutable.
result.hits.push(result.hits[0]);
