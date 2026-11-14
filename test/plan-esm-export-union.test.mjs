import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planEsmExportUnion } from '../scripts/plan-esm-export-union.mjs';

const root = './src/index.mjs';
const manifest = (exports = {}, extra = {}) => ({ name: 'astrological-functions', private: true, type: 'module',
  exports: { '.': root, ...exports }, ...extra });
const entry = name => ({ types: `./src/${name}.d.mts`, import: `./src/${name}.mjs` });
const expectCode = (fn, code) => assert.throws(fn, error => error?.code === code);

test('deterministic union preserves every distinct ESM subpath from six PR manifests', () => {
  const list = [manifest(),
    manifest({ './transits': entry('transit-facts'), './transit-events': entry('transit-event-pipeline') }),
    manifest({ './dodecatemoria': entry('dodecatemoria-methods') }),
    manifest({ './ephemeris-provider': { types: './src/ephemeris-provider.d.ts', import: './src/ephemeris-provider.js' } }),
    manifest({ './house-method-comparison': entry('house-method-comparison'),
      './whole-equal-house-comparison': entry('whole-equal-house-comparison'),
      './pinned-whole-equal-comparison': entry('pinned-whole-equal-comparison') }),
    manifest({ './sourced-house-placement-matrix': entry('sourced-house-placement-matrix') }),
    manifest({ './zodiac-decan-facts': entry('zodiac-decan-facts') })];
  const result = planEsmExportUnion(list);
  assert.equal(result.packageName, 'astrological-functions');
  assert.equal(result.candidateCount, 6);
  assert.equal(result.exportCount, 10);
  assert.equal(result.exports['.'], root);
  assert.deepEqual(Object.keys(result.exports).slice(1), Object.keys(result.exports).slice(1).sort());
  assert.deepEqual(result.exports['./zodiac-decan-facts'], entry('zodiac-decan-facts'));
  assert.deepEqual(result.exports['./ephemeris-provider'], {
    types: './src/ephemeris-provider.d.ts', import: './src/ephemeris-provider.js',
  });
  // The input manifests themselves are not modified.
  assert.deepEqual(Object.keys(list[0].exports), ['.']);
});

test('duplicate identical export targets are safe and report all candidate sources', () => {
  const plan = planEsmExportUnion([manifest(), manifest({ './a': entry('a') }), manifest({ './a': entry('a') })]);
  assert.equal(plan.exportCount, 2);
  assert.deepEqual(plan.entries[0].sources, ['candidate 1', 'candidate 2']);
});

test('conflicting export paths with different targets are rejected', () => {
  expectCode(() => planEsmExportUnion([manifest(), manifest({ './a': entry('a') }),
    manifest({ './a': entry('different') })]), 'CONFLICTING_EXPORT');
});

test('any rewrite of the root export is rejected', () => {
  expectCode(() => planEsmExportUnion([manifest(), manifest({}, { exports: { '.': './src/other.mjs' } })]),
    'CONFLICTING_ROOT');
});

test('non-private, non-ESM and foreign package manifests are rejected', () => {
  for (const foreign of [manifest({}, { private: false }), manifest({}, { type: 'commonjs' }),
    manifest({}, { name: 'another-package' })]) {
    expectCode(() => planEsmExportUnion([manifest(), foreign]), 'INCOMPATIBLE_PACKAGE');
  }
});

test('unexpected default, require or missing conditions are rejected', () => {
  for (const target of [entry('a').import, { types: './src/a.d.mts', import: './src/a.mjs', default: './src/a.mjs' },
    { types: './src/a.d.mts' }, { types: './src/a.d.mts', require: './src/a.cjs' }]) {
    expectCode(() => planEsmExportUnion([manifest(), manifest({ './a': target })]),
      'UNSUPPORTED_EXPORT_CONDITION');
  }
});

test('unsafe subpaths and targets are rejected before planning an export map', () => {
  for (const key of ['../private', './../private', './a/../b', './a//b', './node_modules/x', './a*', './a%2fb']) {
    expectCode(() => planEsmExportUnion([manifest(), manifest({ [key]: entry('safe') })]), 'UNSAFE_EXPORT_PATH');
  }
  for (const target of ['../src/private.mjs', './src/../private.mjs', './src/bad?.mjs', './node_modules/pkg/a.mjs']) {
    expectCode(() => planEsmExportUnion([manifest(), manifest({ './a': { types: './src/a.d.mts', import: target } })]),
      'UNSAFE_EXPORT_PATH');
  }
});

