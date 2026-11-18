import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRegoloRecordedNewMoon} from '../src/regolo-moon-event-candidate.mjs';
import {calculateRegoloLotsFromAstronomicalFacts} from
  '../src/regolo-lots-astronomy-bridge.mjs';

const sha = 'a'.repeat(64);
const pin = Object.freeze({engineId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'mock-native', kernelSetId: 'de441-mock', timeModelId: 'mock-time'});
const observer = {latitudeDeg: 44, longitudeDegEast: 11, elevationMeters: 40};
const t = '2026-11-18T12:00:00Z';
const record = {body: 'Moon', source_id: 146,
  cycle_start_utc: '2026-11-10T01:00:00.000000Z',
  next_cycle_start_utc: '2026-12-09T00:00:00.000000Z',
  phase_thresholds_utc: [],
  phase: {code: 'CRESC1', started_at_utc: '2026-11-10T01:00:00.000000Z',
    status: 'derived_from_recorded_thresholds'},
  coverage: {status: 'unreviewed', warnings: ['no_reviewed_coverage_policy']},
  status: 'recorded'};
const snapshot = {requested_at_utc: '2026-11-18T12:00:00.000000Z',
  dataset: {id: null, sha256: sha, format: 'VSEPH-P0', coverage_certified: false},
  synods: {Moon: record}, new_moon: structuredClone(record)};
const calls = [];
const engine = {calcUt(jd, body, flags) {
  calls.push({jd, body, flags});
  return {xx: [body === 0 ? 359.9 : 0.05, 0, 1, 0, 0, 0],
    rflag: 1, timeSource: 'MOCK_TIME'};
}};
const base = {datetimeUtc: t, snapshot, expectedDatasetSha256: sha,
  expectedEphemeris: pin, ut1MinusUtcAtEventSeconds: 0.25,
  expectedTimeSource: 'MOCK_TIME', maxConjunctionResidualDeg: 0.25, engine};

function rejects(input, code) {
  assert.throws(() => inspectRegoloRecordedNewMoon(input),
    error => error?.name === 'AstrologyError' && error.code === code,
    `Expected ${code}`);
}

test('recorded Python P0 Moon + Rust calcUt produce a diagnostic candidate only', () => {
  calls.length = 0;
  const result = inspectRegoloRecordedNewMoon(base);
  assert.equal(result.status, 'CANDIDATE_UNREVIEWED_COVERAGE');
  assert.deepEqual(result.precedingNewMoon,
    {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'});
  assert.equal(result.candidate.sourceRowId, 146);
  assert.ok(Math.abs(result.candidate.signedGapDeg - 0.15) < 1e-8);
  assert.ok(Math.abs(result.candidate.conjunctionResidualDeg - 0.15) < 1e-8);
  assert.deepEqual(calls.map(c => [c.body, c.flags]), [[0, 0], [1, 0]]);
  assert.equal(calls[0].jd, calls[1].jd);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.candidate));
  assert.ok(result.warnings.includes('P0_ARCHIVE_COVERAGE_UNREVIEWED'));
});

test('unreviewed P0 candidate never unlocks dependent Regolo parts', () => {
  const assessed = inspectRegoloRecordedNewMoon(base);
  const facts = calculateRegoloLotsFromAstronomicalFacts({
    datetimeUtc: t, observer, expectedEphemeris: pin,
    natal: {birthTimeKnown: true, zodiac: 'TROPICAL', chartContextId: 'synthetic',
      ascendantLongitudeDeg: 350,
      planetsLongitudeDeg: {SUN: 10, MOON: 80, MERCURY: 100, VENUS: 130,
        MARS: 160, JUPITER: 200, SATURN: 260},
      houseCuspsDeg: Array.from({length: 12}, (_, i) => i * 30 + 10),
      midheavenLongitudeDeg: 300, descendantLongitudeDeg: 170},
    sunHorizon: {...pin, datetimeUtc: t, observer,
      altitudeType: 'APPARENT_SUN_CENTER_TOPOCENTRIC', horizonModelId: 'SYNTHETIC',
      sunAltitudeDeg: 10, horizonAltitudeDeg: 0, uncertaintyDeg: 0.01, warnings: []},
    precedingNewMoon: assessed.precedingNewMoon,
  });
  assert.equal(facts.kleroi.kleroi.TYCHE.longitudeDeg, 60);
  assert.equal(facts.arabicParts.entries.length, 92);
  assert.ok(facts.arabicParts.availableCount < 92);
  assert.deepEqual(facts.arabicParts.entries.find(e => e.id === 'REG_ABU_MASHAR_4_07').missing,
    ['NEW_MOON']);
});

test('nonconjunct recorded anchor is rejected for candidate use', () => {
  const mismatch = {...engine, calcUt(jd, body) {
    return {xx: [body === 0 ? 20 : 35, 0], rflag: 1, timeSource: 'MOCK_TIME'};
  }};
  const result = inspectRegoloRecordedNewMoon({...base, engine: mismatch});
  assert.equal(result.status, 'REJECTED_CONJUNCTION_RESIDUAL');
  assert.equal(result.candidate.conjunctionResidualDeg, 15);
  assert.equal(result.precedingNewMoon.availability, 'UNAVAILABLE');
});

