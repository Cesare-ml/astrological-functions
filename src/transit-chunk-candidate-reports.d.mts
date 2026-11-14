import type { UtcSearchChunkInput } from './utc-search-window-chunks.mjs';
import type { ValidatedUtcSearchWindow } from './utc-search-window.mjs';
export type TransitAspectOrientation = 'POSITIVE' | 'NEGATIVE';
export type TransitPinnedIdentity = Readonly<{
  skyBodyName: string; natalBodyName: string; aspectId: string;
  exactAngleDeg: number; orientation: TransitAspectOrientation;
  ephemerisProvenance: Readonly<{engineVersion:string;kernelSetId:string;timeModel:string}>;
}>;
export declare function snapshotTransitPinnedIdentity(identity:TransitPinnedIdentity):TransitPinnedIdentity;
export type TransitChunkRequest = TransitPinnedIdentity & Readonly<{
  chunkIndex: number; startUtc: string; endUtc: string;
}>;
/** Minimal structural subset of draft PR #21's experimental result. */
export type TransitCandidatePipelineReport = TransitPinnedIdentity & Readonly<{
  contract: 'TransitAspectEventCandidates'; contractVersion: '0.1.0-experimental';
  direction: 'SKY_TO_NATAL'; startUtc: string; endUtc: string;
  refinedCandidates: readonly unknown[];
  sampledZeros: readonly unknown[];
  unresolvedIntervals: readonly unknown[];
  hasUnresolvedIntervals: boolean;
  excludedIntervals: number; inspectedIntervals: number;
  scanProviderCalls: number; refinementProviderCalls: number;
  completeness: 'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE';
  verification: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  scientificallyValidated: false;
}>;
export type TransitChunkSummary = Readonly<{
  chunkIndex:number; startUtc:string; endUtc:string;
  refinedCandidateCount:number; sampledZeroCount:number; unresolvedIntervalCount:number;
  hasUnresolvedIntervals:boolean; scanProviderCalls:number; refinementProviderCalls:number;
  inspectedIntervals:number; excludedIntervals:number;
}>;
export type ChunkedTransitCandidateReportSummary = Readonly<{
  contract:'ChunkedTransitCandidateReportSummary'; contractVersion:'0.1.0-experimental';
  direction:'SKY_TO_NATAL'; window:ValidatedUtcSearchWindow;
  identity:TransitPinnedIdentity; chunkCount:number; reports:readonly TransitChunkSummary[];
  totals:Readonly<{refinedCandidateCount:number; sampledZeroCount:number; unresolvedIntervalCount:number;
    scanProviderCalls:number; refinementProviderCalls:number}>;
  verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  scientificallyValidated:false;
  completeness:'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE';
}>;
export declare function collectTransitChunkCandidateReports(input: Readonly<{
  windowInput: UtcSearchChunkInput;
  identity: TransitPinnedIdentity;
  maxCandidateRecords: number;
  runChunk(request:TransitChunkRequest):Promise<TransitCandidatePipelineReport>;
}>):Promise<ChunkedTransitCandidateReportSummary>;
