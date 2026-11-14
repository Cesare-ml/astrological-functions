import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planEsmExportUnion } from '../scripts/plan-esm-export-union.mjs';

const manifest = (exports = {}) => ({
  name: 'astrological-functions', private: true, type: 'module',
  exports: { '.': './src/index.mjs', ...exports }
});
const entry = (types, runtime) => ({ types, import: runtime });
const invalid = (fn, code) => assert.throws(fn, error => error?.code === code);

test('accepts real ESM typing pairs from provider and transits candidates', () => {
  const plan = planEsmExportUnion([manifest(), manifest({
    './provider': entry('./src/ephemeris-provider.d.ts', './src/ephemeris-provider.js'),
    './transits': entry('./src/transit-facts.d.mts', './src/transit-facts.mjs')
  })]);
  assert.equal(plan.exportCount, 3);
  assert.deepEqual(plan.nonExportDrift, []);
});

test('rejects CommonJS runtime targets even with types supplied', () => {
  for (const runtime of ['./src/file.cjs', './src/file.cts', './src/file.cjsx']) {
    invalid(() => planEsmExportUnion([manifest(), manifest({
      './bad': entry('./src/file.d.mts', runtime)
    })]), 'INVALID_EXPORT_TARGET');
  }
});

test('rejects source TypeScript as a runtime import', () => {
  for (const runtime of ['./src/file.ts', './src/file.mts', './src/file.tsx']) {
    invalid(() => planEsmExportUnion([manifest(), manifest({
      './bad': entry('./src/file.d.ts', runtime)
    })]), 'INVALID_EXPORT_TARGET');
  }
});

test('rejects JSON, declaration and extensionless runtime targets', () => {
  for (const runtime of ['./src/file.json', './src/file.d.ts', './src/file']) {
    invalid(() => planEsmExportUnion([manifest(), manifest({
      './bad': entry('./src/file.d.ts', runtime)
    })]), 'INVALID_EXPORT_TARGET');
  }
});

test('rejects non-declaration targets in types condition', () => {
  for (const types of ['./src/a.ts', './src/a.mts', './src/a.js', './src/a.d.cts', './src/a.d.TS']) {
    invalid(() => planEsmExportUnion([manifest(), manifest({
      './bad': entry(types, './src/a.js')
    })]), 'INVALID_EXPORT_TARGET');
  }
});

test('rejects non-runtime root exports for baseline or candidate', () => {
  for (const root of ['./src/index.ts', './src/index.json', './src/index', './src/index.cjs']) {
    invalid(() => planEsmExportUnion([
      { ...manifest(), exports: { '.': root } }, manifest()
    ]), 'INVALID_EXPORT_TARGET');
    invalid(() => planEsmExportUnion([
      manifest(), { ...manifest(), exports: { '.': root } }
    ]), 'INVALID_EXPORT_TARGET');
  }
});

test('retains existing unsafe-path error precedence', () => {
  invalid(() => planEsmExportUnion([manifest(), manifest({
    './bad': entry('./.git/types.txt', './src/a.js')
  })]), 'UNSAFE_EXPORT_PATH');
});

test('CLI rejects invalid target without changing its manifest input', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'astrological-functions-conditions-'));
  try {
    const original = JSON.stringify(manifest({ './bad': entry('./src/file.d.ts', './src/file.cjs') }));
    const base = join(dir, 'base.json'), candidate = join(dir, 'candidate.json');
    await writeFile(base, JSON.stringify(manifest()));
    await writeFile(candidate, original);
    const script = fileURLToPath(new URL('../scripts/plan-esm-export-union.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, base, candidate], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^INVALID_EXPORT_TARGET:/);
    assert.equal(await readFile(candidate, 'utf8'), original);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});
