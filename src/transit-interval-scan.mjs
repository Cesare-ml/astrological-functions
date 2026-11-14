/**
 * Experimental adaptive candidate search for SKY_TO_NATAL exact-aspect residuals.
 * No astronomical calculation; continuous interval coverage is provider-asserted,
 * NOT independently verified here. Missing/tangential roots stay unresolved.
 */
import { AstrologyError } from './index.mjs';

const VERSION = '0.1.0-experimental';
const POINT_COVERAGE = 'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED';
const RANGE_COVERAGE = 'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES';
const KEYS = ['engineVersion', 'kernelSetId', 'timeModel'];

function error(code, message) { throw new AstrologyError(code, message); }
function obj(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) error(code, 'Object required');
  return value;
}
function utc(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19))
    error('INVALID_UTC', 'Valid UTC instant with Z required');
  return Date.parse(value);
}
function identifier(value) {
  if (typeof value !== 'string' || !value.trim()) error('INVALID_ARGUMENT', 'Nonempty identifier required');
  return value;
}
function number(value) { return typeof value === 'number' && Number.isFinite(value); }

/**
 * Produces candidate sign-changing intervals, sampled zeros, and unresolved intervals.
 * A missing result is NEVER evidence of no transit without validated range bounds.
 */
export async function scanTransitAspectCandidateIntervals(input) {
  obj(input, 'INVALID_ARGUMENT');
  const startMs = utc(input.startUtc);
  const endMs = utc(input.endUtc);
  if (endMs <= startMs || endMs - startMs > 31 * 86400000)
    error('INVALID_INTERVAL', 'Interval must be ordered and at most 31 days');
  const widthMs = input.targetIntervalMs;
  const maxDepth = input.maxDepth;
  const maxProviderCalls = input.maxProviderCalls;
  if (!Number.isSafeInteger(widthMs) || widthMs < 1 || widthMs > endMs - startMs ||
      !Number.isSafeInteger(maxDepth) || maxDepth < 0 || maxDepth > 24 ||
      !Number.isSafeInteger(maxProviderCalls) || maxProviderCalls < 1 || maxProviderCalls > 4096)
    error('INVALID_LIMIT', 'Explicit safe target width, depth and call budget required');
  const skyBodyName = identifier(input.skyBodyName);
  const natalBodyName = identifier(input.natalBodyName);
  const aspectId = identifier(input.aspectId);
  const exactAngleDeg = input.exactAngleDeg;
  const orientation = input.orientation;
  if (!number(exactAngleDeg) || exactAngleDeg < 0 || exactAngleDeg > 180 ||
      !['POSITIVE', 'NEGATIVE'].includes(orientation))
    error('INVALID_ASPECT', 'Explicit 0..180 angle and oriented branch required');
  const provenanceInput = obj(input.ephemerisProvenance, 'MISSING_PROVENANCE');
  const ephemerisProvenance = Object.freeze(Object.fromEntries(KEYS.map(key =>
    [key, identifier(provenanceInput[key])])));
  const provider = obj(input.provider, 'MISSING_PROVIDER');
  const caps = obj(provider.capabilities, 'UNSUPPORTED_COVERAGE');
  if (caps.contractVersion !== VERSION || caps.coverage !== POINT_COVERAGE ||
      caps.enclosureCoverage !== RANGE_COVERAGE || caps.stationCoverage !== 'INCLUDED' ||
      caps.numericErrorCoverage !== 'INCLUDED' || caps.center !== 'EARTH' ||
      caps.frame !== 'ECLIPTIC_OF_DATE' || caps.corrections !== 'APPARENT' ||
      typeof provider.getUnwrappedAspectResidual !== 'function' ||
      typeof provider.getUnwrappedResidualEnclosure !== 'function')
    error('UNSUPPORTED_COVERAGE', 'Continuous point and all-time interval range capabilities required');
  const pointMethod = provider.getUnwrappedAspectResidual.bind(provider);
  const rangeMethod = provider.getUnwrappedResidualEnclosure.bind(provider);
  const fixed = Object.freeze({ skyBodyName, natalBodyName, aspectId,
    exactAngleDeg, orientation, ephemerisProvenance });
  let providerCalls = 0;
  let excludedIntervals = 0;
  let inspectedIntervals = 0;
  const signChangeCandidates = [];
  const unresolvedIntervals = [];
  const zeros = new Map();
  const cache = new Map();
  const iso = ms => new Date(ms).toISOString();
  function budget() {
    if (providerCalls >= maxProviderCalls)
      error('SEARCH_BUDGET_EXHAUSTED', 'Search cannot be completed within the provider-call budget');
    providerCalls++;
  }
  function metadata(value, isRange) {
    const m = obj(value, 'INCOMPATIBLE_EPHEMERIS');
    if (m.center !== 'EARTH' || m.frame !== 'ECLIPTIC_OF_DATE' ||
        m.corrections !== 'APPARENT' || m.coverage !== POINT_COVERAGE ||
        KEYS.some(key => m[key] !== ephemerisProvenance[key]) ||
        (isRange && (m.enclosureCoverage !== RANGE_COVERAGE ||
          m.stationCoverage !== 'INCLUDED' || m.numericErrorCoverage !== 'INCLUDED')))
      error('INCOMPATIBLE_EPHEMERIS', 'Provider metadata disagrees with search requirements');
  }
  async function point(ms) {
    if (cache.has(ms)) return cache.get(ms);
    const datetimeUtc = iso(ms);
    budget();
    const request = Object.freeze({ ...fixed, datetimeUtc });
    const result = obj(await pointMethod(request), 'INVALID_RESIDUAL');
    if (result.datetimeUtc !== datetimeUtc || !number(result.residualDeg))
      error('INVALID_RESIDUAL', 'Finite residual and exact UTC echo required');
    metadata(result.metadata, false);
    cache.set(ms, result.residualDeg);
    if (result.residualDeg === 0) zeros.set(datetimeUtc, Object.freeze({datetimeUtc, residualDeg:0}));
    return result.residualDeg;
  }
  async function range(left, right) {
    const startUtc = iso(left), endUtc = iso(right);
    budget();
    const request = Object.freeze({ ...fixed, startUtc, endUtc });
    const result = obj(await rangeMethod(request), 'INVALID_ENCLOSURE');
    if (result.startUtc !== startUtc || result.endUtc !== endUtc ||
        !number(result.lowerDeg) || !number(result.upperDeg) || result.lowerDeg > result.upperDeg)
      error('INVALID_ENCLOSURE', 'Finite, ordered range and exact interval echo required');
    metadata(result.metadata, true);
    return Object.freeze({lowerDeg: result.lowerDeg, upperDeg: result.upperDeg});
  }
  const pending = [{left:startMs, right:endMs, depth:0}];
  while (pending.length) {
    const {left, right, depth} = pending.pop();
    const bounds = await range(left, right);
    inspectedIntervals++;
    if (bounds.lowerDeg > 0 || bounds.upperDeg < 0) { excludedIntervals++; continue; }
    const mid = left + Math.floor((right-left)/2);
    if (right - left > widthMs && depth < maxDepth && mid > left && mid < right) {
      // Stack is LIFO; push the right interval first for chronological results.
      pending.push({left:mid, right, depth:depth+1});
      pending.push({left, right:mid, depth:depth+1});
      continue;
    }
    const startResidualDeg = await point(left);
    const endResidualDeg = await point(right);
    if (startResidualDeg < bounds.lowerDeg || startResidualDeg > bounds.upperDeg ||
        endResidualDeg < bounds.lowerDeg || endResidualDeg > bounds.upperDeg)
      error('INVALID_ENCLOSURE', 'Sampled endpoints violate asserted all-time bounds');
    const segment = Object.freeze({startUtc:iso(left), endUtc:iso(right),
      startResidualDeg, endResidualDeg, lowerDeg:bounds.lowerDeg, upperDeg:bounds.upperDeg});
    if ((startResidualDeg < 0 && endResidualDeg > 0) ||
        (startResidualDeg > 0 && endResidualDeg < 0))
      signChangeCandidates.push(segment);
    else unresolvedIntervals.push(Object.freeze({ ...segment,
      reason: right-left > widthMs ? 'MAX_DEPTH_REACHED' : 'POSSIBLE_TANGENCY_OR_MULTIPLE_ROOTS' }));
  }
  return Object.freeze({contract:'TransitAspectCandidateIntervals', contractVersion:VERSION,
    direction:'SKY_TO_NATAL', skyBodyName, natalBodyName, aspectId, exactAngleDeg, orientation,
    startUtc:iso(startMs), endUtc:iso(endMs), targetIntervalMs:widthMs, maxDepth,
    ephemerisProvenance, providerCalls, inspectedIntervals, excludedIntervals,
    signChangeCandidates:Object.freeze(signChangeCandidates),
    sampledZeros:Object.freeze([...zeros.values()].sort((a,b)=>a.datetimeUtc.localeCompare(b.datetimeUtc))),
    unresolvedIntervals:Object.freeze(unresolvedIntervals),
    verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    completeness:'CONDITIONAL_ON_CALLER_ENCLOSURES_NOT_SCIENTIFICALLY_VALIDATED'});
}