test('Moon gap warnings prevent even a diagnostic astronomical evaluation', () => {
  const moon = {...record, coverage: {status: 'unreviewed', warnings:
    ['no_reviewed_coverage_policy', 'moon_recorded_cycle_gap_over_45_days']}};
  const badEngine = {calcUt() {throw new Error('must not call');}};
  const output = inspectRegoloRecordedNewMoon({...base, engine: badEngine,
    snapshot: {...snapshot, synods: {Moon: moon}, new_moon: structuredClone(moon)}});
  assert.equal(output.status, 'COVERAGE_WARNING_BLOCKED');
  assert.equal(output.candidate.sourceRowId, 146);
  assert.equal(output.precedingNewMoon.availability, 'UNAVAILABLE');
});

test('stale last recorded Moon in missing years is OUT_OF_RANGE, never reused', () => {
  const stale = {...record, cycle_start_utc: '2017-12-18T06:30:25.000000Z',
    next_cycle_start_utc: '2019-01-06T01:28:11.000000Z'};
  const far = inspectRegoloRecordedNewMoon({...base,
    datetimeUtc: '2018-06-01T12:00:00Z', engine: {calcUt() {
    throw new Error('stale records are not queried');
  }}, snapshot: {...snapshot, requested_at_utc: '2018-06-01T12:00:00.000000Z',
    synods: {Moon: stale}, new_moon: structuredClone(stale)}});
  assert.equal(far.status, 'STALE_RECORDED_ANCHOR');
  assert.deepEqual(far.precedingNewMoon, {availability: 'UNAVAILABLE', reason: 'OUT_OF_RANGE'});
});

test('missing recorded Moon is explicitly unavailable without guessed future anchor', () => {
  const missing = {...record, source_id: null, cycle_start_utc: null,
    next_cycle_start_utc: '2026-12-09T00:00:00.000000Z',
    phase_thresholds_utc: null, status: 'no_preceding_recorded_cycle'};
  const result = inspectRegoloRecordedNewMoon({...base,
    snapshot: {...snapshot, synods: {Moon: missing}, new_moon: null}});
  assert.equal(result.status, 'NO_PRECEDING_RECORDED_MOON');
  assert.equal(result.candidate, null);
  rejects({...base, snapshot: {...snapshot, synods: {Moon: {...missing, source_id: 88}},
    new_moon: null}}, 'INVALID_MOON_RECORD');
});

test('rejects unpinned dataset, forged certification and moon alias divergence', () => {
  rejects({...base, expectedDatasetSha256: 'BAD'}, 'INVALID_DATASET_PIN');
  rejects({...base, expectedDatasetSha256: 'b'.repeat(64)}, 'INCOMPATIBLE_DATASET');
  rejects({...base, snapshot: {...snapshot, dataset: {...snapshot.dataset,
    coverage_certified: true}}}, 'INCOMPATIBLE_DATASET');
  rejects({...base, snapshot: {...snapshot, new_moon: {...record, source_id: 147}}},
    'INCOMPATIBLE_MOON_ALIAS');
  rejects({...base, snapshot: {...snapshot, requested_at_utc:
    '2026-11-18T12:00:00.000001Z'}}, 'INCOMPATIBLE_EVENT_EPOCH');
  rejects({...base, expectedEphemeris: {...pin, engineId: 'OTHER'}},
    'INVALID_EPHEMERIS_PIN');
  rejects({...base, datetimeUtc: '2026-02-30T12:00:00Z'}, 'INVALID_UTC');
});

test('rejects future or expired next-anchor claims without silent fallback', () => {
  const future = {...record, cycle_start_utc: '2026-11-19T01:00:00.000000Z'};
  rejects({...base, snapshot: {...snapshot, synods: {Moon: future},
    new_moon: structuredClone(future)}}, 'INCOMPATIBLE_LUNATION_EPOCH');
  const invalidNext = {...record, next_cycle_start_utc: '2026-11-17T01:00:00.000000Z'};
  rejects({...base, snapshot: {...snapshot, synods: {Moon: invalidNext},
    new_moon: structuredClone(invalidNext)}}, 'INCOMPATIBLE_LUNATION_EPOCH');
});

test('rejects incompatible engine time model, invalid positions and implicit UT1', () => {
  rejects({...base, ut1MinusUtcAtEventSeconds: 2}, 'INVALID_POSITION_MODEL');
  rejects({...base, maxConjunctionResidualDeg: 2}, 'INVALID_POSITION_MODEL');
  rejects({...base, engine: {}}, 'INVALID_EPHEMERIS_PROVIDER');
  rejects({...base, engine: {calcUt: () => ({xx: [NaN, 0], timeSource: 'MOCK_TIME'})}},
    'INCOMPATIBLE_POSITION_SOURCE');
  rejects({...base, engine: {calcUt: () => ({xx: [0, 0], timeSource: 'WRONG'})}},
    'INCOMPATIBLE_POSITION_SOURCE');
  rejects({...base, engine: {calcUt: () => {throw new Error('unavailable');}}},
    'EPHEMERIS_POSITION_FAILURE');
});

test('microsecond-precise requested instant is not silently truncated', () => {
  const changed = {...snapshot,
    requested_at_utc: '2026-11-18T12:00:00.123456Z'};
  const result = inspectRegoloRecordedNewMoon({...base,
    datetimeUtc: '2026-11-18T12:00:00.123456Z', snapshot: changed});
  assert.equal(result.requestedAtUtc, '2026-11-18T12:00:00.123456Z');
});

test('experimental ESM entrypoint resolves without replacing Regolo APIs', async () => {
  const module = await import('astrological-functions/regolo-moon-event-candidate');
  assert.equal(module.inspectRegoloRecordedNewMoon, inspectRegoloRecordedNewMoon);
});
