import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {executeRegoloNativeCases, parseRegoloNativeOptions,
  verifyRegoloKernel, REGOLO_NATIVE_CASES} from '../scripts/verify-native-regolo-lots.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(root, '../scripts/verify-native-regolo-lots.mjs');
const example = [
  '--checkout', '/unloaded/source',
  '--expected-commit', 'a'.repeat(40),
  '--expected-addon-sha256', 'b'.repeat(64),
  '--de441', '/unloaded/de441.eph',
  '--expected-de441-sha256', 'c'.repeat(64),
  '--time-model', 'caller-DUT1-2026',
  '--dut1-seconds', '0.24',
];

test('CLI needs every explicit source and time pin; help is non-invasive', () => {
  const parsed = parseRegoloNativeOptions(example);
  assert.equal(parsed.expectedCommit, 'a'.repeat(40));
  assert.equal(parsed.expectedDe441Sha256, 'c'.repeat(64));
  assert.equal(parsed.dut1Seconds, 0.24);
  assert.deepEqual(parseRegoloNativeOptions(['--help']), {help: true});
  for (const invalid of [[], example.slice(0, -2),
    example.map(v => v === '0.24' ? 'NaN' : v),
    example.map(v => v === '0.24' ? '2' : v),
    example.map(v => v === 'a'.repeat(40) ? 'wrong' : v),
    example.map(v => v === 'caller-DUT1-2026' ? 'invalid model' : v)]) {
    assert.throws(() => parseRegoloNativeOptions(invalid), /E_REGOLO_OPTIONS/);
  }
  const help = execFileSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
  assert.match(help, /--expected-de441-sha256/);
  const missing = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /E_REGOLO_OPTIONS/);
});

test('kernel preflight streams exact trusted bytes and rejects wrong SHA or missing file', async () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'vs-regolo-smoke-'));
  try {
    const file = path.join(temp, 'tiny-synthetic.eph');
    const bytes = Buffer.from('SYNTHETIC TEST BYTES, NEVER A REAL JPL FILE');
    writeFileSync(file, bytes);
    const sha = createHash('sha256').update(bytes).digest('hex');
    const verified = await verifyRegoloKernel(file, sha.toUpperCase());
    assert.equal(verified.sha256, sha);
    await assert.rejects(verifyRegoloKernel(file, '0'.repeat(64)), /E_REGOLO_KERNEL_SHA256/);
    await assert.rejects(verifyRegoloKernel(path.join(temp, 'absent.eph'), sha),
      /E_REGOLO_KERNEL_PATH/);
    await assert.rejects(verifyRegoloKernel(temp, sha), /E_REGOLO_KERNEL_PATH/);
    await assert.rejects(verifyRegoloKernel(file, 'bad'), /E_REGOLO_KERNEL_DIGEST/);
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
});

test('two artificial day/night cases produce an honest structural-only shape', () => {
  const calls = [];
  const engine = {riseTransUt(cursor, body, flags, ...rest) {
    calls.push({body, flags, rest});
    const hour = flags & 1 ? 6 : 18;
    const midnight = Math.floor(cursor + 0.5) - 0.5;
    let next = midnight + hour / 24;
    if (next < cursor - 1e-10) next += 1;
    return next;
  }};
  const source = {engineId: 'VIRGOSTARS_EPHEMERIS', engineVersion: 'synthetic',
    kernelSetId: 'synthetic-kernel', timeModelId: 'synthetic-DUT1'};
  const result = executeRegoloNativeCases(engine, source, 0.25);
  assert.equal(result.passed, REGOLO_NATIVE_CASES.length);
  assert.equal(result.failed, 0);
  assert.deepEqual(result.results.map(x => x.sect), ['DAY', 'NIGHT']);
  assert.ok(result.results.every(x => x.klerosCount === 9 && x.arabicPartsCount === 92));
  assert.ok(result.results.every(x => x.availableArabicPartsCount < 92));
  assert.ok(calls.every(x => x.body === 0 && [257, 258].includes(x.flags)));
});

test('smoke reports failures rather than claiming a good native test', () => {
  const source = {engineId: 'VIRGOSTARS_EPHEMERIS', engineVersion: 'synthetic',
    kernelSetId: 'synthetic-kernel', timeModelId: 'synthetic-DUT1'};
  const noSolarEvents = executeRegoloNativeCases({riseTransUt: () => null}, source, 0);
  assert.equal(noSolarEvents.passed, 0);
  assert.equal(noSolarEvents.failed, 2);
  assert.ok(noSolarEvents.failures.every(f => f.code === 'SECT_UNAVAILABLE'));
  const misleading = executeRegoloNativeCases({riseTransUt: () => NaN}, source, 0);
  assert.equal(misleading.passed, 0);
  assert.ok(misleading.failures.every(f => f.code === 'INVALID_EPHEMERIS_EVENT'));
});
