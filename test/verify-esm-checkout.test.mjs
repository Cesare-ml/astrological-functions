import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyEsmCheckout } from '../scripts/verify-esm-checkout.mjs';

const manifest = () => ({ name: 'astrological-functions', private: true, type: 'module',
  exports: { '.': './src/index.mjs', './real': {
    types: './src/real.d.mts', import: './src/real.mjs'
  } } });

async function fixture(run, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'astrological-real-checkout-'));
  try {
    const files = {
      'package.json': JSON.stringify(manifest()),
      'src/index.mjs': 'export const rootReady = true;\n',
      'src/real.mjs': 'import { rootReady } from "./index.mjs"; export const answer = rootReady ? 42 : 0;\n',
      'src/real.d.mts': 'export declare const answer: number;\n',
      ...options
    };
    for (const [file, content] of Object.entries(files)) {
      if (content === null) continue;
      const path = join(dir, file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const expectCode = async (run, code) => assert.rejects(run, error => error?.code === code);

test('real Node package imports all actual files and returns deterministic summary', async () => {
  await fixture(async dir => {
    const report = await verifyEsmCheckout(dir, ['./real']);
    assert.equal(report.exportCount, 2);
    assert.deepEqual(report.importedSpecifiers, ['astrological-functions', 'astrological-functions/real']);
  });
});

test('CLI checks a trusted checkout without writing package or source files', async () => {
  await fixture(async dir => {
    const original = await readFile(join(dir, 'package.json'), 'utf8');
    const script = fileURLToPath(new URL('../scripts/verify-esm-checkout.mjs', import.meta.url));
    const cli = spawnSync(process.execPath, [script, dir, '--expect', './real'], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).importedSpecifiers.length, 2);
    assert.equal(await readFile(join(dir, 'package.json'), 'utf8'), original);
  });
});

test('missing type declaration fails before imports', async () => {
  await fixture(dir => expectCode(() => verifyEsmCheckout(dir), 'MISSING_EXPORT_TARGET'),
    { 'src/real.d.mts': null });
});

test('missing runtime module fails before imports', async () => {
  await fixture(dir => expectCode(() => verifyEsmCheckout(dir), 'MISSING_EXPORT_TARGET'),
    { 'src/real.mjs': null });
});

test('unexpected required export is rejected rather than silently ignored', async () => {
  await fixture(dir => expectCode(() => verifyEsmCheckout(dir, ['./not-merged']),
    'MISSING_EXPECTED_EXPORT'));
});

test('existing runtime with invalid JavaScript is rejected by real Node import', async () => {
  await fixture(dir => expectCode(() => verifyEsmCheckout(dir), 'RUNTIME_IMPORT_FAILED'),
    { 'src/real.mjs': 'export const answer = ;\n' });
});

test('runtime import failures across adjacent source modules are detected', async () => {
  await fixture(dir => expectCode(() => verifyEsmCheckout(dir), 'RUNTIME_IMPORT_FAILED'),
    { 'src/real.mjs': 'import { missing } from "./index.mjs"; export { missing };\n' });
});

test('symlinked target outside checkout is refused', async t => {
  if (process.platform === 'win32') { t.skip('symlink creation may require privileges on Windows'); return; }
  const external = await mkdtemp(join(tmpdir(), 'astrological-external-'));
  try {
    const file = join(external, 'linked.mjs');
    await writeFile(file, 'export const invalid = true;\n');
    await fixture(async dir => {
      await rm(join(dir, 'src/real.mjs'));
      await symlink(file, join(dir, 'src/real.mjs'));
      await expectCode(() => verifyEsmCheckout(dir), 'TARGET_OUTSIDE_CHECKOUT');
    });
  } finally { await rm(external, { recursive: true, force: true }); }
});

test('invalid manifest paths are rejected by the shared planner before imports', async () => {
  const broken = manifest(); broken.exports['./real'].import = './src/../private.mjs';
  await fixture(dir => expectCode(() => verifyEsmCheckout(dir), 'UNSAFE_EXPORT_PATH'),
    { 'package.json': JSON.stringify(broken) });
});

test('CLI invalid arguments fail without importing code', async () => {
  await fixture(async dir => {
    const script = fileURLToPath(new URL('../scripts/verify-esm-checkout.mjs', import.meta.url));
    const cli = spawnSync(process.execPath, [script, dir, '--expect'], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /INVALID_CHECKOUT_ARGUMENT/);
    assert.equal(cli.stdout, '');
  });
});
