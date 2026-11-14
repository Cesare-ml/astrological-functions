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
  // Unlike a worst-case estimate, the global cap is enforced on the actual
  // provider invocations across every chunk (point samples AND enclosures).
  // The F5 scan/refiner still enforce their independent per-chunk budgets.
  const maxTotalProviderCalls = input.maxTotalProviderCalls;
  if (!integer(maxTotalProviderCalls, 1, 1000000))
    reject('GLOBAL_PIPELINE_BUDGET', 'Explicit global provider-call cap must be an integer in 1..1000000');
  // Opt-in per-chunk timeout and caller cancellation. A timed-out caller
  // stops waiting, but the underlying provider must cooperate to stop I/O.
  const signal = input.signal;
  if (signal !== undefined && !(signal instanceof AbortSignal))
    reject('INVALID_CANCELLATION', 'signal must be an AbortSignal');
  const chunkTimeoutMs = input.chunkTimeoutMs;
  if (chunkTimeoutMs !== undefined && !integer(chunkTimeoutMs, 1, 86400000))
    reject('INVALID_TIMEOUT', 'chunkTimeoutMs must be an integer between 1 and 86400000');
  const provider = object(input.provider, 'provider');
  const capabilities = object(provider.capabilities, 'provider.capabilities');
  if (Object.entries(F5_CAPABILITIES).some(([key, value]) => capabilities[key] !== value))
    reject('UNSUPPORTED_COVERAGE', 'F5 provider capabilities must declare continuous apparent all-time enclosures');
  if (typeof provider.getUnwrappedAspectResidual !== 'function' ||
      typeof provider.getUnwrappedResidualEnclosure !== 'function')
    reject('UNSUPPORTED_COVERAGE', 'F5 provider must implement point and all-time interval methods');
  // Capture both methods and capability values before any asynchronous work.
  // Wrap BOTH callback categories, so even an injected prepareCandidates cannot
  // bypass the aggregate cap by misreporting scan/refinement call counts.
  const pointMethod = provider.getUnwrappedAspectResidual.bind(provider);
  const enclosureMethod = provider.getUnwrappedResidualEnclosure.bind(provider);
  let nextIndex = 0;
  let running = false;
  let failed = false;
  let providerCallCount = 0;
  const fixedCapabilities = Object.freeze({ ...capabilities });
  if (typeof input.prepareCandidates !== 'function')
    reject('MISSING_PIPELINE', 'An explicitly injected F5 prepareCandidates function is required');
  const prepareCandidates = input.prepareCandidates;
  return async function runChunk(request) {
    if (running || failed || nextIndex >= plan.chunks.length)
      reject('PIPELINE_SEQUENCE_ERROR', 'F5 chunks must run once, sequentially, without retry after failure');
    if (signal?.aborted) {
      failed = true;
      reject('SEARCH_CANCELLED', 'F5 search cancelled before starting a chunk');
    }
    object(request, 'request');
    const expected = plan.chunks[nextIndex];
    if (ownRequestData(request, 'chunkIndex') !== expected.index ||
        ownRequestData(request, 'startUtc') !== expected.startUtc ||
        ownRequestData(request, 'endUtc') !== expected.endUtc)
      reject('INCOMPATIBLE_CHUNK_REQUEST', 'F5 request does not match the prevalidated UTC chunk');
    verifyRequestIdentity(request, identity);
    running = true;
    // Each chunk owns a separate provider facade. Late calls retaining a
    // previous facade must not acquire authority over the next chunk.
    const chunkController = new AbortController();
    let chunkOpen = true;
    let timeoutId;
    let onAbort;
    let stopError = null;
    let stopReject;
    const stopped = new Promise((_, rejectPromise) => { stopReject = rejectPromise; });
    function stop(code, message) {
      if (stopError) return;
      stopError = new AstrologyError(code, message);
      failed = true;
      chunkController.abort(stopError);
      stopReject(stopError);
    }
    function budgeted(method) {
      return async function providerCall(request) {
        if (!chunkOpen || !running || failed || chunkController.signal.aborted)
          reject('PIPELINE_SEQUENCE_ERROR', 'F5 provider call is outside its owning active search chunk');
        if (providerCallCount >= maxTotalProviderCalls) {
          // Reject the raced chunk immediately even if prepareCandidates catches
          // the provider error and never settles. Never return partial results.
          stop('GLOBAL_PIPELINE_BUDGET', 'F5 aggregate provider-call cap exhausted');
          throw stopError;
        }
        // Reserve before each call; errors consume budget across chunks.
        providerCallCount++;
        // Optional second argument for cooperative interruption; the strict
        // PR #21 astronomical request object remains unchanged.
        return method(request, chunkController.signal);
      };
    }
    const chunkProvider = Object.freeze({
      capabilities: fixedCapabilities,
      getUnwrappedAspectResidual: budgeted(pointMethod),
      getUnwrappedResidualEnclosure: budgeted(enclosureMethod),
    });
    // Attach the cancellation listener before scheduling any pipeline work.
    // Check the signal again after attachment to avoid missing a race.
    if (signal) {
      onAbort = () => stop('SEARCH_CANCELLED', 'F5 search cancelled');
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) onAbort();
    }
    if (!failed && chunkTimeoutMs !== undefined)
      timeoutId = setTimeout(() => stop('CHUNK_TIMEOUT', 'F5 chunk exceeded its wall-clock deadline'), chunkTimeoutMs);
    try {
      const work = Promise.resolve().then(() => {
        if (failed) throw stopError;
        // No chunkIndex forwarded: it is not part of the PR #21 contract.
        return prepareCandidates(Object.freeze({
          startUtc: expected.startUtc, endUtc: expected.endUtc,
          ...identity,
          targetIntervalMs, maxDepth, maxProviderCalls,
          provider: chunkProvider, refinement: r,
        }));
      });
      // Promise.race rejects on timeout/abort even if a provider promise never
      // settles. The losing work promise stays observed, preventing unhandled
      // rejection; its underlying work is only stopped if the provider cooperates.
      const result = await Promise.race([work, stopped]);
      // A broken callback may swallow a global budget violation. Reject it.
      if (failed)
        throw stopError ?? new AstrologyError('GLOBAL_PIPELINE_BUDGET', 'F5 aggregate provider-call cap exhausted');
      nextIndex++;
      return result;
    } catch (error) {
      failed = true;
      chunkController.abort(error);
      throw error;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
      chunkOpen = false;
      running = false;
    }
  };
}
