import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditEsmExports } from '../scripts/audit-esm-exports.mjs';

async function fixture(t, exportsField, files = ['src/index.mjs']) {
  const root = await mkdtemp(join(tmpdir(), 'virgostars-esm-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'package.json'), JSON.stringify({name: 'test-package', private: true, type: 'module', exports: exportsField}));
  for (const file of files) {
    const full = join(root, file);
    await mkdir(join(full, '..'), {recursive: true});
    await writeFile(full, 'export {};\n');
  }
  return {root, manifest: join(root, 'package.json')};
}

test('the current root-only export shape is valid', async t => {
  const {manifest} = await fixture(t, {'.': './src/index.mjs'});
  assert.deepEqual(await auditEsmExports(manifest), {ok: true, checkedTargets: 1, diagnostics: []});
});

test('typed, ESM-only conditional subpaths and nested conditions are valid', async t => {
  const {manifest} = await fixture(t, {
    '.': './src/index.mjs',
    './provider': {types: './src/provider.d.mts', node: {import: './src/provider.mjs'}, default: null},
  }, ['src/index.mjs', 'src/provider.d.mts', 'src/provider.mjs']);
  const report = await auditEsmExports(manifest);
  assert.equal(report.ok, true);
  assert.equal(report.checkedTargets, 3);
});

test('missing declared runtime and type targets fail closed', async t => {
  const {manifest} = await fixture(t, {'./provider': {types: './src/provider.d.mts', import: './src/provider.mjs'}}, []);
  const report = await auditEsmExports(manifest);
  assert.equal(report.ok, false);
  assert.deepEqual(report.diagnostics.map(d => d.code), ['MISSING_EXPORT_TARGET','MISSING_EXPORT_TARGET']);
});

test('traversal, encoded targets, backslashes and external targets are rejected', async t => {
  const {manifest} = await fixture(t, {
    './traversal': '../outside.js', './encoded': './src/%2e%2e/other.mjs',
    './backslash': './src\\file.mjs', './remote': 'elsewhere',
  }, []);
  const report = await auditEsmExports(manifest);
  assert.equal(report.ok, false);
  assert.deepEqual(report.diagnostics.map(d => d.code), Array(4).fill('UNSAFE_EXPORT_TARGET'));
  assert.equal(report.checkedTargets, 0);
});

test('symlink pointing outside package is rejected', async t => {
  const {root, manifest} = await fixture(t, {'.': './src/index.mjs'}, []);
  const outer = await mkdtemp(join(tmpdir(), 'virgostars-audit-external-'));
  t.after(() => rm(outer, { recursive: true, force: true }));
  await writeFile(join(outer, 'outside.mjs'), 'export {};');
  await mkdir(join(root, 'src'), {recursive: true});
  await symlink(join(outer, 'outside.mjs'), join(root, 'src/index.mjs'));
  const report = await auditEsmExports(manifest);
  assert.equal(report.diagnostics[0].code, 'UNSAFE_EXPORT_TARGET');
});

test('directories do not count as export files', async t => {
  const {root, manifest} = await fixture(t, {'.': './src'}, []);
  await mkdir(join(root, 'src'));
  const report = await auditEsmExports(manifest);
  assert.equal(report.diagnostics[0].code, 'EXPORT_TARGET_NOT_FILE');
});

test('mixed subpath/condition map is invalid', async t => {
  const {manifest} = await fixture(t, {'.':'./src/index.mjs', import:'./src/index.mjs'});
  const report = await auditEsmExports(manifest);
  assert.equal(report.diagnostics[0].code, 'INVALID_EXPORT_MAP');
});

test('explicit null export is a supported denial', async t => {
  const {manifest} = await fixture(t, {'.':'./src/index.mjs', './internal': null});
  const report = await auditEsmExports(manifest);
  assert.equal(report.ok, true);
  assert.equal(report.checkedTargets, 1);
});

test('invalid primitive target is reported', async t => {
  const {manifest} = await fixture(t, {'./bad': {import: 42}}, []);
  const report = await auditEsmExports(manifest);
  assert.equal(report.diagnostics[0].code, 'INVALID_EXPORT_TARGET');
});


test('noncanonical or reserved subpath names fail rather than produce false passes', async t => {
  const {manifest} = await fixture(t, {
    './a/../alias': './src/index.mjs',
    './double//slash': './src/index.mjs',
    './node_modules/internal': './src/index.mjs',
    './encoded%2fslash': './src/index.mjs',
    './query?part': './src/index.mjs',
    './bad\\segment': './src/index.mjs',
  });
  const report = await auditEsmExports(manifest);
  assert.equal(report.ok, false);
  assert.deepEqual(report.diagnostics.map(d => d.code), Array(6).fill('INVALID_EXPORT_SUBPATH'));
  assert.equal(report.checkedTargets, 0);
});

test('wildcard subpaths and targets are reported as unsupported, not silently accepted', async t => {
  const {manifest} = await fixture(t, {
    './features/*': './src/index.mjs',
    './literal': './src/*.mjs',
  });
  const report = await auditEsmExports(manifest);
  assert.equal(report.ok, false);
  assert.deepEqual(report.diagnostics.map(d => d.code), Array(2).fill('UNSUPPORTED_EXPORT_PATTERN'));
  assert.equal(report.checkedTargets, 0);
});

test('node_modules path segments are rejected even if the file exists', async t => {
  const {manifest} = await fixture(t, {'.': './node_modules/index.mjs'}, ['node_modules/index.mjs']);
  const report = await auditEsmExports(manifest);
  assert.deepEqual(report.diagnostics.map(d => d.code), ['UNSAFE_EXPORT_TARGET']);
  assert.equal(report.checkedTargets, 0);
});

test('type-only conditional export cannot masquerade as a usable ESM runtime import', async t => {
  const {manifest} = await fixture(t, {'./provider': {types: './src/provider.d.mts'}}, ['src/provider.d.mts']);
  const report = await auditEsmExports(manifest);
  assert.equal(report.checkedTargets, 1);
  assert.deepEqual(report.diagnostics.map(d => d.code), ['UNAVAILABLE_NODE_ESM_EXPORT']);
});

test('require-only conditional export is not reachable from an ESM importer', async t => {
  const {manifest} = await fixture(t, {'./provider': {require: './src/provider.mjs'}}, ['src/provider.mjs']);
  const report = await auditEsmExports(manifest);
  assert.deepEqual(report.diagnostics.map(d => d.code), ['UNAVAILABLE_NODE_ESM_EXPORT']);
});

test('condition order can hide an existing import target behind a null default', async t => {
  const {manifest} = await fixture(t, {'./provider': {default: null, import: './src/provider.mjs'}}, ['src/provider.mjs']);
  const report = await auditEsmExports(manifest);
  assert.equal(report.checkedTargets, 1);
  assert.deepEqual(report.diagnostics.map(d => d.code), ['UNAVAILABLE_NODE_ESM_EXPORT']);
});

test('an import condition before a null default is accepted', async t => {
  const {manifest} = await fixture(t, {'./provider': {import: './src/provider.mjs', default: null}}, ['src/provider.mjs']);
  const report = await auditEsmExports(manifest);
  assert.equal(report.ok, true);
  assert.equal(report.checkedTargets, 1);
});
