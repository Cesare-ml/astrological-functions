import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseNativeConjunctionOptions, executeNativeConjunctionSearch,
  runNativeConjunctionSearch} from '../scripts/verify-native-regolo-conjunction.mjs';
import {compareRegoloConjunctionReference} from
  '../scripts/compare-regolo-conjunction-reference.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifyScript = path.join(dir, 'scripts/verify-native-regolo-conjunction.mjs');
const compareScript = path.join(dir, 'scripts/compare-regolo-conjunction-reference.mjs');
const datetimeUtc = '2026-11-18T12:00:00Z';
const birthJd = 2440587.5 + Date.parse(datetimeUtc) / 86400000;
const args = [
  '--checkout', '/synthetic/nonexistent/ephemeris',
  '--expected-commit', 'a'.repeat(40),
  '--expected-addon-sha256', 'b'.repeat(64),
  '--de441', '/synthetic/nonexistent/de441.eph',
  '--expected-de441-sha256', 'c'.repeat(64),
  '--datetime-utc', datetimeUtc,
  '--birth-dut1-seconds', '0.25',
  '--time-model', 'synthetic-time-model',
  '--expected-time-source-policy', 'IERS_LEAP_SECONDS',
  '--lookback-days', '35', '--sample-step-hours', '6',
  '--root-tolerance-seconds', '0.5', '--max-iterations', '64',
  '--max-conjunction-residual-deg', '0.001',
];
const options = parseNativeConjunctionOptions(args);
const source = {engineId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'a'.repeat(40), kernelSetId: 'c'.repeat(64),
  timeModelId: 'synthetic-time-model'};
const preflight = {upstreamCommitSha: 'a'.repeat(40),
  nativeAddonSha256: 'b'.repeat(64)};
const canonical = x => ((x % 360) + 360) % 360;

function engineFor(rootJd) {
  const calls = [];
  const engine = {calcUt(jd, body, flags) {
    calls.push({jd, body, flags});
    const sun = canonical(359.6 + (jd - birthJd) * 0.9856);
    return {xx: [body === 0 ? sun : canonical(sun + 12.2 * (jd - rootJd)),
      0, body === 0 ? 1 : 0.0026, 0, 0, 0],
    rflag: 1, timeSource: 'IERS_LEAP_SECONDS'};
  }};
  return {engine, calls};
}

function receipt() {
  const {engine} = engineFor(birthJd - 7.25);
  return executeNativeConjunctionSearch(engine, source,
    {...options, birthJdUt: birthJd, ut1MinusUtcAtBirthSeconds: 0},
    preflight);
}

function independent(result) {
  return {contract: 'RegoloIndependentConjunctionReferenceV1',
    source: {kind: 'INDEPENDENT_EPHEMERIS_SERVICE',
      title: 'SYNTHETIC TEST ONLY', uri: 'https://example.org/not-an-astronomical-oracle',
      acquiredUtc: '2026-11-18T20:00:00Z',
      convention: 'Geocentric apparent ecliptic of date',
      timeScaleConversion: 'SYNTHETIC exact JD UT1 without UTC conversion'},
    event: {jdUt: result.candidate.jdUt,
      eventType: 'GEOCENTRIC_ECLIPTIC_LONGITUDE_CONJUNCTION'},
    positionsAtCandidate: {atJdUt: result.candidate.jdUt,
      sunLongitudeDeg: result.candidate.sunLongitudeDeg,
      moonLongitudeDeg: result.candidate.moonLongitudeDeg,
      observer: 'GEOCENTRIC', frame: 'APPARENT_ECLIPTIC_OF_DATE'},
    eventToleranceSeconds: 2, eventToleranceRationale: 'Synthetic unit test',
    positionToleranceArcsec: 2, positionToleranceRationale: 'Synthetic unit test'};
}

function simulatedNative(receipt) {
  // This MOCK receipt only exercises the comparator contract. It must
  // NEVER be reported as a real native execution or validation evidence.
  return {...receipt, nativeAudit: {...receipt.nativeAudit,
    nativeAddonExecuted: true, verifiedLocalBytes: true}};
}

