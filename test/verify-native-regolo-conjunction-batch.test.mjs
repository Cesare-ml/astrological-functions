import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseNativeConjunctionBatchManifest, parseNativeConjunctionBatchOptions,
  runNativeConjunctionBatch} from
  '../scripts/verify-native-regolo-conjunction-batch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts/verify-native-regolo-conjunction-batch.mjs');
const common = Object.freeze({checkout: '/synthetic/not-an-actual-checkout',
  'expected-commit': 'a'.repeat(40),
  'expected-addon-sha256': 'b'.repeat(64),
  de441: '/synthetic/not-an-actual-de441.eph',
  'expected-de441-sha256': 'c'.repeat(64),
  'time-model': 'fixture-time-policy', 'lookback-days': '35',
  'sample-step-hours': '6', 'root-tolerance-seconds': '0.5',
  'max-iterations': '64', 'max-conjunction-residual-deg': '0.001'});
const input = Object.freeze({contract: 'RegoloNativeConjunctionBatchCasesV1',
  cases: Object.freeze([
    Object.freeze({id: 'LEAP_PERIOD', datetimeUtc: '2000-02-29T12:00:00Z',
      birthDut1Seconds: 0.12, dut1SourceUri: 'https://example.org/placeholder-dut1',
      expectedTimeSourcePolicy: 'IERS_LEAP_SECONDS'}),
    Object.freeze({id: 'ANOTHER_EPOCH', datetimeUtc: '2026-11-18T12:00:00Z',
      birthDut1Seconds: -0.27, dut1SourceUri: 'https://example.org/placeholder-dut1',
      expectedTimeSourcePolicy: 'DELTA_T_TABLE:MEASURED'}),
  ])});
const replace = (id, key, value) => ({...input, cases: input.cases.map(c =>
  c.id === id ? {...c, [key]: value} : c)});

test('batch schema inherits the exact single-case epoch/pin validation', () => {
  const cases = parseNativeConjunctionBatchManifest(input, common);
  assert.equal(cases.length, 2);
  assert.equal(cases[0].options.expectedCommit, 'a'.repeat(40));
  assert.equal(cases[1].options.expectedTimeSourcePolicy, 'DELTA_T_TABLE:MEASURED');
  assert.ok(Math.abs((cases[1].options.birthJdUt -
    (2440587.5 + Date.parse(input.cases[1].datetimeUtc) / 86400000)) *
    86400 - (-0.27)) < 0.001);
});

test('manifest rejects duplicates, unsourced DUT1, personal labels and invalid times', () => {
  const bad = [
    {...input, contract: 'OTHER'},
    {...input, extra: 'silently accepted'},
    {...input, cases: []},
    {...input, cases: [...input.cases, input.cases[0]]},
    replace('LEAP_PERIOD', 'id', 123),
    replace('LEAP_PERIOD', 'id', '../private-file'),
    replace('LEAP_PERIOD', 'birthDut1Seconds', '0.0'),
    replace('LEAP_PERIOD', 'birthDut1Seconds', 1.5),
    replace('LEAP_PERIOD', 'dut1SourceUri', 'http://example.org/insecure'),
    replace('LEAP_PERIOD', 'datetimeUtc', '2000-02-30T12:00:00Z'),
    replace('LEAP_PERIOD', 'datetimeUtc', '1960-03-20T12:00:00Z'),
    replace('LEAP_PERIOD', 'expectedTimeSourcePolicy', 'unknown policy'),
    {...input, cases: [{...input.cases[0], extra: 'hidden'}]},
  ];
  for (const manifest of bad) {
    assert.throws(() => parseNativeConjunctionBatchManifest(manifest, common),
      /E_REGOLO_CONJUNCTION_BATCH|E_REGOLO_CONJUNCTION_OPTIONS/);
  }
  assert.throws(() => parseNativeConjunctionBatchManifest(input,
    {...common, 'expected-commit': 'wrong-sha'}),
  /E_REGOLO_CONJUNCTION_OPTIONS/);
});

