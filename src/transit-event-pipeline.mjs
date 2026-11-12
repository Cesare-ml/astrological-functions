/**
 * Experimental orchestration of provider-asserted transit event candidates.
 * Facts only: no astronomy, unique-event certification or production scheduling.
 */
import { AstrologyError } from './index.mjs';
import { scanTransitAspectCandidateIntervals } from './transit-interval-scan.mjs';
import { refineBracketedTransitAspectHit } from './transit-exact-hit.mjs';

const VERSION = '0.1.0-experimental';
function invalid(code, message) { throw new AstrologyError(code, message); }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid('INVALID_ARGUMENT', `${label} must be an object`);
  return value;
}

/**
 * Scan first, then refine each sign-changing candidate. Every result remains
 * conditional on the caller-asserted interval enclosures; multiple or tangent
 * roots are NEVER claimed absent even if no unresolved leaves are reported.
 */
export async function prepareTransitAspectEventCandidates(input) {
  object(input, 'input');
  const refinement = object(input.refinement, 'refinement');
  const timeToleranceMs = refinement.timeToleranceMs;
  const residualToleranceDeg = refinement.residualToleranceDeg;
  const maxIterations = refinement.maxIterations;
  const maxCandidateRefinements = refinement.maxCandidateRefinements;
  const maxRefinementCalls = refinement.maxRefinementCalls;
  if (!Number.isSafeInteger(timeToleranceMs) || timeToleranceMs < 1 ||
      typeof residualToleranceDeg !== 'number' || !Number.isFinite(residualToleranceDeg) ||
      residualToleranceDeg <= 0 || residualToleranceDeg > 1 ||
      !Number.isSafeInteger(maxIterations) || maxIterations < 1 || maxIterations > 128 ||
      !Number.isSafeInteger(maxCandidateRefinements) || maxCandidateRefinements < 1 ||
      maxCandidateRefinements > 128 ||
      !Number.isSafeInteger(maxRefinementCalls) || maxRefinementCalls < 1 ||
      maxRefinementCalls > 16384)
    invalid('INVALID_LIMIT', 'Explicit bounded refinement tolerances and budgets are required');

  // Freeze the input contract and bound provider methods before any await. This
  // avoids reentrant caller mutation silently changing a later refinement.
  const provider = object(input.provider, 'provider');
  const capabilities = object(provider.capabilities, 'provider.capabilities');
  if (typeof provider.getUnwrappedAspectResidual !== 'function' ||
      typeof provider.getUnwrappedResidualEnclosure !== 'function')
    invalid('UNSUPPORTED_COVERAGE', 'Both point and interval methods are required');
  const point = provider.getUnwrappedAspectResidual.bind(provider);
  const range = provider.getUnwrappedResidualEnclosure.bind(provider);
  const providerSnapshot = Object.freeze({
    capabilities: Object.freeze({ ...capabilities }),
    getUnwrappedAspectResidual: point,
    getUnwrappedResidualEnclosure: range
  });
  const provenance = object(input.ephemerisProvenance, 'ephemerisProvenance');
  const ephemerisProvenance = Object.freeze({
    engineVersion: provenance.engineVersion,
    kernelSetId: provenance.kernelSetId,
    timeModel: provenance.timeModel
  });
  const scanInput = Object.freeze({
    startUtc: input.startUtc, endUtc: input.endUtc,
    skyBodyName: input.skyBodyName, natalBodyName: input.natalBodyName,
    aspectId: input.aspectId, exactAngleDeg: input.exactAngleDeg,
    orientation: input.orientation, targetIntervalMs: input.targetIntervalMs,
    maxDepth: input.maxDepth, maxProviderCalls: input.maxProviderCalls,
    ephemerisProvenance, provider: providerSnapshot
  });
  const scanned = await scanTransitAspectCandidateIntervals(scanInput);
  if (scanned.signChangeCandidates.length > maxCandidateRefinements)
    invalid('REFINEMENT_BUDGET_EXCEEDED', 'Too many candidates for the explicit refinement budget');

  let refinementCalls = 0;
  const refiningProvider = Object.freeze({
    capabilities: providerSnapshot.capabilities,
    async getUnwrappedAspectResidual(request) {
      if (refinementCalls >= maxRefinementCalls)
        invalid('REFINEMENT_BUDGET_EXCEEDED', 'Refinement point-evaluation budget exhausted');
      refinementCalls++;
      return point(request);
    }
  });
  const refinedCandidates = [];
  for (const candidate of scanned.signChangeCandidates) {
    const span = Date.parse(candidate.endUtc) - Date.parse(candidate.startUtc);
    if (!Number.isSafeInteger(span) || span < 1)
      invalid('INVALID_CANDIDATE', 'Scanner returned an invalid candidate interval');
    const hit = await refineBracketedTransitAspectHit({
      startUtc: candidate.startUtc, endUtc: candidate.endUtc,
      skyBodyName: scanned.skyBodyName, natalBodyName: scanned.natalBodyName,
      aspectId: scanned.aspectId, exactAngleDeg: scanned.exactAngleDeg,
      orientation: scanned.orientation, ephemerisProvenance: scanned.ephemerisProvenance,
      // A shorter leaf interval may impose a stricter time tolerance.
      timeToleranceMs: Math.min(timeToleranceMs, span), residualToleranceDeg,
      maxIterations, provider: refiningProvider
    });
    refinedCandidates.push(Object.freeze({ candidate, refinement: hit,
      uniqueness: 'MULTIPLE_ROOTS_NOT_EXCLUDED' }));
  }
  return Object.freeze({
    contract: 'TransitAspectEventCandidates', contractVersion: VERSION,
    direction: 'SKY_TO_NATAL', startUtc: scanned.startUtc, endUtc: scanned.endUtc,
    skyBodyName: scanned.skyBodyName, natalBodyName: scanned.natalBodyName,
    aspectId: scanned.aspectId, exactAngleDeg: scanned.exactAngleDeg,
    orientation: scanned.orientation, ephemerisProvenance: scanned.ephemerisProvenance,
    refinedCandidates: Object.freeze(refinedCandidates),
    sampledZeros: scanned.sampledZeros,
    unresolvedIntervals: scanned.unresolvedIntervals,
    excludedIntervals: scanned.excludedIntervals,
    inspectedIntervals: scanned.inspectedIntervals,
    scanProviderCalls: scanned.providerCalls,
    refinementProviderCalls: refinementCalls,
    hasUnresolvedIntervals: scanned.unresolvedIntervals.length > 0,
    completeness: 'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE',
    verification: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    scientificallyValidated: false
  });
}
