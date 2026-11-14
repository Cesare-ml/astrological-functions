import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planEsmExportUnion } from '../scripts/plan-esm-export-union.mjs';

const entry = (name) => ({ types: `./src/${name}.d.mts`, import: `./src/${name}.mjs` });
const manifest = (other = {}, root = './src/index.mjs') => ({
  name: 'astrological-functions', type: 'module', private: true,
  exports: { '.': root, ...other }
});
const invalid = (manifests, code) => assert.throws(
  () => planEsmExportUnion(manifests), error => error?.code === code);

test('rejects runtime target case collision within one candidate', () => {
  invalid([manifest(), manifest({
    './first': entry('Transit'),
    './second': entry('transit')
  })], 'TARGET_CASE_COLLISION');
});

test('rejects declaration target case collision across candidates', () => {
  invalid([manifest(), manifest({ './a': { types: './src/Chart.d.ts', import: './src/a.js' } }),
    manifest({ './b': { types: './src/chart.d.ts', import: './src/b.js' } })],
  'TARGET_CASE_COLLISION');
});

test('rejects case difference in intermediate runtime directory', () => {
  invalid([manifest(),
    manifest({ './a': { types: './src/a.d.ts', import: './src/Planet/a.js' } }),
    manifest({ './b': { types: './src/b.d.ts', import: './src/planet/a.js' } })],
  'TARGET_CASE_COLLISION');
});

test('rejects root-runtime case alias even with a distinct export key', () => {
  invalid([manifest(), manifest({
    './index-alias': { types: './src/index.d.ts', import: './src/INDEX.mjs' }
  })], 'TARGET_CASE_COLLISION');
});

test('allows exact shared paths for intentional export aliases', () => {
  const same = entry('shared');
  const result = planEsmExportUnion([
    manifest(), manifest({ './first': same }), manifest({ './second': same })
  ]);
  assert.deepEqual(result.exports['./first'], same);
  assert.deepEqual(result.exports['./second'], same);
  assert.equal(result.exportCount, 3);
});

test('preserves conflicting-export error for same subpath with different target', () => {
  invalid([manifest(), manifest({ './point': entry('Point') }),
    manifest({ './point': entry('point') })], 'CONFLICTING_EXPORT');
});

test('accepts casing differences if complete file paths are distinct', () => {
  const plan = planEsmExportUnion([manifest(), manifest({
    './A': { types: './src/A.d.ts', import: './src/A.js' },
    './b': { types: './src/b.d.ts', import: './src/b.js' }
  })]);
  assert.equal(plan.exportCount, 3);
});

test('CLI refuses case-colliding targets without modifying either manifest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'astrological-target-casing-'));
  try {
    const base = join(directory, 'baseline.json');
    const candidate = join(directory, 'candidate.json');
    const original = JSON.stringify(manifest({ './alt': {
      types: './src/alt.d.ts', import: './src/INDEX.mjs'
    } }));
    const initial = JSON.stringify(manifest());
    await writeFile(base, initial);
    await writeFile(candidate, original);
    const script = fileURLToPath(new URL('../scripts/plan-esm-export-union.mjs', import.meta.url));
    const run = spawnSync(process.execPath, [script, base, candidate], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.match(run.stderr, /^TARGET_CASE_COLLISION:/);
    assert.equal(await readFile(base, 'utf8'), initial);
    assert.equal(await readFile(candidate, 'utf8'), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
