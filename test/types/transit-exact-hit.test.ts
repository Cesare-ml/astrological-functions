import {
  refineBracketedTransitAspectHit, type TransitResidualProvider,
  type TransitHitProvenance, type BracketedTransitAspectHit
} from '../../src/transit-exact-hit.mjs';
declare const provider: TransitResidualProvider;
declare const provenance: TransitHitProvenance;
const input = { startUtc:'2026-11-12T00:00:00Z', endUtc:'2026-11-12T01:00:00Z',
  skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square', exactAngleDeg:90,
  orientation:'POSITIVE' as const, timeToleranceMs:100, residualToleranceDeg:1e-4,
  maxIterations:40, ephemerisProvenance:provenance, provider };
const hit: Promise<BracketedTransitAspectHit> = refineBracketedTransitAspectHit(input);
void hit;
// @ts-expect-error orientation must be explicit, not auto-selected
refineBracketedTransitAspectHit({ ...input, orientation:'AUTO' });
// @ts-expect-error missing maximum iteration budget is not allowed
refineBracketedTransitAspectHit({ startUtc:input.startUtc, endUtc:input.endUtc, skyBodyName:'Mars',
  natalBodyName:'Sun',aspectId:'square',exactAngleDeg:90,orientation:'POSITIVE',
  timeToleranceMs:100,residualToleranceDeg:1e-4,ephemerisProvenance:provenance,provider });
