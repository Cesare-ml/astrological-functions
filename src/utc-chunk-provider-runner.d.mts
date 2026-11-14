import type { UtcSearchChunkInput } from './utc-search-window-chunks.mjs';
import type { UtcEventHit, ReconciledUtcChunkEventHits } from './utc-chunk-event-reconciliation.mjs';

/** Frozen caller-facing chunk request; closed end is permitted for candidates. */
export type UtcCandidateChunkRequest = Readonly<{
  chunkIndex: number;
  startUtc: string;
  endUtc: string;
  startEpochMs: number;
  endEpochMs: number;
}>;

export type UtcChunkCandidateProvider = Readonly<{
  scanChunk(request: UtcCandidateChunkRequest): Promise<readonly UtcEventHit[]>;
}>;

export type UtcChunkScanInput = Readonly<{
  windowInput: UtcSearchChunkInput;
  maxInputHits: number;
  provider: UtcChunkCandidateProvider;
}>;

export type UtcChunkScanResult = ReconciledUtcChunkEventHits & Readonly<{
  providerCallCount: number;
}>;

/** One scan per chunk, sequential. Never performs astronomical calculations. */
export declare function scanUtcChunkCandidatesWithProvider(input: UtcChunkScanInput): Promise<UtcChunkScanResult>;
