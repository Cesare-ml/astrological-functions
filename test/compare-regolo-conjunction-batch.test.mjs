import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareRegoloConjunctionBatch} from
  '../scripts/compare-regolo-conjunction-batch.mjs';
import {parseNativeConjunctionBatchManifest, runNativeConjunctionBatch} from
  '../scripts/verify-native-regolo-conjunction-batch.mjs';
import {executeNativeConjunctionSearch} from
  '../scripts/verify-native-regolo-conjunction.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts/compare-regolo-conjunction-batch.mjs');
const sha40 = 'a'.repeat(40);
const addonSha = 'b'.repeat(64);
const kernelSha = 'c'.repeat(64);
const source = {engineId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: sha40, kernelSetId: kernelSha, timeModelId: 'test-model'};
const pin = {upstreamCommitSha: sha40, nativeAddonSha256: addonSha};
const common = {checkout: '/synthetic/path', 'expected-commit': sha40,
  'expected-addon-sha256': addonSha, de441: '/synthetic/de441',
  'expected-de441-sha256': kernelSha, 'time-model': 'test-model',
  'lookback-days': '35', 'sample-step-hours': '6',
  'root-tolerance-seconds': '0.5', 'max-iterations': '64',
  'max-conjunction-residual-deg': '0.001'};
const manifest = {contract: 'RegoloNativeConjunctionBatchCasesV1', cases: [
  {id: 'Y2000', datetimeUtc: '2000-02-29T12:00:00Z',
    birthDut1Seconds: 0.12, dut1SourceUri: 'https://example.org/test-dut1',
    expectedTimeSourcePolicy: 'IERS_LEAP_SECONDS'},
  {id: 'Y2026', datetimeUtc: '2026-11-18T12:00:00Z',
    birthDut1Seconds: -0.25, dut1SourceUri: 'https://example.org/test-dut1',
    expectedTimeSourcePolicy: 'IERS_LEAP_SECONDS'},
]};
const mod360 = n => ((n % 360) + 360) % 360;

function syntheticNativeResult(options) {
  const rootJd = options.birthJdUt - 7.25;
  const engine = {calcUt(jd, body, flags) {
    assert.equal(flags, 0);
    const sun = mod360(359.75 + 0.9856 * (jd - rootJd));
    return {xx: [body === 0 ? sun :
      mod360(sun + 12.2 * (jd - rootJd)), 0, 1, 0, 0, 0],
    rflag: 1, timeSource: 'IERS_LEAP_SECONDS'};
  }};
  const receipt = executeNativeConjunctionSearch(engine, source, options, pin);
  assert.equal(receipt.status, 'CANDIDATE_UNVERIFIED_ASTRONOMY');
  // Intentionally fabricated native flags FOR TESTS ONLY. No actual addon
  // was executed and these values are NEVER real astronomical evidence.
  return {...receipt, nativeAudit: {...receipt.nativeAudit,
    nativeAddonExecuted: true, verifiedLocalBytes: true}};
}

async function syntheticBatch() {
  const cases = parseNativeConjunctionBatchManifest(manifest, common);
  return runNativeConjunctionBatch({cases}, async () => ({
    pinned: {timeModelId: 'test-model'}, preflight: pin,
    kernel: {sha256: kernelSha}, run: syntheticNativeResult}));
}

function independent(receipt) {
  return {contract: 'RegoloIndependentConjunctionReferenceV1',
    source: {kind: 'INDEPENDENT_EPHEMERIS_SERVICE', title: 'SYNTHETIC MOCK ONLY',
      uri: 'https://example.org/fabricated-reference',
      acquiredUtc: '2026-11-18T20:00:00Z',
      convention: 'Synthetic apparent geocentric ecliptic of date',
      timeScaleConversion: 'Fabricated known UT1 in synthetic unit tests'},
    event: {jdUt: receipt.candidate.jdUt,
      eventType: 'GEOCENTRIC_ECLIPTIC_LONGITUDE_CONJUNCTION'},
    positionsAtCandidate: {atJdUt: receipt.candidate.jdUt,
      sunLongitudeDeg: receipt.candidate.sunLongitudeDeg,
      moonLongitudeDeg: receipt.candidate.moonLongitudeDeg,
      observer: 'GEOCENTRIC', frame: 'APPARENT_ECLIPTIC_OF_DATE'},
    eventToleranceSeconds: 2, eventToleranceRationale: 'Synthetic test',
    positionToleranceArcsec: 2, positionToleranceRationale: 'Synthetic test'};
}

function refs(batch) {
  return {contract: 'RegoloIndependentConjunctionBatchReferencesV1',
    references: batch.results.map(item => ({id: item.id,
      reference: independent(item.receipt)}))};
}

test('two native-shaped synthetic candidates compare as unverified numeric matches', async () => {
  const batch = await syntheticBatch();
  const report = compareRegoloConjunctionBatch(batch, refs(batch));
  assert.equal(report.contract, 'RegoloConjunctionBatchComparisonV1');
  assert.equal(report.status, 'ALL_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED');
  assert.deepEqual(report.counts, {total: 2, matched: 2, mismatched: 0,
    nativeUnavailable: 0, missingReference: 0, invalidReference: 0});
  assert.equal(report.scientificallyCertified, false);
  assert.equal(report.referenceIndependenceAudited, false);
  assert.equal(report.regoloNewMoonAvailable, false);
  assert.equal(report.maxima.absEventDeltaSeconds, 0);
  assert.equal(report.results[0].comparison.precedingNewMoon.availability,
    'UNAVAILABLE');
});

