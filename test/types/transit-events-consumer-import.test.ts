import {prepareTransitAspectEventCandidates,
  type TransitAspectEventCandidates,
  type TransitRefinementLimits} from 'astrological-functions/transit-events';
import type {TransitIntervalProvider} from '../../src/transit-interval-scan.mjs';
import type {TransitHitProvenance} from '../../src/transit-exact-hit.mjs';
declare const provider:TransitIntervalProvider;
declare const ephemerisProvenance:TransitHitProvenance;
const refinement:TransitRefinementLimits={
  timeToleranceMs:100,residualToleranceDeg:0.0001,maxIterations:40,
  maxCandidateRefinements:32,maxRefinementCalls:200
};
const options={
  startUtc:'2026-11-12T00:00:00Z',endUtc:'2026-11-12T01:00:00Z',
  skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',
  exactAngleDeg:90,orientation:'POSITIVE' as const,
  targetIntervalMs:60000,maxDepth:10,maxProviderCalls:200,
  ephemerisProvenance,provider,refinement
};
const facts:Promise<TransitAspectEventCandidates>=prepareTransitAspectEventCandidates(options);
void facts;
// @ts-expect-error negative paths must not silently accept an invalid orientation
prepareTransitAspectEventCandidates({...options,orientation:'AUTO'});
// @ts-expect-error explicitly required refinement limits must not be omitted
prepareTransitAspectEventCandidates({...options,refinement:{maxIterations:40}});
