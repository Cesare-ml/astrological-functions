/**
 * Contract-only adapter for the experimental F5 transit pipeline (draft PR #21).
 * Does not implement astronomical methods or convert candidates into events.
 */
import { AstrologyError } from './index.mjs';
import { splitUtcSearchWindow } from './utc-search-window-chunks.mjs';
import { snapshotTransitPinnedIdentity } from './transit-chunk-candidate-reports.mjs';

const MAX_F5_CHUNK_MS = 31 * 86400000;
const F5_CAPABILITIES = Object.freeze({
  contractVersion:'0.1.0-experimental',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage:'INCLUDED', numericErrorCoverage:'INCLUDED',
  center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
});

function reject(code, message) { throw new AstrologyError(code, message); }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    reject('INVALID_ARGUMENT', `${label} must be an object`);
  return value;
}
function integer(value, low, high) {
  return Number.isSafeInteger(value) && value >= low && value <= high;
}
function ownRequestData(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value'))
    reject('INCOMPATIBLE_CHUNK_REQUEST', `F5 chunk ${key} must be an own data property`);
  return descriptor.value;
}
function verifyRequestIdentity(request, identity) {
  for (const key of ['skyBodyName','natalBodyName','aspectId','exactAngleDeg','orientation'])
    if (ownRequestData(request, key) !== identity[key])
      reject('INCOMPATIBLE_CHUNK_REQUEST', `F5 chunk identity mismatch: ${key}`);
  const provenance = ownRequestData(request, 'ephemerisProvenance');
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance))
    reject('INCOMPATIBLE_CHUNK_REQUEST', 'F5 chunk provenance must be an object');
  for (const key of ['engineVersion','kernelSetId','timeModel'])
    if (ownRequestData(provenance, key) !== identity.ephemerisProvenance[key])
      reject('INCOMPATIBLE_CHUNK_REQUEST', `F5 chunk provenance mismatch: ${key}`);
}

/**
 * Create a once-per-chunk runner compatible with collectTransitChunkCandidateReports.
 * Caller's prepareCandidates is PR #21's prepareTransitAspectEventCandidates once
 * the draft stack is available. No implicit clamping of the final short chunk.
 */
export function makeTransitChunkPipelineRunner(input) {
  object(input, 'input');
  const raw = object(input.windowInput, 'windowInput');
  const windowInput = Object.freeze({
    startUtc: raw.startUtc, endUtc: raw.endUtc,
    maxDurationMs: raw.maxDurationMs, chunkDurationMs: raw.chunkDurationMs,
    maxChunks: raw.maxChunks,
  });
  const plan = splitUtcSearchWindow(windowInput);
  const identity = snapshotTransitPinnedIdentity(input.identity);
  const scan = object(input.scan, 'scan');
  const targetIntervalMs = scan.targetIntervalMs;
  const maxDepth = scan.maxDepth;
  const maxProviderCalls = scan.maxProviderCalls;
  const minChunkMs = plan.chunks.at(-1).durationMs;
  if (plan.chunks.some(chunk => chunk.durationMs > MAX_F5_CHUNK_MS) ||
      !integer(targetIntervalMs, 1, minChunkMs) ||
      !integer(maxDepth, 0, 24) || !integer(maxProviderCalls, 1, 4096))
    reject('INCOMPATIBLE_PIPELINE_LIMITS', 'F5 scanner limits must fit every chunk, including the final tail');
  const refinement = object(input.refinement, 'refinement');
  const r = Object.freeze({
    timeToleranceMs: refinement.timeToleranceMs,
    residualToleranceDeg: refinement.residualToleranceDeg,
    maxIterations: refinement.maxIterations,
    maxCandidateRefinements: refinement.maxCandidateRefinements,
    maxRefinementCalls: refinement.maxRefinementCalls,
  });
  if (!integer(r.timeToleranceMs, 1, Number.MAX_SAFE_INTEGER) ||
      typeof r.residualToleranceDeg !== 'number' || !Number.isFinite(r.residualToleranceDeg) ||
      r.residualToleranceDeg <= 0 || r.residualToleranceDeg > 1 ||
      !integer(r.maxIterations, 1, 128) ||
      !integer(r.maxCandidateRefinements, 1, 128) ||
      !integer(r.maxRefinementCalls, 1, 16384))
    reject('INCOMPATIBLE_PIPELINE_LIMITS', 'F5 refinement tolerances and budgets must be explicit and finite');
  // A worst-case cap must fit ALL planned chunks, rather than silently giving
  // each chunk a new unlimited global budget. The F5 solver owns per-call caps.
  const maxTotalProviderCalls = input.maxTotalProviderCalls;
  const worstCaseCalls = plan.chunks.length * (maxProviderCalls + r.maxRefinementCalls);
  if (!integer(maxTotalProviderCalls, 1, 1000000) || worstCaseCalls > maxTotalProviderCalls)
    reject('GLOBAL_PIPELINE_BUDGET', 'Worst-case F5 provider calls exceed explicit global budget');
  const provider = object(input.provider, 'provider');
  const capabilities = object(provider.capabilities, 'provider.capabilities');
  if (Object.entries(F5_CAPABILITIES).some(([key, value]) => capabilities[key] !== value))
    reject('UNSUPPORTED_COVERAGE', 'F5 provider capabilities must declare continuous apparent all-time enclosures');
  if (typeof provider.getUnwrappedAspectResidual !== 'function' ||
      typeof provider.getUnwrappedResidualEnclosure !== 'function')
    reject('UNSUPPORTED_COVERAGE', 'F5 provider must implement point and all-time interval methods');
  // Capture both methods and capability values before any asynchronous work.
  const fixedProvider = Object.freeze({
    capabilities: Object.freeze({ ...capabilities }),
    getUnwrappedAspectResidual: provider.getUnwrappedAspectResidual.bind(provider),
    getUnwrappedResidualEnclosure: provider.getUnwrappedResidualEnclosure.bind(provider),
  });
  if (typeof input.prepareCandidates !== 'function')
    reject('MISSING_PIPELINE', 'An explicitly injected F5 prepareCandidates function is required');
  const prepareCandidates = input.prepareCandidates;
  let nextIndex = 0;
  let running = false;
  let failed = false;
  return async function runChunk(request) {
    if (running || failed || nextIndex >= plan.chunks.length)
      reject('PIPELINE_SEQUENCE_ERROR', 'F5 chunks must run once, sequentially, without retry after failure');
    object(request, 'request');
    const expected = plan.chunks[nextIndex];
    if (ownRequestData(request, 'chunkIndex') !== expected.index ||
        ownRequestData(request, 'startUtc') !== expected.startUtc ||
        ownRequestData(request, 'endUtc') !== expected.endUtc)
      reject('INCOMPATIBLE_CHUNK_REQUEST', 'F5 request does not match the prevalidated UTC chunk');
    verifyRequestIdentity(request, identity);
    running = true;
    try {
      // No chunkIndex forwarded: it is not part of the PR #21 contract.
      const result = await prepareCandidates(Object.freeze({
        startUtc: expected.startUtc, endUtc: expected.endUtc,
        ...identity,
        targetIntervalMs, maxDepth, maxProviderCalls,
        provider: fixedProvider, refinement: r,
      }));
      nextIndex++;
      return result;
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      running = false;
    }
  };
}
