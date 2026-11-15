import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { verifyEsmSourceClosure } from '../scripts/verify-esm-source-closure.mjs';

const manifest = {
  name: 'astrological-functions', version: '0.1.0-dev', private: true, type: 'module',
  exports: { '.': './src/index.mjs', './example': {
    types: './src/example.d.mts', import: './src/example.mjs',
  } },
};
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'af-esm-closure-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
  await writeFile(join(root, 'src', 'index.mjs'), 'export const rootFact = true;\n');
  await writeFile(join(root, 'src', 'example.d.mts'), 'export declare const example: boolean;\n');
  await writeFile(join(root, 'src', 'example.mjs'),
    "export { example } from './facts.mjs';\n");
  await writeFile(join(root, 'src', 'facts.mjs'),
    "import { sep } from 'node:path';\nexport const example = sep.length > 0;\n");
  return root;
}
const fails = (promise, code) => assert.rejects(promise, error => error?.code === code);

test('valid package closes an ESM re-export graph without executing its modules', async t => {
  const root = await fixture(t);
  const result = await verifyEsmSourceClosure(root);
  assert.equal(result.status, 'READY');
  assert.equal(result.exportCount, 2);
  assert.equal(result.declarationCount, 1);
  assert.equal(result.runtimeModuleCount, 3);
  assert.equal(result.dependencyEdgeCount, 1);
  assert.deepEqual(result.runtimeFiles, ['src/example.mjs', 'src/facts.mjs', 'src/index.mjs']);
  assert.deepEqual(result.edges, [{from: 'src/example.mjs', to: 'src/facts.mjs'}]);
});

test('missing transitive import is a typed error even when all export targets exist', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "import { missing } from './missing.mjs';\nexport const example = missing;\n");
  await fails(verifyEsmSourceClosure(root), 'MISSING_SOURCE_MODULE');
});

test('transitive dependency with incorrect case fails on any OS', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "import { example } from './Facts.mjs';\nexport { example };\n");
  await fails(verifyEsmSourceClosure(root), 'SOURCE_CASE_MISMATCH');
});

test('symlink source targets cannot escape the audited directory', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "import { example } from './linked.mjs';\nexport { example };\n");
  await symlink(join(root, 'src', 'facts.mjs'), join(root, 'src', 'linked.mjs'));
  await fails(verifyEsmSourceClosure(root), 'SYMLINK_SOURCE_MODULE');
});

test('bare unpinned imports fail before a runtime package lookup', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "import thing from 'swisseph';\nexport const example = thing;\n");
  await fails(verifyEsmSourceClosure(root), 'UNPINNED_SOURCE_DEPENDENCY');
});

test('missing typed declaration is blocked even if ESM runtime is valid', async t => {
  const root = await fixture(t);
  const m = structuredClone(manifest);
  m.exports['./example'].types = './src/missing.d.mts';
  await writeFile(join(root, 'package.json'), JSON.stringify(m));
  await fails(verifyEsmSourceClosure(root), 'MISSING_SOURCE_MODULE');
});

test('broken syntax is detected by Node parse-only mode without executing code', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'facts.mjs'), 'export const example = ;\n');
  await fails(verifyEsmSourceClosure(root), 'INVALID_ESM_SYNTAX');
});

test('relative paths cannot escape the staged root', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "import unsafe from '../../outside.mjs';\nexport const example = unsafe;\n");
  await fails(verifyEsmSourceClosure(root), 'OUTSIDE_STAGING_ROOT');
});

test('extensionless runtime imports are forbidden for deterministic ESM resolution', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "import { example } from './facts';\nexport { example };\n");
  await fails(verifyEsmSourceClosure(root), 'UNSUPPORTED_SOURCE_EXTENSION');
});

test('literal dynamic imports are checked too', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "export const example = () => import('./absent.mjs');\n");
  await fails(verifyEsmSourceClosure(root), 'MISSING_SOURCE_MODULE');
});

test('computed dynamic imports are blocked because their targets cannot be audited', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.mjs'),
    "const name = './facts.mjs'; export const example = () => import(name);\n");
  await fails(verifyEsmSourceClosure(root), 'DYNAMIC_IMPORT_UNVERIFIED');
});

test('circular imports are visited once and reported without looping', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'facts.mjs'),
    "import { example } from './example.mjs';\nexport const facts = typeof example;\n");
  const result = await verifyEsmSourceClosure(root);
  assert.equal(result.runtimeModuleCount, 3);
  assert.equal(result.dependencyEdgeCount, 2);
});

test('invalid stage roots and malformed manifests fail with explicit errors', async t => {
  const root = await fixture(t);
  await fails(verifyEsmSourceClosure(''), 'INVALID_STAGE_ROOT');
  await fails(verifyEsmSourceClosure(join(root, 'absent')), 'INVALID_STAGE_ROOT');
  await writeFile(join(root, 'package.json'), '{bad json');
  await fails(verifyEsmSourceClosure(root), 'INVALID_PACKAGE_JSON');
});

