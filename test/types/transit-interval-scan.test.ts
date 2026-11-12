import { scanTransitAspectCandidateIntervals, type TransitIntervalProvider,
  type TransitCandidateIntervals } from '../../src/transit-interval-scan.mjs';
import type { TransitHitProvenance } from '../../src/transit-exact-hit.mjs';
declare const provider: TransitIntervalProvider;
declare const provenance: TransitHitProvenance;
const input = {startUtc:'2026-11-12T00:00:00Z',endUtc:'2026-11-12T01:00:00Z',
  skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',exactAngleDeg:90,
  orientation:'POSITIVE' as const,targetIntervalMs:1000,maxDepth:12,maxProviderCalls:100,
  ephemerisProvenance:provenance,provider};
const result: Promise<TransitCandidateIntervals> = scanTransitAspectCandidateIntervals(input);
void result;
// @ts-expect-error missing explicit call budget must be a type error
scanTransitAspectCandidateIntervals({ ...input, maxProviderCalls:undefined });
// @ts-expect-error unknown orientation is not accepted
scanTransitAspectCandidateIntervals({ ...input, orientation:'AUTO' });
// @ts-expect-error an ordinary point provider does not supply guaranteed interval enclosures
scanTransitAspectCandidateIntervals({ ...input, provider:{capabilities:provider.capabilities,
  getUnwrappedAspectResidual:provider.getUnwrappedAspectResidual} });