test('strict CLI pins all 14 fields and computes UT1 from sub-second UTC+DUT1', () => {
  assert.ok(Math.abs((options.birthJdUt - birthJd) * 86400 - 0.25) < 0.001);
  assert.equal(options.lookbackDays, 35);
  assert.deepEqual(parseNativeConjunctionOptions(['--help']), {help: true});
  assert.throws(() => parseNativeConjunctionOptions([]), /E_REGOLO_CONJUNCTION_OPTIONS/);
  assert.throws(() => parseNativeConjunctionOptions(args.slice(0, -2)),
    /E_REGOLO_CONJUNCTION_OPTIONS/);
  assert.match(execFileSync(process.execPath, [verifyScript, '--help'],
    {encoding: 'utf8'}), /--expected-de441-sha256/);
  assert.equal(spawnSync(process.execPath, [verifyScript], {encoding: 'utf8'}).status, 1);
});

test('invalid dates, time models, lookback/iteration bounds and fake SHAs fail early', () => {
  for (const [needle, replacement] of [
    ['2026-11-18T12:00:00Z', '2026-02-30T12:00:00Z'],
    ['0.25', '1.1'], ['0.25', 'NaN'], ['35', '29'],
    ['6', '15'], ['64', '999'], ['0.001', '0'],
    ['synthetic-time-model', 'not valid'],
    ['b'.repeat(64), 'bad-digest'],
  ]) {
    assert.throws(() => parseNativeConjunctionOptions(args.map(x =>
      x === needle ? replacement : x)), /E_REGOLO_CONJUNCTION_OPTIONS/);
  }
});

test('microsecond UTC handling and underlying numerical search remain congruent', () => {
  const precise = parseNativeConjunctionOptions(args.map(x =>
    x === datetimeUtc ? '2026-11-18T12:00:00.123456Z' : x));
  assert.ok(Math.abs((precise.birthJdUt - options.birthJdUt) * 86400 -
    0.123456) < 0.001);
  const {engine} = engineFor(birthJd - 7);
  const out = executeNativeConjunctionSearch(engine, source, precise, preflight);
  assert.equal(out.status, 'CANDIDATE_UNVERIFIED_ASTRONOMY');
  assert.equal(out.datetimeUtc, '2026-11-18T12:00:00.123456Z');
});

test('mock seam uses real calcUt shape but never claims verified native execution', () => {
  const {engine, calls} = engineFor(birthJd - 7.25);
  const out = executeNativeConjunctionSearch(engine, source,
    {...options, birthJdUt: birthJd, ut1MinusUtcAtBirthSeconds: 0}, preflight);
  assert.equal(out.contract, 'RegoloPrecedingConjunctionSearchV1');
  assert.equal(out.status, 'CANDIDATE_UNVERIFIED_ASTRONOMY');
  assert.equal(out.precedingNewMoon.availability, 'UNAVAILABLE');
  assert.equal(out.nativeAudit.nativeAddonExecuted, false);
  assert.equal(out.nativeAudit.verifiedLocalBytes, false);
  assert.equal(out.nativeAudit.scientificParityCertified, false);
  assert.equal(out.nativeAudit.sourceBuildOriginVerified, false);
  assert.equal(out.nativeAudit.eventDut1Seconds, null);
  assert.ok(calls.length > 200);
  assert.ok(calls.every((c,i) => c.body === i % 2 && c.flags === 0));
});

test('a missing pinned checkout fails before native addon or DE441 use', async () => {
  await assert.rejects(runNativeConjunctionSearch(options));
});

test('comparator refuses mock receipts without a real native execution receipt', () => {
  const r = receipt();
  const compared = compareRegoloConjunctionReference(r, independent(r));
  assert.equal(compared.status, 'INCOMPLETE_NATIVE_CANDIDATE');
  assert.equal(compared.precedingNewMoon.availability, 'UNAVAILABLE');
});