test('CLI emits machine readable report without touching files', async t => {
  const root = await fixture(t);
  const source = join(root, 'src', 'example.mjs');
  const before = await readFile(source, 'utf8');
  const script = fileURLToPath(new URL('../scripts/verify-esm-source-closure.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'READY');
  assert.equal(await readFile(source, 'utf8'), before);
  const bad = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /INVALID_STAGE_ROOT/);
});

test('NodeNext .mjs declaration imports traverse .d.mts transitively', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "import type { Facts } from './facts.mjs';\nexport type Example = Facts;\n");
  await writeFile(join(root, 'src', 'facts.d.mts'),
    "export type { Facts } from './nested.mjs';\n");
  await writeFile(join(root, 'src', 'nested.d.mts'),
    'export interface Facts { readonly value: number }\n');
  const report = await verifyEsmSourceClosure(root);
  assert.equal(report.declarationModuleCount, 3);
  assert.equal(report.declarationDependencyEdgeCount, 2);
  assert.deepEqual(report.declarationFiles,
    ['src/example.d.mts', 'src/facts.d.mts', 'src/nested.d.mts']);
});

test('missing transitive declaration blocks despite complete runtime graph', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "import type { Missing } from './missing.mjs';\nexport type Example = Missing;\n");
  await fails(verifyEsmSourceClosure(root), 'MISSING_SOURCE_MODULE');
});

test('mismatched case in declaration import fails on Windows and Linux', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "export type { Facts } from './Facts.mjs';\n");
  await writeFile(join(root, 'src', 'facts.d.mts'),
    'export interface Facts { value: number }\n');
  await fails(verifyEsmSourceClosure(root), 'SOURCE_CASE_MISMATCH');
});

test('NodeNext .js declarations map to .d.ts, not .d.mts', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "import type { Facts } from './facts.js';\nexport type Example = Facts;\n");
  await writeFile(join(root, 'src', 'facts.d.ts'),
    'export interface Facts { readonly value: number }\n');
  const report = await verifyEsmSourceClosure(root);
  assert.deepEqual(report.declarationFiles,['src/example.d.mts','src/facts.d.ts']);
});

test('same-package typed subpath references are checked against exported declarations', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "export type { Example } from 'astrological-functions/example';\nexport interface Example { value: number }\n");
  const report = await verifyEsmSourceClosure(root);
  assert.equal(report.declarationModuleCount, 1);
  assert.deepEqual(report.declarationEdges,
    [{from:'src/example.d.mts', to:'src/example.d.mts'}]);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "import type { Missing } from 'astrological-functions/unlisted';\nexport type Example = Missing;\n");
  await fails(verifyEsmSourceClosure(root), 'UNPUBLISHED_DECLARATION_DEPENDENCY');
});

test('bare third-party declaration imports fail closed before TypeScript compile', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "import type { Swiss } from 'swisseph';\nexport type Example = Swiss;\n");
  await fails(verifyEsmSourceClosure(root), 'UNPINNED_DECLARATION_DEPENDENCY');
});

test('inline import type and triple slash reference path are audited', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "/// <reference path=\"./extra.d.mts\" />\nexport type Example = import('./facts.mjs').Facts;\n");
  await writeFile(join(root, 'src', 'extra.d.mts'),'export type Tag = string;\n');
  await writeFile(join(root, 'src', 'facts.d.mts'),'export interface Facts { value: number }\n');
  const report = await verifyEsmSourceClosure(root);
  assert.equal(report.declarationModuleCount, 3);
  assert.equal(report.declarationDependencyEdgeCount, 2);
});

test('declaration traversal cannot escape package root', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "export type Example = import('../../outside.mjs').Fact;\n");
  await fails(verifyEsmSourceClosure(root), 'OUTSIDE_STAGING_ROOT');
});

test('declaration symlinks are rejected before reading contents', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src', 'example.d.mts'),
    "export type { Fact } from './alias.mjs';\n");
  await writeFile(join(root,'src','target.d.mts'),'export type Fact = number;\n');
  await symlink(join(root,'src','target.d.mts'),join(root,'src','alias.d.mts'));
  await fails(verifyEsmSourceClosure(root), 'SYMLINK_SOURCE_MODULE');
});

test('extensionless declaration references fail closed, preserving NodeNext semantics', async t => {
  const root = await fixture(t);
  await writeFile(join(root,'src','example.d.mts'),
    "export type { Fact } from './facts';\n");
  await fails(verifyEsmSourceClosure(root), 'UNSUPPORTED_DECLARATION_SPECIFIER');
});