test('a wrong event time and longitude appears only in its own case', async () => {
  const batch = await syntheticBatch();
  const reference = refs(batch);
  const first = reference.references[0].reference;
  reference.references[0].reference = {...first,
    event: {...first.event, jdUt: first.event.jdUt - 30 / 86400},
    positionsAtCandidate: {...first.positionsAtCandidate,
      moonLongitudeDeg: mod360(first.positionsAtCandidate.moonLongitudeDeg + 0.2)}};
  const report = compareRegoloConjunctionBatch(batch, reference);
  assert.equal(report.status, 'MISMATCH_OR_INCOMPLETE_EVIDENCE');
  assert.equal(report.counts.mismatched, 1);
  assert.equal(report.counts.matched, 1);
  assert.equal(report.results[0].status, 'NUMERICAL_MISMATCH');
  assert.equal(report.results[1].status,
    'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED');
  assert.ok(report.maxima.absEventDeltaSeconds > 29);
  assert.ok(report.maxima.moonResidualArcsec > 700);
});

test('missing, structurally invalid reference and unavailable native are distinct', async () => {
  const batch = await syntheticBatch();
  const reference = refs(batch);
  reference.references[0].reference = null;
  reference.references[1].reference.positionsAtCandidate.atJdUt += 0.01;
  const report = compareRegoloConjunctionBatch(batch, reference);
  assert.equal(report.counts.missingReference, 1);
  assert.equal(report.counts.invalidReference, 1);
  assert.equal(report.results[0].status, 'MISSING_INDEPENDENT_REFERENCE');
  assert.equal(report.results[1].status, 'INVALID_REFERENCE');
  const failedBatch = {...batch, status: 'NATIVE_CANDIDATE_FAILURES',
    counts: {...batch.counts, candidate: 1, failed: 1},
    results: batch.results.map((item, i) => i === 0 ?
      {...item, outcome: 'FAILED', receipt: {...item.receipt,
        status: 'NO_CONJUNCTION_BRACKET', candidate: null,
        precedingNewMoon: {availability: 'UNAVAILABLE',
          reason: 'NON_CONVERGENT'}}} : item)};
  const withFailed = compareRegoloConjunctionBatch(failedBatch, refs(batch));
  assert.equal(withFailed.counts.nativeUnavailable, 1);
  assert.equal(withFailed.counts.matched, 1);
  assert.equal(withFailed.results[0].status, 'NATIVE_CANDIDATE_UNAVAILABLE');
});

test('duplicate/missing/extra reference IDs and malformed batch pins fail closed', async () => {
  const batch = await syntheticBatch();
  const reference = refs(batch);
  const wrong = [
    {...reference, references: reference.references.slice(0, 1)},
    {...reference, references: [reference.references[0], reference.references[0]]},
    {...reference, references: [{id: 'OTHER', reference: null},
      reference.references[1]]},
    {...reference, references: [{id: 123, reference: null}, reference.references[1]]},
    {...reference, contract: 'RegoloWrongReferenceVersion'},
  ];
  for (const r of wrong) assert.throws(() => compareRegoloConjunctionBatch(batch, r),
    /E_REGOLO_CONJUNCTION_BATCH_REFERENCE/);
  for (const b of [
    {...batch, nativeBytesPreflightPerformed: false},
    {...batch, scientificParityCertified: true},
    {...batch, source: {...batch.source, de441Sha256: 'd'.repeat(64)}},
    {...batch, counts: {...batch.counts, candidate: 999}},
    {...batch, results: [{...batch.results[0], id: 123}, batch.results[1]]},
    {...batch, results: [{...batch.results[0], birthDut1Seconds: 0},
      batch.results[1]]},
    {...batch, results: [{...batch.results[0], receipt: {...batch.results[0].receipt,
      precedingNewMoon: {availability: 'AVAILABLE'}}}, batch.results[1]]},
    {...batch, results: [{...batch.results[0], receipt: {...batch.results[0].receipt,
      nativeAudit: {...batch.results[0].receipt.nativeAudit,
        scientificParityCertified: true}}}, batch.results[1]]},
  ]) {
    assert.throws(() => compareRegoloConjunctionBatch(b, reference),
      /E_REGOLO_CONJUNCTION_BATCH_REFERENCE/);
  }
});

test('batch reference CLI preserves explicit nonzero exit for incomplete evidence', async () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'regolo-compare-batch-'));
  try {
    const batch = await syntheticBatch();
    const nativeFile = path.join(tmp, 'native.json');
    const refFile = path.join(tmp, 'refs.json');
    writeFileSync(nativeFile, JSON.stringify(batch));
    writeFileSync(refFile, JSON.stringify(refs(batch)));
    const pass = spawnSync(process.execPath, [cli, '--batch', nativeFile,
      '--references', refFile], {encoding: 'utf8'});
    assert.equal(pass.status, 0);
    assert.equal(JSON.parse(pass.stdout).scientificallyCertified, false);
    const missing = refs(batch);
    missing.references[0].reference = null;
    writeFileSync(refFile, JSON.stringify(missing));
    const incomplete = spawnSync(process.execPath, [cli, '--batch', nativeFile,
      '--references', refFile], {encoding: 'utf8'});
    assert.equal(incomplete.status, 1);
    assert.equal(JSON.parse(incomplete.stdout).counts.missingReference, 1);
    assert.match(execFileSync(process.execPath, [cli, '--help'],
      {encoding: 'utf8'}), /--references/);
  } finally {rmSync(tmp, {recursive: true, force: true});}
});
