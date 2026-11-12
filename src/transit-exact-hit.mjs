/**
 * Experimental, fail-closed bisection of a caller-supplied continuous, unwrapped
 * transit-aspect residual. No ephemeris calculation and no event discovery.
 */
import { AstrologyError } from './index.mjs';

const VERSION = '0.1.0-experimental';
const COVERAGE = 'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED';
const PROVENANCE_KEYS = ['engineVersion', 'kernelSetId', 'timeModel'];
const MAX_SPAN_MS = 31 * 86400000;

function fail(code, message) { throw new AstrologyError(code, message); }
function object(value, code, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, message);
  return value;
}
function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
function instant(utc, label) {
  if (typeof utc !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(utc) ||
      !Number.isFinite(Date.parse(utc)) ||
      new Date(utc).toISOString().slice(0, 19) !== utc.slice(0, 19))
    fail('INVALID_UTC', `${label} must be a real ISO-8601 UTC instant`);
  return Date.parse(utc);
}
function name(value, label) {
  if (typeof value !== 'string' || !value.trim())
    fail('INVALID_ARGUMENT', `${label} must be a nonempty identifier`);
  return value;
}
function provenanceSnapshot(value) {
  object(value, 'MISSING_PROVENANCE', 'Pinned ephemeris provenance is required');
  const result = Object.create(null);
  for (const key of PROVENANCE_KEYS) {
    result[key] = name(value[key], `ephemerisProvenance.${key}`);
  }
  return Object.freeze(result);
}
function providerGate(provider) {
  object(provider, 'MISSING_PROVIDER', 'Explicit residual evaluator is required');
  const caps = object(provider.capabilities, 'UNSUPPORTED_COVERAGE', 'Provider capabilities are required');
  if (typeof provider.getUnwrappedAspectResidual !== 'function' ||
      caps.contractVersion !== VERSION || caps.coverage !== COVERAGE ||
      caps.center !== 'EARTH' || caps.frame !== 'ECLIPTIC_OF_DATE' || caps.corrections !== 'APPARENT')
    fail('UNSUPPORTED_COVERAGE', 'Continuous unwrapped apparent Earth-centered residual capability required');
}

/**
 * Refine exactly ONE bracketed, sign-changing root of an unwrapped residual.
 * Continuous coverage is *asserted by the provider*, never verified here.
 */
