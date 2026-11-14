import {prepareTransitAspectEventCandidates,
  type TransitAspectEventCandidates,
  type TransitRefinementLimits} from '../../src/transit-event-pipeline.mjs';
import type {TransitIntervalProvider} from '../../src/transit-interval-scan.mjs';
import type {TransitHitProvenance} from '../../src/transit-exact-hit.mjs';
declare const provider: TransitIntervalProvider;
declare const provenance: TransitHitProvenance;
const refinement: TransitRefinementLimits={timeToleranceMs:100,residualToleranceDeg:0.0001,
  maxIterations:40,maxCandidateRefinements:40,maxRefinementCalls:400};
const args={startUtc:'2026-11-12T00:00:00Z',endUtc:'2026-11-12T01:00:00Z',
  skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',exactAngleDeg:90,
  orientation:'POSITIVE' as const,targetIntervalMs:60000,maxDepth:10,maxProviderCalls:300,
  ephemerisProvenance:provenance,provider,refinement};
const result:Promise<TransitAspectEventCandidates>=prepareTransitAspectEventCandidates(args);
void result;
// @ts-expect-error explicit refinement budgets are required
prepareTransitAspectEventCandidates({...args,refinement:{timeToleranceMs:100}});
// @ts-expect-error unsupported aspect orientation
prepareTransitAspectEventCandidates({...args,orientation:'AUTO'});
