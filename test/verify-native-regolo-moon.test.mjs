import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseRegoloMoonNativeOptions, verifyMoonP0Archive,
  executeRegoloMoonNativeAudit, runNativeRegoloMoonAudit} from
  '../scripts/verify-native-regolo-moon.mjs';
import {compareRegoloMoonReference} from '../scripts/compare-regolo-moon-reference.mjs';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../scripts/verify-native-regolo-moon.mjs');
const args = [
  '--checkout', '/synthetic/missing/upstream',
  '--expected-commit', 'a'.repeat(40),
  '--expected-addon-sha256', 'b'.repeat(64),
  '--de441', '/synthetic/missing/de441.eph',
  '--expected-de441-sha256', 'c'.repeat(64),
  '--python', 'python',
  '--p0-archive', '/synthetic/missing/P0',
  '--expected-p0-sha256', 'd'.repeat(64),
  '--datetime-utc', '2026-11-18T12:00:00Z',
  '--time-model', 'synthetic-time-policy',
  '--dut1-seconds', '0.25',
  '--expected-time-source', 'SYNTHETIC_TIME_SOURCE',
  '--max-conjunction-residual-deg', '0.25',
];
const source = {engineId: 'VIRGOSTARS_EPHEMERIS', engineVersion: 'a'.repeat(40),
  kernelSetId: 'c'.repeat(64), timeModelId: 'synthetic-time-policy'};
const options = parseRegoloMoonNativeOptions(args);
const time = '2026-11-18T12:00:00Z';
const moon = {body: 'Moon', source_id: 2,
  cycle_start_utc: '2026-11-10T01:00:00.123456Z',
  next_cycle_start_utc: '2026-12-09T01:00:00.000000Z',
  phase_thresholds_utc: [], phase: {code: 'CRESC1',
    started_at_utc: '2026-11-10T01:00:00.123456Z',
    status: 'derived_from_recorded_thresholds'},
  coverage: {status: 'unreviewed', warnings: ['no_reviewed_coverage_policy']},
  status: 'recorded'};
const snapshot = {requested_at_utc: '2026-11-18T12:00:00.000000Z',
  dataset: {id: null, sha256: 'd'.repeat(64), format: 'VSEPH-P0',
    coverage_certified: false}, synods: {Moon: moon}, new_moon: structuredClone(moon)};
const preflight = {upstreamCommitSha: source.engineVersion,
  nativeAddonSha256: options.expectedAddonSha256};

test('native Moon CLI mandates all thirteen exact pins and does not run on help', () => {
  assert.equal(options.expectedP0Sha256, 'd'.repeat(64));
  assert.equal(options.ut1MinusUtcAtEventSeconds, 0.25);
  assert.equal(options.expectedTimeSource, 'SYNTHETIC_TIME_SOURCE');
  assert.deepEqual(parseRegoloMoonNativeOptions(['--help']), {help: true});
  assert.throws(() => parseRegoloMoonNativeOptions([]), /E_REGOLO_MOON_OPTIONS/);
  assert.throws(() => parseRegoloMoonNativeOptions(args.slice(0, -2)),
    /E_REGOLO_MOON_OPTIONS/);
  for (const replacement of ['2', 'NaN']) {
    assert.throws(() => parseRegoloMoonNativeOptions(args.map(v =>
      v === '0.25' ? replacement : v)), /E_REGOLO_MOON_OPTIONS/);
  }
  assert.throws(() => parseRegoloMoonNativeOptions(args.map(v =>
    v === 'd'.repeat(64) ? 'bad' : v)), /E_REGOLO_MOON_OPTIONS/);
  assert.match(execFileSync(process.execPath, [script, '--help'], {encoding:'utf8'}),
    /--p0-archive/);
  const missing = spawnSync(process.execPath, [script], {encoding:'utf8'});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /E_REGOLO_MOON_OPTIONS/);
});

