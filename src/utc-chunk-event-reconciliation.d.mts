import type { UtcSearchChunkInput } from './utc-search-window-chunks.mjs';
import type { ValidatedUtcSearchWindow } from './utc-search-window.mjs';

/** Exact event identity is declared by the caller: stable key + UTC instant. */
export type UtcEventHit = Readonly<{
  eventKey: string;
  instantUtc: string;
}>;

/** Chunk results may be passed in any order; every chunk must be present once. */
export type UtcChunkEventHits = Readonly<{
  chunkIndex: number;
  hits: readonly UtcEventHit[];
}>;

export type UtcEventReconciliationInput = Readonly<{
  windowInput: UtcSearchChunkInput;
  chunkResults: readonly UtcChunkEventHits[];
  maxInputHits: number;
}>;

export type ReconciledUtcEventHit = Readonly<{
  eventKey: string;
  instantUtc: string;
  epochMs: number;
  ownerChunkIndex: number;
}>;

export type ReconciledUtcChunkEventHits = Readonly<{
  window: ValidatedUtcSearchWindow;
  chunkCount: number;
  rawHitCount: number;
  duplicateCount: number;
  hits: readonly ReconciledUtcEventHit[];
}>;

/** Reconcile validated closed-edge candidates to exactly one half-open chunk. */
export declare function reconcileUtcChunkEventHits(
  input: UtcEventReconciliationInput,
): ReconciledUtcChunkEventHits;