test('synthetic equal event and positions pass thresholds but NEVER certify astronomy', () => {
  const r = simulatedNative(receipt());
  const compared = compareRegoloConjunctionReference(r, independent(r));
  assert.equal(compared.status, 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED');
  assert.equal(compared.comparisons.timeWithinTolerance, true);
  assert.equal(compared.comparisons.longitudesWithinTolerance, true);
  assert.equal(compared.scientificallyCertified, false);
  assert.equal(compared.referenceIndependenceAudited, false);
  assert.equal(compared.precedingNewMoon.availability, 'UNAVAILABLE');
});

test('distinct time and circular longitude mismatches remain independent', () => {
  const r = simulatedNative(receipt());
  const original = independent(r);
  const wrongTime = {...original, event: {...original.event,
    jdUt: original.event.jdUt - 30 / 86400}};
  const a = compareRegoloConjunctionReference(r, wrongTime);
  assert.equal(a.status, 'NUMERICAL_MISMATCH');
  assert.equal(a.comparisons.timeWithinTolerance, false);
  assert.equal(a.comparisons.longitudesWithinTolerance, true);
  const wrongPosition = {...original, positionsAtCandidate:
    {...original.positionsAtCandidate,
      moonLongitudeDeg: canonical(original.positionsAtCandidate.moonLongitudeDeg + 0.03)}};
  const b = compareRegoloConjunctionReference(r, wrongPosition);
  assert.equal(b.status, 'NUMERICAL_MISMATCH');
  assert.equal(b.comparisons.timeWithinTolerance, true);
  assert.equal(b.comparisons.longitudesWithinTolerance, false);
});

test('wrong epoch, frame, observer, source, tolerance and event type fail closed', () => {
  const r = simulatedNative(receipt());
  const valid = independent(r);
  for (const changed of [
    {...valid, positionsAtCandidate: {...valid.positionsAtCandidate,
      atJdUt: r.candidate.jdUt + 0.01}},
    {...valid, positionsAtCandidate: {...valid.positionsAtCandidate,
      frame: 'GEOMETRIC_J2000'}},
    {...valid, positionsAtCandidate: {...valid.positionsAtCandidate,
      observer: 'TOPOCENTRIC'}},
    {...valid, source: {...valid.source, uri: 'http://example.org/not-https'}},
    {...valid, source: {...valid.source, timeScaleConversion: ''}},
    {...valid, event: {...valid.event, eventType: 'FULL_MOON'}},
    {...valid, eventToleranceSeconds: 0},
    {...valid, positionToleranceArcsec: 5000},
  ]) {
    assert.throws(() => compareRegoloConjunctionReference(r, changed),
      /E_CONJUNCTION_REFERENCE_/);
  }
});

test('counterfeit AVAILABLE Moon and tampered native source pin are rejected', () => {
  const r = simulatedNative(receipt());
  const ref = independent(r);
  assert.throws(() => compareRegoloConjunctionReference({...r,
    precedingNewMoon: {availability: 'AVAILABLE', reason: 'fake'}}, ref),
  /E_CONJUNCTION_REFERENCE_RECEIPT/);
  assert.throws(() => compareRegoloConjunctionReference({...r,
    nativeAudit: {...r.nativeAudit, de441Sha256: 'e'.repeat(64)}}, ref),
  /E_CONJUNCTION_REFERENCE_RECEIPT/);
  assert.throws(() => compareRegoloConjunctionReference({...r,
    candidate: {...r.candidate, signedElongationDeg: 100}}, ref),
  /E_CONJUNCTION_REFERENCE_RECEIPT/);
});

test('offline comparator CLI uses distinct JSON files and non-certified exit semantics', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'regolo-conjunction-reference-'));
  try {
    const r = simulatedNative(receipt());
    const ref = independent(r);
    const candidateFile = path.join(tmp, 'candidate.json');
    const referenceFile = path.join(tmp, 'reference.json');
    writeFileSync(candidateFile, JSON.stringify(r));
    writeFileSync(referenceFile, JSON.stringify(ref));
    const passed = spawnSync(process.execPath, [compareScript, '--candidate',
      candidateFile, '--reference', referenceFile], {encoding: 'utf8'});
    assert.equal(passed.status, 0);
    assert.equal(JSON.parse(passed.stdout).scientificallyCertified, false);
    writeFileSync(referenceFile, JSON.stringify({...ref, event:
      {...ref.event, jdUt: ref.event.jdUt - 30 / 86400}}));
    const mismatched = spawnSync(process.execPath, [compareScript, '--candidate',
      candidateFile, '--reference', referenceFile], {encoding: 'utf8'});
    assert.equal(mismatched.status, 1);
    assert.equal(JSON.parse(mismatched.stdout).status, 'NUMERICAL_MISMATCH');
    assert.match(execFileSync(process.execPath, [compareScript, '--help'],
      {encoding: 'utf8'}), /--reference/);
  } finally {rmSync(tmp, {recursive: true, force: true});}
});
