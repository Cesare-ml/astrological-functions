import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {rmSync} from 'node:fs';
import {inspectRegoloRecordedNewMoon} from '../src/regolo-moon-event-candidate.mjs';
import {compareRegoloMoonReference} from '../scripts/compare-regolo-moon-reference.mjs';

const sha = 'a'.repeat(64);
const moon = {body: 'Moon', source_id: 240,
  cycle_start_utc: '2026-11-10T01:00:00.123456Z',
  next_cycle_start_utc: '2026-12-09T01:00:00.000000Z',
  phase_thresholds_utc: [], phase: {code: 'CRESC1',
    started_at_utc: '2026-11-10T01:00:00.123456Z',
    status: 'derived_from_recorded_thresholds'},
  coverage: {status: 'unreviewed', warnings: ['no_reviewed_coverage_policy']},
  status: 'recorded'};
const report = inspectRegoloRecordedNewMoon({
  datetimeUtc: '2026-11-18T12:00:00Z',
  snapshot: {requested_at_utc: '2026-11-18T12:00:00.000000Z',
    dataset: {id: null, sha256: sha, format: 'VSEPH-P0', coverage_certified: false},
    synods: {Moon: moon}, new_moon: structuredClone(moon)},
  expectedDatasetSha256: sha,
  expectedEphemeris: {engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: 'synthetic', kernelSetId: 'de441-synthetic', timeModelId: 'synthetic'},
  ut1MinusUtcAtEventSeconds: 0.25, expectedTimeSource: 'MOCK_TIME',
  maxConjunctionResidualDeg: 0.25,
  engine: {calcUt(jd, body, flags) {
    assert.equal(flags, 0);
    return {xx: [body === 0 ? 359.9 : 0.05, 0], rflag: 1,
      timeSource: 'MOCK_TIME'};
  }},
});

const reference = {
  contract: 'RegoloIndependentMoonReferenceV1',
  source: {kind: 'INDEPENDENT_EPHEMERIS_SERVICE', title: 'SYNTHETIC REF ONLY',
    uri: 'https://example.org/synthetic', acquiredUtc: '2026-11-18T20:00:00Z',
    convention: 'SYNTHETIC UTC event and synthetic apparent geocentric positions'},
  conjunctionUtc: '2026-11-10T00:59:59.123456Z',
  positionsAtRecordedAnchor: {atUtc: '2026-11-10T01:00:00.123456Z',
    sunLongitudeDeg: 359.90001, moonLongitudeDeg: 0.04999,
    observer: 'GEOCENTRIC', frame: 'APPARENT_ECLIPTIC_OF_DATE'},
  eventToleranceSeconds: 2, eventToleranceRationale: 'Synthetic 2-second test bound',
  positionToleranceArcsec: 1,
  positionToleranceRationale: 'Synthetic arcsecond precision fixture',
};

const compare = (r=report, ref=reference) => compareRegoloMoonReference(r, ref);
function rejects(r, ref, code) {
  assert.throws(() => compare(r, ref),
    error => error?.message?.startsWith(`${code}:`), `Expected ${code}`);
}

