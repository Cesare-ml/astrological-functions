import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { auditPackageExports } from '../scripts/audit-package-exports.mjs';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(manifest, filenames = ['src/index.mjs']) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'virgostars-exports-'));
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
  for (const name of filenames) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), 'export const example = true;\n');
  }
  return dir;
}
const base = { name: 'astrological-functions', private: true, type: 'module', exports: { '.': './src/index.mjs' } };
function runConsumer(root, code) {
  const entry = path.join(root, 'consumer.mjs');
  writeFileSync(entry, code);
  return execFileSync(process.execPath, [entry], { cwd: root, encoding: 'utf8', timeout: 5000 }).trim();
}
function withFixture(manifest, files, callback) {
  const root = fixture(manifest, files);
  try { callback(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('the current checkout has no broken or unsafe declared package export targets', () => {
  const summary = auditPackageExports(ownRoot);
  assert.ok(summary.subpaths >= 1);
  assert.ok(summary.targets.some(target => target.subpath === '.'));
});

test('accepts private ESM-only root and typed subpaths', () => {
  withFixture({ ...base, exports: {
    '.': './src/index.mjs',
    './ephemeris-provider': { types: './src/ephemeris-provider.d.mts', import: './src/ephemeris-provider.js' }
  } }, ['src/index.mjs', 'src/ephemeris-provider.d.mts', 'src/ephemeris-provider.js'], root => {
    const summary = auditPackageExports(root);
    assert.equal(summary.subpaths, 2);
    assert.equal(summary.targets.length, 3);
    assert.ok(Object.isFrozen(summary.targets));
  });
});

test('rejects missing runtime or type targets', () => {
  withFixture({ ...base, exports: { '.': './src/missing.mjs' } }, ['src/index.mjs'], root => {
    assert.throws(() => auditPackageExports(root), { code: 'MISSING_EXPORT_TARGET' });
  });
  withFixture({ ...base, exports: { '.': { types: './src/missing.d.mts', import: './src/index.mjs' } } },
    ['src/index.mjs'], root => assert.throws(() => auditPackageExports(root), { code: 'MISSING_EXPORT_TARGET' }));
});

test('rejects traversal, malformed target paths and absolute export paths', () => {
  for (const target of ['../outside.mjs', './src/../index.mjs', '/tmp/index.mjs', './src//index.mjs', './src/\\index.mjs']) {
    withFixture({ ...base, exports: { '.': target } }, ['src/index.mjs'], root => {
      assert.throws(() => auditPackageExports(root), { code: 'UNSAFE_EXPORT_TARGET' });
    });
  }
});

test('rejects files that exist but escape the package through a symlink', () => {
  const root = fixture(base, []);
  const outside = mkdtempSync(path.join(os.tmpdir(), 'virgostars-outside-'));
  try {
    writeFileSync(path.join(outside, 'export.mjs'), 'export const outside = true;');
    mkdirSync(path.join(root, 'src'));
    symlinkSync(path.join(outside, 'export.mjs'), path.join(root, 'src/index.mjs'));
    assert.throws(() => auditPackageExports(root), { code: 'UNSAFE_EXPORT_TARGET' });
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('rejects CommonJS and fallback conditions in ESM-only package', () => {
  for (const condition of ['require', 'default']) {
    withFixture({ ...base, exports: { '.': { import: './src/index.mjs', [condition]: './src/index.mjs' } } },
      ['src/index.mjs'], root => assert.throws(() => auditPackageExports(root), { code: 'UNSUPPORTED_EXPORT_CONDITION' }));
  }
});

test('rejects invalid conditional ordering and target kinds', () => {
  withFixture({ ...base, exports: { '.': { import: './src/index.mjs', types: './src/index.d.mts' } } },
    ['src/index.mjs', 'src/index.d.mts'], root => assert.throws(() => auditPackageExports(root), { code: 'INVALID_EXPORT_MAP' }));
  withFixture({ ...base, exports: { '.': { types: './src/index.mjs', import: './src/index.mjs' } } },
    ['src/index.mjs'], root => assert.throws(() => auditPackageExports(root), { code: 'INVALID_TYPE_TARGET' }));
});

test('rejects an accidentally publishable package or non-ESM type', () => {
  withFixture({ ...base, private: false }, ['src/index.mjs'], root =>
    assert.throws(() => auditPackageExports(root), { code: 'PACKAGE_NOT_PRIVATE' }));
  withFixture({ ...base, type: 'commonjs' }, ['src/index.mjs'], root =>
    assert.throws(() => auditPackageExports(root), { code: 'INVALID_PACKAGE_TYPE' }));
});

test('real package root supports Node ESM self-reference without executing astronomy', async () => {
  const imported = await import('astrological-functions');
  assert.equal(typeof imported.normalize360, 'function');
});

test('Node ESM resolves and executes both root and typed conditional subpath', () => {
  withFixture({ ...base, exports: {
    '.': './src/index.mjs',
    './ephemeris-provider': { types: './src/ephemeris-provider.d.mts', import: './src/ephemeris-provider.js' }
  } }, ['src/index.mjs', 'src/ephemeris-provider.d.mts', 'src/ephemeris-provider.js'], root => {
    assert.equal(runConsumer(root, [
      "const root = await import('astrological-functions');",
      "const adapter = await import('astrological-functions/ephemeris-provider');",
      "if (root.example !== true || adapter.example !== true) throw new Error('ESM export mismatch');",
      "console.log('esm-self-import-ok');"
    ].join('\n')), 'esm-self-import-ok');
  });
});

test('Node CJS resolver cannot resolve import-only subpath', () => {
  withFixture({ ...base, exports: {
    '.': './src/index.mjs',
    './ephemeris-provider': { types: './src/ephemeris-provider.d.mts', import: './src/ephemeris-provider.js' }
  } }, ['src/index.mjs', 'src/ephemeris-provider.d.mts', 'src/ephemeris-provider.js'], root => {
    assert.equal(runConsumer(root, [
      "import { createRequire } from 'node:module';",
      "const require = createRequire(import.meta.url);",
      "let code;",
      "try { require.resolve('astrological-functions/ephemeris-provider'); }",
      "catch (error) { code = error.code; }",
      "if (code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw new Error('CommonJS unexpectedly resolved: ' + code);",
      "console.log('cjs-denied-ok');"
    ].join('\n')), 'cjs-denied-ok');
  });
});

test('rejects ambiguous subpath keys and encoded traversal targets', () => {
  for (const key of ['./bad\\name', './bad%2fname', './bad?query', './bad#fragment', './bad*']) {
    withFixture({ ...base, exports: { '.': './src/index.mjs', [key]: './src/index.mjs' } },
      ['src/index.mjs'], root => assert.throws(() => auditPackageExports(root), { code: 'INVALID_EXPORT_MAP' }));
  }
  withFixture({ ...base, exports: { '.': './src/%2e%2e/index.mjs' } }, ['src/index.mjs'], root =>
    assert.throws(() => auditPackageExports(root), { code: 'UNSAFE_EXPORT_TARGET' }));
});