test('missing manifests and missing root exports fail closed', () => {
  expectCode(() => planEsmExportUnion([manifest()]), 'MISSING_MANIFESTS');
  expectCode(() => planEsmExportUnion([manifest(), { name: 'astrological-functions', private: true,
    type: 'module', exports: {} }]), 'INVALID_EXPORT_MAP');
});

test('CLI is read-only, returns a plan on valid JSON and fails for a conflict', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'virgostars-export-union-'));
  try {
    const baselinePath = join(directory, 'base.json');
    const candidatePath = join(directory, 'candidate.json');
    await writeFile(baselinePath, JSON.stringify(manifest()));
    await writeFile(candidatePath, JSON.stringify(manifest({ './a': entry('a') })));
    const before = await readFile(baselinePath, 'utf8');
    const script = fileURLToPath(new URL('../scripts/plan-esm-export-union.mjs', import.meta.url));
    const ok = spawnSync(process.execPath, [script, baselinePath, candidatePath], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).exportCount, 2);
    assert.equal(await readFile(baselinePath, 'utf8'), before);
    await writeFile(candidatePath, JSON.stringify(manifest({ './a': { ...entry('a'), require: './src/a.cjs' } })));
    const failure = spawnSync(process.execPath, [script, baselinePath, candidatePath], { encoding: 'utf8' });
    assert.equal(failure.status, 1);
    assert.match(failure.stderr, /UNSUPPORTED_EXPORT_CONDITION/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('hidden segments are refused in proposed ESM subpaths', () => {
  for (const subpath of ['./.env', './.git/config', './safe/.secret', './a/..hidden']) {
    expectCode(() => planEsmExportUnion([manifest(), manifest({ [subpath]: entry('safe') })]),
      'UNSAFE_EXPORT_PATH');
  }
});

test('hidden segments are refused in types and import targets', () => {
  for (const path of ['./.env', './.git/config', './src/.private/file.js']) {
    for (const key of ['types', 'import']) {
      expectCode(() => planEsmExportUnion([manifest(),
        manifest({ './safe': { ...entry('safe'), [key]: path } })]), 'UNSAFE_EXPORT_PATH');
    }
  }
});

test('node_modules segments are refused without case-sensitive bypass', () => {
  for (const fragment of ['node_modules', 'Node_Modules', 'NODE_MODULES']) {
    expectCode(() => planEsmExportUnion([manifest(),
      manifest({ ['./' + fragment + '/a']: entry('safe') })]), 'UNSAFE_EXPORT_PATH');
    for (const key of ['types', 'import']) {
      expectCode(() => planEsmExportUnion([manifest(),
        manifest({ './safe': { ...entry('safe'), [key]: './src/' + fragment + '/a.js' } })]),
        'UNSAFE_EXPORT_PATH');
    }
  }
});

test('hidden baseline root export fails before planning a union', () => {
  expectCode(() => planEsmExportUnion([
    manifest({}, { exports: { '.': './.git/config' } }), manifest()
  ]), 'UNSAFE_EXPORT_PATH');
});

test('normal dotted extensions stay valid and candidate inputs are unchanged', () => {
  const candidate = manifest({ './safe-name': {
    types: './src/safe-name.d.ts', import: './src/safe-name.js'
  } });
  const before = JSON.stringify(candidate);
  const plan = planEsmExportUnion([manifest(), candidate]);
  assert.equal(plan.exports['./safe-name'].types, './src/safe-name.d.ts');
  assert.equal(plan.exports['./safe-name'].import, './src/safe-name.js');
  assert.equal(JSON.stringify(candidate), before);
});

test('CLI rejects hidden targets and never rewrites manifest copies', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'virgostars-hidden-export-'));
  try {
    const base = join(directory, 'base.json'), candidatePath = join(directory, 'candidate.json');
    const candidate = JSON.stringify(manifest({ './unsafe': {
      types: './src/.env', import: './src/safe.js'
    } }));
    await writeFile(base, JSON.stringify(manifest()));
    await writeFile(candidatePath, candidate);
    const script = fileURLToPath(new URL('../scripts/plan-esm-export-union.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, base, candidatePath], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /UNSAFE_EXPORT_PATH/);
    assert.equal(await readFile(candidatePath, 'utf8'), candidate);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
