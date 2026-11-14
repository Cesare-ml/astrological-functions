import type { UtcSearchChunkInput } from './utc-search-window-chunks.mjs';
import type { TransitChunkRequest, TransitPinnedIdentity, TransitCandidatePipelineReport } from './transit-chunk-candidate-reports.mjs';

export type F5ScanLimits = Readonly<{
  targetIntervalMs: number;
  maxDepth: number;
  maxProviderCalls: number;
}>;
export type F5RefinementLimits = Readonly<{
  timeToleranceMs: number;
  residualToleranceDeg: number;
  maxIterations: number;
  maxCandidateRefinements: number;
  maxRefinementCalls: number;
}>;
export type F5PipelineChunkInput<P> = Omit<TransitChunkRequest, 'chunkIndex'> &
  F5ScanLimits & Readonly<{provider:P; refinement:F5RefinementLimits}>;
export declare function makeTransitChunkPipelineRunner<P>(input: Readonly<{
  windowInput: UtcSearchChunkInput;
  identity: TransitPinnedIdentity;
  scan: F5ScanLimits;
  refinement: F5RefinementLimits;
  provider: P;
  /** Explicit upper bound for all scanner and refinement provider calls. */
  maxTotalProviderCalls: number;
  /** Optional cancellation of the current and all later chunks. */
  signal?: AbortSignal;
  /** Optional per-chunk deadline (ms, 1..86400000), not a total search timeout. */
  chunkTimeoutMs?: number;
  /** Provider methods may accept an optional AbortSignal as their second argument. */
  prepareCandidates(input: F5PipelineChunkInput<P>): Promise<TransitCandidatePipelineReport>;
}>): (request: TransitChunkRequest) => Promise<TransitCandidatePipelineReport>;
