import test from 'node:test';
import assert from 'node:assert/strict';
import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';
import { makeTransitChunkPipelineRunner } from '../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from '../src/transit-chunk-candidate-reports.mjs';

const instant = datetimeUtc => ({
  datetimeUtc, calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC',
});
const input = (start, end, maxDurationMs) => ({
  interval: {start: instant(start), end: instant(end)}, maxDurationMs,
});
const identity = () => ({
  skyBodyName: 'Mars', natalBodyName: 'Sun', aspectId: 'square',
  exactAngleDeg: 90, orientation: 'POSITIVE',
  ephemerisProvenance: {engineVersion: 'SYNTHETIC', kernelSetId: 'TEST', timeModel: 'UTC-test'},
});
const capabilities = () => ({
  contractVersion: '0.1.0-experimental',
  coverage: 'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage: 'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage: 'INCLUDED', numericErrorCoverage: 'INCLUDED',
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
});
const provider = () => ({
  capabilities: capabilities(),
  async getUnwrappedAspectResidual() { return null; },
  async getUnwrappedResidualEnclosure() { return null; },
});
const refinement = () => ({
  timeToleranceMs: 1, residualToleranceDeg: 0.0001, maxIterations: 16,
  maxCandidateRefinements: 8, maxRefinementCalls: 12,
});
const windowInput = (options, chunkDurationMs, maxChunks) => ({
  ...toF5MillisecondWindowInput(options), chunkDurationMs, maxChunks,
});
function report(request, overrides = {}) {
  return {
    contract: 'TransitAspectEventCandidates', contractVersion: '0.1.0-experimental',
    direction: 'SKY_TO_NATAL', startUtc: request.startUtc, endUtc: request.endUtc,
    skyBodyName: request.skyBodyName, natalBodyName: request.natalBodyName,
    aspectId: request.aspectId, exactAngleDeg: request.exactAngleDeg,
    orientation: request.orientation, ephemerisProvenance: request.ephemerisProvenance,
    refinedCandidates: [], sampledZeros: [], unresolvedIntervals: [],
    hasUnresolvedIntervals: false, scanProviderCalls: 2, refinementProviderCalls: 1,
    inspectedIntervals: 2, excludedIntervals: 1,
    completeness: 'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE',
    verification: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    scientificallyValidated: false, ...overrides,
  };
}
function makeConfig(window, prepareCandidates, options = {}) {
  return {
    windowInput: window, identity: identity(),
    scan: {targetIntervalMs: 1, maxDepth: 8, maxProviderCalls: 20},
    refinement: refinement(), provider: provider(), maxTotalProviderCalls: 64,
    prepareCandidates, ...options,
  };
}
const code = name => error => error?.code === name;

test('F1 UTC endpoints feed F5 report adapter across leap day with no certified event', async () => {
  const window = windowInput(input('2024-02-29T23:59:59.998000000Z',
    '2024-03-01T00:00:00.002Z', 4), 2, 2);
  const requests = [];
  const config = makeConfig(window, async request => {
    requests.push(request);
    assert.ok(Object.isFrozen(request) && Object.isFrozen(request.refinement));
    const seam = '2024-03-01T00:00:00.000Z';
    return report(request, request.startUtc.endsWith('59.998Z')
      ? {sampledZeros: [{datetimeUtc: seam}]}
      : {unresolvedIntervals: [{reason: 'MAY_HAVE_TANGENCY'}], hasUnresolvedIntervals: true});
  });
  const summary = await collectTransitChunkCandidateReports({
    windowInput: window, identity: identity(), maxCandidateRecords: 4,
    runChunk: makeTransitChunkPipelineRunner(config),
  });
  assert.deepEqual(requests.map(x => x.startUtc), [
    '2024-02-29T23:59:59.998Z', '2024-03-01T00:00:00.000Z',
  ]);
  assert.equal(summary.chunkCount, 2);
  assert.equal(summary.totals.sampledZeroCount, 1);
  assert.equal(summary.totals.unresolvedIntervalCount, 1);
  assert.equal(summary.totals.scanProviderCalls, 4);
  assert.equal(summary.scientificallyValidated, false);
  assert.equal(Object.hasOwn(summary, 'hits'), false);
  assert.equal(Object.hasOwn(summary, 'eventTimes'), false);
  assert.ok(Object.isFrozen(summary.reports) && Object.isFrozen(summary.totals));
});

test('F1 rejects sub-millisecond input before any pipeline preparation', () => {
  let calls = 0;
  const prepare = async request => { calls++; return report(request); };
  assert.throws(() => windowInput(input('2026-11-14T00:00:00.000000001Z',
    '2026-11-14T00:00:01Z', 1000), 500, 2), code('UNSUPPORTED_UTC_PRECISION'));
  assert.equal(calls, 0);
  void prepare;
});

test('F5 rejects a too-short duration cap before invoking provisional report callback', async () => {
  const window = windowInput(input('2026-11-14T00:00:00Z',
    '2026-11-14T00:00:02Z', 1), 1000, 2);
  let calls = 0;
  await assert.rejects(() => collectTransitChunkCandidateReports({
    windowInput: window, identity: identity(), maxCandidateRecords: 2,
    runChunk: async () => { calls++; return {}; },
  }), code('INTERVAL_TOO_LONG'));
  assert.equal(calls, 0);
});

test('F5 refuses unvalidated geometric/J2000 provider before any callback', () => {
  const window = windowInput(input('2026-11-14T00:00:00Z',
    '2026-11-14T00:00:00.004Z', 4), 2, 2);
  let calls = 0;
  const poisoned = provider();
  poisoned.capabilities.frame = 'J2000';
  assert.throws(() => makeTransitChunkPipelineRunner(makeConfig(window,
    async request => { calls++; return report(request); }, {provider: poisoned})),
  code('UNSUPPORTED_COVERAGE'));
  assert.equal(calls, 0);
});

test('F5 pipeline report cannot claim scientific validation', async () => {
  const window = windowInput(input('2026-11-14T00:00:00Z',
    '2026-11-14T00:00:00.004Z', 4), 2, 2);
  let calls = 0;
  await assert.rejects(() => collectTransitChunkCandidateReports({
    windowInput: window, identity: identity(), maxCandidateRecords: 4,
    runChunk: makeTransitChunkPipelineRunner(makeConfig(window, async request => {
      calls++;
      return report(request, {scientificallyValidated: true});
    })),
  }), code('INCOMPATIBLE_PIPELINE_REPORT'));
  assert.equal(calls, 1);
});

test('F5 keeps identity and source provenance pinned across async caller mutation', async () => {
  const window = windowInput(input('2026-11-14T00:00:00Z',
    '2026-11-14T00:00:00.004Z', 4), 2, 2);
  const id = identity();
  const seen = [];
  const config = makeConfig(window, async request => {
    seen.push(request.ephemerisProvenance.engineVersion);
    if (seen.length === 1) {
      id.skyBodyName = 'Venus';
      id.ephemerisProvenance.engineVersion = 'CHANGED';
      config.provider.capabilities.frame = 'J2000';
    }
    return report(request);
  });
  const summary = await collectTransitChunkCandidateReports({
    windowInput: window, identity: id, maxCandidateRecords: 4,
    runChunk: makeTransitChunkPipelineRunner(config),
  });
  assert.deepEqual(seen, ['SYNTHETIC', 'SYNTHETIC']);
  assert.equal(summary.identity.skyBodyName, 'Mars');
  assert.equal(summary.identity.ephemerisProvenance.engineVersion, 'SYNTHETIC');
  assert.equal(summary.scientificallyValidated, false);
});
