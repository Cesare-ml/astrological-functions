// A real installed-package consumer should need *only* the exported subpath.
import {prepareTransitAspectEventCandidates,
  type TransitAspectEventCandidates,
  type TransitRefinementLimits,
  type TransitIntervalProvider,
  type TransitIntervalCapabilities,
  type TransitRangeRequest,
  type TransitRangeResponse,
  type TransitHitProvenance,
  type TransitAspectOrientation,
  type BracketedTransitAspectHit} from 'astrological-functions/transit-events';

declare const rangeRequest: TransitRangeRequest;
declare const rangeResponse: TransitRangeResponse;
declare const capabilities: TransitIntervalCapabilities;
declare const hit: BracketedTransitAspectHit;
const orientation: TransitAspectOrientation = 'POSITIVE';
void [rangeRequest, rangeResponse, capabilities, hit, orientation];
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

// @ts-expect-error no undeclared point-only provider can stand in for interval bounds
prepareTransitAspectEventCandidates({...options,provider:{capabilities:provider.capabilities,
  getUnwrappedAspectResidual:provider.getUnwrappedAspectResidual}});
// @ts-expect-error invalid object cannot stand in for a typed, pinned provenance
prepareTransitAspectEventCandidates({...options,ephemerisProvenance:{engineVersion:'mock'}});
