/**
 * Contract-only adapter for the experimental F5 transit pipeline (draft PR #21).
 * Does not implement astronomical methods or convert candidates into events.
 */
import { AstrologyError } from './index.mjs';
import { splitUtcSearchWindow } from './utc-search-window-chunks.mjs';

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


// Descriptor reads keep caller-owned accessors from executing during validation.
// The collector supplies frozen plain data records; direct runner callers must
// provide the same stable, explicitly versioned identity contract.
function ownData(value, name, code) {
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (!descriptor || !Object.hasOwn(descriptor, 'value'))
    reject(code, `Expected an own data property: ${name}`);
  return descriptor.value;
}
function named(value, label) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim())
    reject('INVALID_TRANSIT_IDENTITY', `${label} must be a nonempty trimmed identifier`);
  return value;
}
function pinnedChunkIdentity(request) {
  const provenance = ownData(request, 'ephemerisProvenance', 'INVALID_TRANSIT_IDENTITY');
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance))
    reject('INVALID_TRANSIT_IDENTITY', 'Explicit provenance object is required');
  const ephemerisProvenance = Object.freeze({
    engineVersion: named(ownData(provenance, 'engineVersion', 'INVALID_TRANSIT_IDENTITY'), 'engineVersion'),
    kernelSetId: named(ownData(provenance, 'kernelSetId', 'INVALID_TRANSIT_IDENTITY'), 'kernelSetId'),
    timeModel: named(ownData(provenance, 'timeModel', 'INVALID_TRANSIT_IDENTITY'), 'timeModel'),
  });
  const exactAngleDeg = ownData(request, 'exactAngleDeg', 'INVALID_TRANSIT_IDENTITY');
  const orientation = ownData(request, 'orientation', 'INVALID_TRANSIT_IDENTITY');
  if (typeof exactAngleDeg !== 'number' || !Number.isFinite(exactAngleDeg) ||
      exactAngleDeg < 0 || exactAngleDeg > 180 ||
      (orientation !== 'POSITIVE' && orientation !== 'NEGATIVE'))
    reject('INVALID_TRANSIT_IDENTITY', 'Aspect angle and orientation must be explicit');
  return Object.freeze({
    skyBodyName: named(ownData(request, 'skyBodyName', 'INVALID_TRANSIT_IDENTITY'), 'skyBodyName'),
    natalBodyName: named(ownData(request, 'natalBodyName', 'INVALID_TRANSIT_IDENTITY'), 'natalBodyName'),
    aspectId: named(ownData(request, 'aspectId', 'INVALID_TRANSIT_IDENTITY'), 'aspectId'),
    exactAngleDeg, orientation, ephemerisProvenance,
  });
}
function sameIdentity(a, b) {
  return ['skyBodyName', 'natalBodyName', 'aspectId', 'exactAngleDeg', 'orientation']
    .every(key => a[key] === b[key]) &&
    ['engineVersion', 'kernelSetId', 'timeModel']
      .every(key => a.ephemerisProvenance[key] === b.ephemerisProvenance[key]);
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
  let firstIdentity = null;
  return async function runChunk(request) {
    if (running || failed || nextIndex >= plan.chunks.length)
      reject('PIPELINE_SEQUENCE_ERROR', 'F5 chunks must run once, sequentially, without retry after failure');
    object(request, 'request');
    const expected = plan.chunks[nextIndex];
    if (ownData(request, 'chunkIndex', 'INCOMPATIBLE_CHUNK_REQUEST') !== expected.index ||
        ownData(request, 'startUtc', 'INCOMPATIBLE_CHUNK_REQUEST') !== expected.startUtc ||
        ownData(request, 'endUtc', 'INCOMPATIBLE_CHUNK_REQUEST') !== expected.endUtc)
      reject('INCOMPATIBLE_CHUNK_REQUEST', 'F5 request does not match the prevalidated UTC chunk');
    const identity = pinnedChunkIdentity(request);
    if (firstIdentity !== null && !sameIdentity(firstIdentity, identity))
      reject('INCOMPATIBLE_CHUNK_IDENTITY', 'F5 aspect identity or ephemeris provenance changed between chunks');
    if (firstIdentity === null) firstIdentity = identity;
    running = true;
    try {
      // No chunkIndex forwarded: it is not part of the PR #21 contract.
      const result = await prepareCandidates(Object.freeze({
        startUtc: expected.startUtc, endUtc: expected.endUtc,
        skyBodyName: identity.skyBodyName,
        natalBodyName: identity.natalBodyName,
        aspectId: identity.aspectId,
        exactAngleDeg: identity.exactAngleDeg,
        orientation: identity.orientation,
        ephemerisProvenance: identity.ephemerisProvenance,
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
