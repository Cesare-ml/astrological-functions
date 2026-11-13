import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveNodeEsmExport } from '../scripts/resolve-node-esm-export.mjs';

async function nodeSelfResolve(t, exported, subpath = './provider') {
  const root = await mkdtemp(join(tmpdir(), 'virgostars-esm-resolve-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src', 'provider.mjs'), 'export const proof = true;\n');
  await writeFile(join(root, 'src', 'provider.d.mts'), 'export declare const proof: true;\n');
  await writeFile(join(root, 'package.json'), JSON.stringify({name: 'test-package', private: true, type: 'module', exports: {[subpath]: exported}}));
  await writeFile(join(root, 'consumer.mjs'), "console.log(import.meta.resolve('test-package/provider'))");
  return spawnSync(process.execPath, [join(root, 'consumer.mjs')], {encoding: 'utf8'});
}

test('ESM importer resolves a nested node/import path after a types-only condition', async t => {
  const exports = {types: './src/provider.d.mts', node: {import: './src/provider.mjs'}, default: null};
  assert.deepEqual(resolveNodeEsmExport(exports), {status: 'resolved', target: './src/provider.mjs'});
  const child = await nodeSelfResolve(t, exports);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /provider\.mjs/);
});

test('TypeScript-only map does not expose a Node ESM target', async t => {
  const exports = {types: './src/provider.d.mts'};
  assert.deepEqual(resolveNodeEsmExport(exports), {status: 'unmatched'});
  const child = await nodeSelfResolve(t, exports);
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
});

test('require-only condition does not supply a Node ESM import', async t => {
  const exports = {require: './src/provider.mjs'};
  assert.deepEqual(resolveNodeEsmExport(exports), {status: 'unmatched'});
  const child = await nodeSelfResolve(t, exports);
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
});

test('default before import blocks later import despite an existing file', async t => {
  const exports = {default: null, import: './src/provider.mjs'};
  assert.deepEqual(resolveNodeEsmExport(exports), {status: 'blocked'});
  const child = await nodeSelfResolve(t, exports);
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
});

test('import before default null resolves correctly', async t => {
  const exports = {import: './src/provider.mjs', default: null};
  assert.deepEqual(resolveNodeEsmExport(exports), {status: 'resolved', target: './src/provider.mjs'});
  const child = await nodeSelfResolve(t, exports);
  assert.equal(child.status, 0, child.stderr);
});

test('arrays skip a null fallback and accept a later resolvable target', async t => {
  const exports = [null, './src/provider.mjs'];
  assert.deepEqual(resolveNodeEsmExport(exports), {status: 'resolved', target: './src/provider.mjs'});
  const child = await nodeSelfResolve(t, exports);
  assert.equal(child.status, 0, child.stderr);
});

test('a denied subpath is distinct from a missing runtime condition', () => {
  assert.deepEqual(resolveNodeEsmExport(null), {status: 'blocked'});
  assert.deepEqual(resolveNodeEsmExport({types:'./src/provider.d.mts', default:null}), {status: 'blocked'});
  assert.deepEqual(resolveNodeEsmExport({browser:'./src/provider.mjs'}), {status: 'unmatched'});
});
