/**
 * Facts-only compatibility bridge for experimental F5 transit pipeline reports.
 * A refined candidate or sampled zero is NOT a certified astronomical event.
 * No ephemeris code, root solver or event-time deduplication lives here.
 */
import { AstrologyError } from './index.mjs';
import { splitUtcSearchWindow } from './utc-search-window-chunks.mjs';

const VERSION = '0.1.0-experimental';
const COMPLETENESS = 'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE';
const VERIFICATION = 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';

function invalid(code, message) { throw new AstrologyError(code, message); }
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid('INVALID_ARGUMENT', `${name} must be an object`);
  return value;
}
function ownData(value, name) {
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (!descriptor || !Object.hasOwn(descriptor, 'value'))
    invalid('INVALID_PIPELINE_REPORT', `Pipeline report must expose ${name} as a data property`);
  return descriptor.value;
}
function safeNonnegative(value, field) {
  if (!Number.isSafeInteger(value) || value < 0)
    invalid('INVALID_PIPELINE_REPORT', `${field} must be a nonnegative safe integer`);
  return value;
}
function safeTotal(a, b, field) {
  const sum = a + b;
  if (!Number.isSafeInteger(sum))
    invalid('REPORT_COUNTER_OVERFLOW', `${field} cumulative count exceeds safe integer range`);
  return sum;
}
function nonempty(value, label) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim())
    invalid('INVALID_TRANSIT_IDENTITY', `${label} must be an explicit nonempty name`);
  return value;
}
function identitySnapshot(value) {
  const source = object(value, 'identity');
  const skyBodyName = nonempty(source.skyBodyName, 'skyBodyName');
  const natalBodyName = nonempty(source.natalBodyName, 'natalBodyName');
  const aspectId = nonempty(source.aspectId, 'aspectId');
  if (typeof source.exactAngleDeg !== 'number' || !Number.isFinite(source.exactAngleDeg) ||
      source.exactAngleDeg < 0 || source.exactAngleDeg > 180 ||
      !['POSITIVE', 'NEGATIVE'].includes(source.orientation))
    invalid('INVALID_TRANSIT_IDENTITY', 'Explicit aspect angle and orientation are required');
  const p = object(source.ephemerisProvenance, 'ephemerisProvenance');
  const ephemerisProvenance = Object.freeze({
    engineVersion: nonempty(p.engineVersion, 'engineVersion'),
    kernelSetId: nonempty(p.kernelSetId, 'kernelSetId'),
    timeModel: nonempty(p.timeModel, 'timeModel'),
  });
  return Object.freeze({ skyBodyName, natalBodyName, aspectId,
    exactAngleDeg: source.exactAngleDeg, orientation: source.orientation, ephemerisProvenance });
}

/**
 * Calls an injected experimental F5 pipeline once per UTC chunk, sequentially.
 * Aggregates only auditable counts and uncertainty flags; NEVER invents events.
 * The callback should invoke prepareTransitAspectEventCandidates (draft PR #21).
 */