export async function refineBracketedTransitAspectHit(input) {
  object(input, 'INVALID_ARGUMENT', 'Search options must be an object');
  const startMs = instant(input.startUtc, 'startUtc');
  const endMs = instant(input.endUtc, 'endUtc');
  if (endMs <= startMs || endMs - startMs > MAX_SPAN_MS)
    fail('INVALID_INTERVAL', 'Ordered interval must be positive and at most 31 days');
  const skyBodyName = name(input.skyBodyName, 'skyBodyName');
  const natalBodyName = name(input.natalBodyName, 'natalBodyName');
  const aspectId = name(input.aspectId, 'aspectId');
  if (!finite(input.exactAngleDeg) || input.exactAngleDeg < 0 || input.exactAngleDeg > 180 ||
      !['POSITIVE', 'NEGATIVE'].includes(input.orientation))
    fail('INVALID_ASPECT', 'Explicit 0..180 aspect angle and POSITIVE/NEGATIVE orientation required');
  if (!Number.isSafeInteger(input.timeToleranceMs) || input.timeToleranceMs < 1 ||
      input.timeToleranceMs > endMs - startMs ||
      !finite(input.residualToleranceDeg) || input.residualToleranceDeg <= 0 || input.residualToleranceDeg > 1 ||
      !Number.isSafeInteger(input.maxIterations) || input.maxIterations < 1 || input.maxIterations > 128)
    fail('INVALID_LIMIT', 'Explicit bounded iteration, time and residual tolerances required');
  // Snapshot all caller-controlled limits before the first asynchronous provider call.
  const timeToleranceMs = input.timeToleranceMs;
  const residualToleranceDeg = input.residualToleranceDeg;
  const maxIterations = input.maxIterations;
  const provenance = provenanceSnapshot(input.ephemerisProvenance);
  providerGate(input.provider);
  const evaluator = input.provider.getUnwrappedAspectResidual.bind(input.provider);
  const fixed = Object.freeze({ skyBodyName, natalBodyName, aspectId,
    exactAngleDeg: input.exactAngleDeg, orientation: input.orientation,
    ephemerisProvenance: provenance });
  let evaluations = 0;
  async function sample(ms) {
    const datetimeUtc = new Date(ms).toISOString();
    const request = Object.freeze({ ...fixed, datetimeUtc });
    const result = object(await evaluator(request), 'INVALID_RESIDUAL', 'Provider must return a residual result');
    evaluations++;
    if (result.datetimeUtc !== datetimeUtc || !finite(result.residualDeg))
      fail('INVALID_RESIDUAL', 'Residual must be finite and echoed for requested UTC');
    const metadata = object(result.metadata, 'INCOMPATIBLE_EPHEMERIS', 'Residual metadata is required');
    if (metadata.center !== 'EARTH' || metadata.frame !== 'ECLIPTIC_OF_DATE' ||
        metadata.corrections !== 'APPARENT' || metadata.coverage !== COVERAGE ||
        PROVENANCE_KEYS.some(key => metadata[key] !== provenance[key]))
      fail('INCOMPATIBLE_EPHEMERIS', 'Residual provenance/frame/coverage mismatch');
    return result.residualDeg;
  }
  function output(ms, residualDeg, iterations, leftMs, rightMs, status) {
    return Object.freeze({ contract: 'BracketedTransitAspectHit', contractVersion: VERSION,
      status, direction: 'SKY_TO_NATAL', skyBodyName, natalBodyName, aspectId,
      exactAngleDeg: fixed.exactAngleDeg, orientation: fixed.orientation,
      datetimeUtc: new Date(ms).toISOString(), residualDeg,
      bracketStartUtc: new Date(leftMs).toISOString(), bracketEndUtc: new Date(rightMs).toISOString(),
      iterations, evaluations, timeToleranceMs,
      residualToleranceDeg,
      ephemerisProvenance: provenance, coverage: COVERAGE,
      verification: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED' });
  }
  let leftMs = startMs, rightMs = endMs;
  let left = await sample(leftMs);
  if (Math.abs(left) <= residualToleranceDeg)
    return output(leftMs, left, 0, leftMs, leftMs, 'SAMPLED_WITHIN_RESIDUAL_TOLERANCE');
  let right = await sample(rightMs);
  if (Math.abs(right) <= residualToleranceDeg)
    return output(rightMs, right, 0, rightMs, rightMs, 'SAMPLED_WITHIN_RESIDUAL_TOLERANCE');
  if (Math.sign(left) === Math.sign(right))
    fail('ROOT_NOT_BRACKETED', 'Endpoints do not show a residual sign change');
  for (let iterations = 1; iterations <= maxIterations; iterations++) {
    const middleMs = leftMs + Math.floor((rightMs - leftMs) / 2);
    if (middleMs <= leftMs || middleMs >= rightMs)
      fail('NON_CONVERGENCE', 'No representable millisecond remains within the root bracket');
    const middle = await sample(middleMs);
    if (middle === 0)
      return output(middleMs, middle, iterations, middleMs, middleMs, 'SAMPLED_ZERO');
    if (Math.sign(middle) === Math.sign(left)) { leftMs = middleMs; left = middle; }
    else { rightMs = middleMs; right = middle; }
    if (rightMs - leftMs <= timeToleranceMs &&
        Math.abs(middle) <= residualToleranceDeg)
      return output(middleMs, middle, iterations, leftMs, rightMs, 'BRACKETED_APPROXIMATION');
  }
  fail('NON_CONVERGENCE', 'Iteration budget exhausted without both tolerances');
}