test('independent comparison measures exact microseconds and angular wrap', () => {
  const out = compare();
  assert.equal(out.status, 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED');
  assert.equal(out.comparisons.signedEventDeltaSeconds, 1);
  assert.ok(out.comparisons.maxPositionResidualArcsec < 0.1);
  assert.equal(out.scientificallyCertified, false);
  assert.equal(out.referenceIndependenceAudited, false);
  assert.equal(out.archiveCoverageCertified, false);
  assert.deepEqual(out.precedingNewMoon, {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'});
  assert.ok(Object.isFrozen(out));
});

test('submillisecond conjunction disagreement is kept, not rounded away', () => {
  const ref = {...reference, conjunctionUtc: '2026-11-10T01:00:00.123455Z',
    eventToleranceSeconds: 0.0000005};
  const out = compare(report, ref);
  assert.equal(out.status, 'NUMERICAL_MISMATCH');
  assert.ok(Math.abs(out.comparisons.signedEventDeltaSeconds - 0.000001) < 1e-14);
});

test('independent event timestamp mismatch is explicit', () => {
  const out = compare(report, {...reference, conjunctionUtc: '2026-11-09T12:00:00Z'});
  assert.equal(out.status, 'NUMERICAL_MISMATCH');
  assert.equal(out.comparisons.eventWithinTolerance, false);
  assert.equal(out.comparisons.positionsWithinTolerance, true);
});

test('independent longitude mismatch is explicit even with matching event', () => {
  const bad = {...reference, positionsAtRecordedAnchor: {...reference.positionsAtRecordedAnchor,
    moonLongitudeDeg: 3.0}};
  const out = compare(report, bad);
  assert.equal(out.status, 'NUMERICAL_MISMATCH');
  assert.equal(out.comparisons.eventWithinTolerance, true);
  assert.equal(out.comparisons.positionsWithinTolerance, false);
});

test('recorded candidate already rejected for conjunction is never a comparison success', () => {
  const bad = {...report, status: 'REJECTED_CONJUNCTION_RESIDUAL'};
  assert.equal(compare(bad).status, 'NUMERICAL_MISMATCH');
});

test('unavailable Moon report stays incomplete and unavailable', () => {
  const absent = {...report, status: 'NO_PRECEDING_RECORDED_MOON', candidate: null};
  const out = compare(absent);
  assert.equal(out.status, 'INCOMPLETE_CANDIDATE');
  assert.equal(out.comparisons, null);
  assert.equal(out.precedingNewMoon.availability, 'UNAVAILABLE');
});

test('reference must match the exact recorded anchor, not the reference event', () => {
  rejects(report, {...reference, positionsAtRecordedAnchor: {
    ...reference.positionsAtRecordedAnchor,
    atUtc: '2026-11-10T00:59:59.123456Z'}}, 'E_MOON_REFERENCE_EPOCH');
  rejects(report, {...reference, positionsAtRecordedAnchor: {
    ...reference.positionsAtRecordedAnchor,
    observer: 'TOPOCENTRIC'}}, 'E_MOON_REFERENCE_POSITION');
});

test('rejects impossible calendar, missing source and non-justified tolerances', () => {
  rejects(report, {...reference, conjunctionUtc: '2026-02-30T12:00:00Z'},
    'E_MOON_REFERENCE_UTC');
  rejects(report, {...reference, source: {...reference.source, uri: 'file:///tmp/fake'}},
    'E_MOON_REFERENCE_SOURCE');
  rejects(report, {...reference, source: {...reference.source, kind: 'SAME_ENGINE'}},
    'E_MOON_REFERENCE_SOURCE');
  rejects(report, {...reference, positionToleranceArcsec: 3601},
    'E_MOON_REFERENCE_TOLERANCE');
  rejects(report, {...reference, eventToleranceRationale: ''},
    'E_MOON_REFERENCE_TOLERANCE');
});

test('cannot claim certified archive, available new Moon or a forged candidate', () => {
  rejects({...report, dataset: {...report.dataset, coverageCertified: true}}, reference,
    'E_MOON_REFERENCE_REPORT');
  rejects({...report, precedingNewMoon: {availability: 'AVAILABLE', moonLongitudeDeg: 0.05}},
    reference, 'E_MOON_REFERENCE_REPORT');
  rejects({...report, candidate: {...report.candidate, moonLongitudeDeg: 300}},
    reference, 'E_MOON_REFERENCE_REPORT');
});

test('CLI uses opt-in JSON files; valid synthetic comparison exit 0, mismatch exit 1', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'regolo-moon-ref-'));
  try {
    const candidatePath = path.join(temp, 'candidate.json');
    const referencePath = path.join(temp, 'reference.json');
    writeFileSync(candidatePath, JSON.stringify(report));
    writeFileSync(referencePath, JSON.stringify(reference));
    const script = path.resolve('scripts/compare-regolo-moon-reference.mjs');
    const ok = spawnSync(process.execPath, [script, '--candidate', candidatePath,
      '--reference', referencePath], {encoding: 'utf8'});
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).status,
      'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED');
    writeFileSync(referencePath, JSON.stringify({...reference,
      conjunctionUtc: '2026-11-09T12:00:00Z'}));
    const mismatch = spawnSync(process.execPath, [script, '--candidate', candidatePath,
      '--reference', referencePath], {encoding: 'utf8'});
    assert.equal(mismatch.status, 1);
    assert.equal(JSON.parse(mismatch.stdout).status, 'NUMERICAL_MISMATCH');
  } finally {rmSync(temp, {recursive: true, force: true});}
});
