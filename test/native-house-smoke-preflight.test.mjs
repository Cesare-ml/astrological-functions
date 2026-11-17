import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseNativeHouseOptions, circularErrorArcsec, HOUSE_SMOKE_FIXTURE,
  houseSmokeCalculationRequest, verifyNativeAddonPreflight} from '../scripts/verify-native-house-bridge.mjs';
import {calculateAstroComHouseFromProvider} from '../src/astro-com-house-provider.mjs';

const args = ['--checkout', '/some/pinned/checkout', '--expected-commit', 'a'.repeat(40),
  '--expected-addon-sha256', 'b'.repeat(64), '--kernel-context', 'HOUSE_ANGLES_NO_KERNEL'];

test('smoke CLI requires explicit pinned checkout, full SHA and context without defaults', () => {
  assert.deepEqual(parseNativeHouseOptions(['--help']), {help: true});
  const valid = parseNativeHouseOptions(args);
  assert.equal(valid.expectedCommit, 'a'.repeat(40));
  assert.equal(valid.kernelContext, 'HOUSE_ANGLES_NO_KERNEL');
  for (const invalid of [[], args.slice(0, -2),
    args.map((x, i) => i === 5 ? 'bad-sha' : x),
    args.map((x, i) => i === 7 ? '  ' : x)]) {
    assert.throws(() => parseNativeHouseOptions(invalid), /E_NATIVE_SMOKE_OPTIONS/);
  }
});

test('angles compare across wrap without treating 359.999 and 0.001 as 360 apart', () => {
  assert.ok(Math.abs(circularErrorArcsec(359.999, 0.001) - 7.2) < 1e-7);
  assert.equal(circularErrorArcsec(45, 45), 0);
  assert.equal(circularErrorArcsec(0, 180), 648000);
  assert.throws(() => circularErrorArcsec(NaN, 42), /E_REFERENCE_ANGLE/);
  assert.ok(HOUSE_SMOKE_FIXTURE.ttJulianDay > HOUSE_SMOKE_FIXTURE.ut1JulianDay);
});

test('smoke fixture ID stays in receipt, never leaks into strict provider calculation', async () => {
  const expectedProvider = {engineVersion: 'SYNTHETIC',
    kernelSetId: 'NO_KERNEL', timeModel: 'TEST_EXPLICIT_UT1_TT'};
  const request = houseSmokeCalculationRequest('WHOLE_ARIES', expectedProvider);
  assert.equal(HOUSE_SMOKE_FIXTURE.id, 'J2000_NOON_40N_SYNTHETIC_TIMESCALES');
  assert.equal(Object.hasOwn(request, 'id'), false);
  assert.ok(Object.isFrozen(request));
  const out = await calculateAstroComHouseFromProvider(request,
    {calculateHouseAngles: input => ({...input, ...expectedProvider,
      model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
      armcDeg: 61, ascendantDeg: 127, midheavenDeg: 65, trueObliquityDeg: 23.44})});
  assert.equal(out.houseSystem, 'WHOLE_ARIES');
  assert.equal(out.result.cuspsDeg.length, 12);
});

test('native addon preflight checks checkout HEAD, clean tree, actual bytes and repo paths', t => {
  const checkout = mkdtempSync(path.join(tmpdir(), 'virgostars-native-house-test-'));
  t.after(() => rmSync(checkout, {recursive: true, force: true}));
  const run = (...argv) => execFileSync('git', ['-C', checkout, ...argv],
    {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  const loader = path.join(checkout, 'bindings', 'node', 'index.js');
  const addon = path.join(checkout, 'bindings', 'node', 'native', 'virgostars_ephemeris.node');
  mkdirSync(path.dirname(addon), {recursive: true});
  run('init');
  writeFileSync(loader, "module.exports = {createHouseAngleProvider: () => ({})};\n");
  run('add', 'bindings/node/index.js');
  run('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture');
  const expectedCommit = run('rev-parse', 'HEAD');
  const bytes = Buffer.from('not a real native addon: hash-only test');
  const expectedAddonSha256 = createHash('sha256').update(bytes).digest('hex');
  const options = {checkout, expectedCommit, expectedAddonSha256,
    kernelContext: 'TEST_NO_KERNEL'};

  assert.throws(() => verifyNativeAddonPreflight(options), /E_NATIVE_SMOKE_MISSING/);
  writeFileSync(addon, bytes);
  const matched = verifyNativeAddonPreflight(options);
  assert.equal(matched.nativeAddonSha256, expectedAddonSha256);
  assert.equal(matched.upstreamCommitSha, expectedCommit);
  assert.equal(readFileSync(matched.addon).compare(bytes), 0);
  assert.throws(() => verifyNativeAddonPreflight({...options,
    expectedAddonSha256: 'f'.repeat(64)}), /E_NATIVE_SMOKE_SHA256/);
  assert.throws(() => verifyNativeAddonPreflight({...options,
    expectedCommit: 'f'.repeat(40)}), /E_NATIVE_SMOKE_COMMIT/);
  writeFileSync(loader, `${readFileSync(loader)}// modified\n`);
  assert.throws(() => verifyNativeAddonPreflight(options), /E_NATIVE_SMOKE_DIRTY/);
});

test('real-addon CLI does not silently skip a missing explicit checkout', () => {
  const script = fileURLToPath(new URL('../scripts/verify-native-house-bridge.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
  assert.equal(help.status, 0);
  assert.match(help.stdout, /requires real apparent Sun declination|Sunshine remains blocked/);
  const invalid = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /E_NATIVE_SMOKE_OPTIONS/);
});