test('P0 archive bytes must match a separately trusted digest', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'regolo-moon-audit-'));
  try {
    const file = path.join(root, 'synthetic.P0');
    const bytes = Buffer.from('SYNTHETIC P0 BYTES; NOT A REAL VSEPH DATASET');
    writeFileSync(file, bytes);
    const sha = createHash('sha256').update(bytes).digest('hex');
    const checked = await verifyMoonP0Archive(file, sha.toUpperCase());
    assert.equal(checked.sha256, sha);
    await assert.rejects(verifyMoonP0Archive(file, 'b'.repeat(64)),
      /E_REGOLO_MOON_ARCHIVE_SHA/);
    await assert.rejects(verifyMoonP0Archive(file, 'not-a-digest'),
      /E_REGOLO_MOON_ARCHIVE_SHA/);
    await assert.rejects(verifyMoonP0Archive(root, sha),
      /E_REGOLO_MOON_ARCHIVE_PATH/);
    await assert.rejects(verifyMoonP0Archive(path.join(root, 'absent'), sha),
      /E_REGOLO_MOON_ARCHIVE_PATH/);
  } finally {rmSync(root, {recursive: true, force:true});}
});

test('mock-native smoke yields a direct reference-compatible receipt, never an available Moon', () => {
  const calls = [];
  const engine = {calcUt(jd, body, flags) {
    calls.push({jd, body, flags});
    return {xx: [body === 0 ? 359.9 : 0.05, 0],
      rflag: 1, timeSource: 'SYNTHETIC_TIME_SOURCE'};
  }};
  const output = executeRegoloMoonNativeAudit(engine, snapshot, source, options, preflight);
  assert.equal(output.contract, 'RegoloRecordedMoonCandidateV1');
  assert.equal(output.status, 'CANDIDATE_UNREVIEWED_COVERAGE');
  assert.equal(output.precedingNewMoon.availability, 'UNAVAILABLE');
  assert.deepEqual(calls.map(c => [c.body, c.flags]), [[0, 0], [1, 0]]);
  assert.equal(output.nativeAudit.p0ArchiveSha256, 'd'.repeat(64));
  assert.equal(output.nativeAudit.nativeAddonExecuted, false);
  assert.equal(output.nativeAudit.verifiedLocalBytes, false);
  assert.equal(output.nativeAudit.scientificParityCertified, false);
  assert.equal(output.nativeAudit.p0ArchiveCoverageCertified, false);
  const ref = {contract: 'RegoloIndependentMoonReferenceV1',
    source: {kind: 'INDEPENDENT_EPHEMERIS_SERVICE', title: 'SYNTHETIC',
      uri: 'https://example.org/illustration', acquiredUtc: '2026-11-18T20:00:00Z',
      convention: 'SYNTHETIC APPARENT ECLIPTIC OF DATE GEOCENTRIC'},
    conjunctionUtc: '2026-11-10T01:00:00.123456Z',
    positionsAtRecordedAnchor: {atUtc: '2026-11-10T01:00:00.123456Z',
      sunLongitudeDeg: 359.9, moonLongitudeDeg: 0.05,
      observer: 'GEOCENTRIC', frame: 'APPARENT_ECLIPTIC_OF_DATE'},
    eventToleranceSeconds: 1, eventToleranceRationale: 'synthetic',
    positionToleranceArcsec: 1, positionToleranceRationale: 'synthetic'};
  const compared = compareRegoloMoonReference(output, ref);
  assert.equal(compared.status, 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED');
  assert.equal(compared.archiveCoverageCertified, false);
});

test('P0 SHA mismatch fails closed, including when native engine is mocked', () => {
  const bad = {...snapshot, dataset: {...snapshot.dataset, sha256: 'f'.repeat(64)}};
  assert.throws(() => executeRegoloMoonNativeAudit({calcUt() {throw new Error('not called');}},
    bad, source, options, preflight), error => error.code === 'INCOMPATIBLE_DATASET');
});

test('missing checkout fails before accessing Python or loading any Rust binary', async () => {
  await assert.rejects(runNativeRegoloMoonAudit(options));
});