test('one injected test session yields separately identified, UNVERIFIED cases', async () => {
  const cases = parseNativeConjunctionBatchManifest(input, common);
  let factories = 0;
  const result = await runNativeConjunctionBatch({cases}, async options => {
    factories++;
    assert.equal(options.datetimeUtc, cases[0].options.datetimeUtc);
    return {pinned: {timeModelId: 'fixture-time-policy'},
      preflight: {upstreamCommitSha: 'a'.repeat(40),
        nativeAddonSha256: 'b'.repeat(64)}, kernel: {sha256: 'c'.repeat(64)},
      run(options) {
        return {status: 'CANDIDATE_UNVERIFIED_ASTRONOMY',
          datetimeUtc: options.datetimeUtc,
          nativeAudit: {verifiedLocalBytes: true, nativeAddonExecuted: true,
            scientificParityCertified: false},
          precedingNewMoon: {availability: 'UNAVAILABLE'}};
      }};
  });
  assert.equal(factories, 1);
  assert.deepEqual(result.counts, {total: 2, candidate: 2, failed: 0});
  assert.equal(result.status, 'ALL_NATIVE_CANDIDATES_UNVERIFIED');
  assert.equal(result.scientificParityCertified, false);
  assert.equal(result.referenceIndependenceAudited, false);
  assert.equal(result.results[1].birthDut1Seconds, -0.27);
  assert.notEqual(result.results[0].datetimeUtc, result.results[1].datetimeUtc);
});

test('missing conjunction, a thrown native result and AVAILABLE lunar lot fail independently', async () => {
  const cases = parseNativeConjunctionBatchManifest({...input, cases: [
    ...input.cases, {...input.cases[0], id: 'THIRD',
      datetimeUtc: '1990-03-21T12:00:00Z'}]}, common);
  const report = await runNativeConjunctionBatch({cases}, async () =>
    ({pinned: {timeModelId: 'fixture-time-policy'},
      preflight: {upstreamCommitSha: 'a'.repeat(40),
        nativeAddonSha256: 'b'.repeat(64)}, kernel: {sha256: 'c'.repeat(64)},
      run(options) {
        if (options.datetimeUtc === cases[1].options.datetimeUtc) {
          throw new Error('Synthetic failed engine epoch');
        }
        return {status: options.birthJdUt === cases[2].options.birthJdUt ?
          'NO_CONJUNCTION_BRACKET' : 'CANDIDATE_UNVERIFIED_ASTRONOMY',
        nativeAudit: {verifiedLocalBytes: true, nativeAddonExecuted: true},
        precedingNewMoon: {availability: 'UNAVAILABLE'}};
      }}));
  assert.deepEqual(report.counts, {total: 3, candidate: 1, failed: 2});
  assert.equal(report.status, 'NATIVE_CANDIDATE_FAILURES');
  assert.equal(report.results[0].outcome, 'CANDIDATE');
  assert.equal(report.results[1].outcome, 'FAILED');
  assert.match(report.results[1].error, /Synthetic failed engine epoch/);
  assert.equal(report.results[2].receipt.status, 'NO_CONJUNCTION_BRACKET');
  const failedMoon = await runNativeConjunctionBatch({cases: cases.slice(0, 1)},
    async () => ({pinned: {timeModelId: 'fixture-time-policy'},
      preflight: {upstreamCommitSha: 'a'.repeat(40),
        nativeAddonSha256: 'b'.repeat(64)}, kernel: {sha256: 'c'.repeat(64)},
      run: () => ({status: 'CANDIDATE_UNVERIFIED_ASTRONOMY',
        nativeAudit: {nativeAddonExecuted: true, verifiedLocalBytes: true},
        precedingNewMoon: {availability: 'AVAILABLE'}})}));
  assert.equal(failedMoon.counts.failed, 1);
});

test('CLI validates manifest before attempting any Rust/DE441 preflight', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'regolo-conjunction-batch-'));
  try {
    const inputPath = path.join(tmp, 'cases.json');
    writeFileSync(inputPath, JSON.stringify(input));
    const argv = Object.entries({...common, manifest: inputPath}).flatMap(
      ([key, value]) => [`--${key}`, value]);
    assert.equal(parseNativeConjunctionBatchOptions(argv).cases.length, 2);
    const failed = spawnSync(process.execPath, [cli, ...argv], {encoding: 'utf8'});
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /native|checkout|preflight|git|E_|ENOENT/i);
    assert.match(execFileSync(process.execPath, [cli, '--help'],
      {encoding: 'utf8'}), /--manifest/);
    writeFileSync(inputPath, JSON.stringify(replace('LEAP_PERIOD',
      'birthDut1Seconds', 'invented')));
    const invalid = spawnSync(process.execPath, [cli, ...argv], {encoding: 'utf8'});
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /E_REGOLO_CONJUNCTION_BATCH/);
  } finally {rmSync(tmp, {recursive: true, force: true});}
});