export async function collectTransitChunkCandidateReports(input) {
  object(input, 'input');
  const raw = object(input.windowInput, 'windowInput');
  const windowInput = Object.freeze({startUtc:raw.startUtc, endUtc:raw.endUtc,
    maxDurationMs:raw.maxDurationMs, chunkDurationMs:raw.chunkDurationMs, maxChunks:raw.maxChunks});
  const plan = splitUtcSearchWindow(windowInput);
  const identity = identitySnapshot(input.identity);
  const maxCandidateRecords = input.maxCandidateRecords;
  if (!Number.isSafeInteger(maxCandidateRecords) || maxCandidateRecords < 1 || maxCandidateRecords > 16384)
    invalid('INVALID_REPORT_LIMIT', 'maxCandidateRecords must be an explicit integer in 1..16384');
  if (typeof input.runChunk !== 'function')
    invalid('MISSING_PIPELINE', 'Explicit experimental F5 runChunk callback required');
  const runChunk = input.runChunk;
  let totalCandidates = 0, totalSampledZeros = 0, totalUnresolved = 0;
  let totalScanCalls = 0, totalRefinementCalls = 0;
  const reports = [];
  for (const chunk of plan.chunks) {
    const request = Object.freeze({chunkIndex:chunk.index,
      startUtc:chunk.startUtc, endUtc:chunk.endUtc,
      skyBodyName:identity.skyBodyName, natalBodyName:identity.natalBodyName,
      aspectId:identity.aspectId, exactAngleDeg:identity.exactAngleDeg,
      orientation:identity.orientation, ephemerisProvenance:identity.ephemerisProvenance});
    const report = await runChunk(request);
    if (!report || typeof report !== 'object' || Array.isArray(report))
      invalid('INVALID_PIPELINE_REPORT', 'F5 pipeline report must be an object');
    const exact = {
      contract:'TransitAspectEventCandidates', contractVersion:VERSION,
      direction:'SKY_TO_NATAL', startUtc:chunk.startUtc, endUtc:chunk.endUtc,
      skyBodyName:identity.skyBodyName, natalBodyName:identity.natalBodyName,
      aspectId:identity.aspectId, exactAngleDeg:identity.exactAngleDeg,
      orientation:identity.orientation, completeness:COMPLETENESS,
      verification:VERIFICATION, scientificallyValidated:false,
    };
    for (const [field, expected] of Object.entries(exact))
      if (ownData(report, field) !== expected)
        invalid('INCOMPATIBLE_PIPELINE_REPORT', `Unexpected F5 ${field}`);
    const provenance = ownData(report, 'ephemerisProvenance');
    if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance) ||
        ['engineVersion', 'kernelSetId', 'timeModel'].some(key =>
          ownData(provenance, key) !== identity.ephemerisProvenance[key]))
      invalid('INCOMPATIBLE_PIPELINE_REPORT', 'Mismatched F5 engine/kernel/time-model provenance');
    const refined = ownData(report, 'refinedCandidates');
    const zeros = ownData(report, 'sampledZeros');
    const unresolved = ownData(report, 'unresolvedIntervals');
    if (!Array.isArray(refined) || !Array.isArray(zeros) || !Array.isArray(unresolved))
      invalid('INVALID_PIPELINE_REPORT', 'F5 candidate and unresolved collections must be arrays');
    if (ownData(report, 'hasUnresolvedIntervals') !== (unresolved.length > 0))
      invalid('INCOMPATIBLE_PIPELINE_REPORT', 'Contradictory unresolved-interval status');
    const count = refined.length + zeros.length + unresolved.length;
    if (count > maxCandidateRecords - (totalCandidates + totalSampledZeros + totalUnresolved))
      invalid('REPORT_BUDGET_EXCEEDED', 'F5 report record budget exhausted');
    const scanCalls = safeNonnegative(ownData(report, 'scanProviderCalls'), 'scanProviderCalls');
    const refinementCalls = safeNonnegative(ownData(report, 'refinementProviderCalls'), 'refinementProviderCalls');
    const inspected = safeNonnegative(ownData(report, 'inspectedIntervals'), 'inspectedIntervals');
    const excluded = safeNonnegative(ownData(report, 'excludedIntervals'), 'excludedIntervals');
    if (excluded > inspected)
      invalid('INVALID_PIPELINE_REPORT', 'Excluded interval count exceeds inspected intervals');
    totalCandidates += refined.length;
    totalSampledZeros += zeros.length;
    totalUnresolved += unresolved.length;
    totalScanCalls = safeTotal(totalScanCalls, scanCalls, 'scanProviderCalls');
    totalRefinementCalls = safeTotal(totalRefinementCalls, refinementCalls, 'refinementProviderCalls');
    reports.push(Object.freeze({chunkIndex:chunk.index, startUtc:chunk.startUtc,
      endUtc:chunk.endUtc, refinedCandidateCount:refined.length,
      sampledZeroCount:zeros.length, unresolvedIntervalCount:unresolved.length,
      hasUnresolvedIntervals:unresolved.length > 0, scanProviderCalls:scanCalls,
      refinementProviderCalls:refinementCalls, inspectedIntervals:inspected,
      excludedIntervals:excluded}));
  }
  return Object.freeze({contract:'ChunkedTransitCandidateReportSummary',
    contractVersion:VERSION, direction:'SKY_TO_NATAL', window:plan.window,
    identity, chunkCount:reports.length, reports:Object.freeze(reports),
    totals:Object.freeze({refinedCandidateCount:totalCandidates,
      sampledZeroCount:totalSampledZeros, unresolvedIntervalCount:totalUnresolved,
      scanProviderCalls:totalScanCalls, refinementProviderCalls:totalRefinementCalls}),
    verification:VERIFICATION, scientificallyValidated:false,
    completeness:COMPLETENESS});
}
