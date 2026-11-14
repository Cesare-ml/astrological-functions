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
  /** Required before construction; no identity inference from the first chunk. */
  identity: TransitPinnedIdentity;
  scan: F5ScanLimits;
  refinement: F5RefinementLimits;
  provider: P;
  /** Explicit upper bound for all scanner and refinement provider calls. */
  maxTotalProviderCalls: number;
  prepareCandidates(input: F5PipelineChunkInput<P>): Promise<TransitCandidatePipelineReport>;
}>): (request: TransitChunkRequest) => Promise<TransitCandidatePipelineReport>;
