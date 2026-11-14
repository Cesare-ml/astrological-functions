import type { UtcSearchWindowInput, ValidatedUtcSearchWindow } from './utc-search-window.mjs';

export type UtcSearchChunkInput = UtcSearchWindowInput & Readonly<{
  chunkDurationMs: number;
  maxChunks: number;
}>;

/** A half-open [startEpochMs, endEpochMs) interval. */
export type UtcSearchChunk = Readonly<{
  index: number;
  startUtc: string;
  endUtc: string;
  startEpochMs: number;
  endEpochMs: number;
  durationMs: number;
}>;

export type UtcSearchChunks = Readonly<{
  window: ValidatedUtcSearchWindow;
  chunkDurationMs: number;
  maxChunks: number;
  chunks: readonly UtcSearchChunk[];
}>;

/** Throws AstrologyError if any bound, chunk duration, or maxChunks is invalid. */
export declare function splitUtcSearchWindow(input: UtcSearchChunkInput): UtcSearchChunks;
