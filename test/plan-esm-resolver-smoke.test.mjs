/**
 * Native Node ESM self-import smoke tests for the read-only export-union plan.
 * These execute in disposable synthetic packages, NOT a merged real checkout.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planEsmExportUnion } from '../scripts/plan-esm-export-union.mjs';

const root = './src/index.mjs';
const baseline = () => ({ name: 'astrological-functions', version: '0.1.0-dev',
  private: true, type: 'module', exports: { '.': root } });
const candidate = (exports) => ({ ...baseline(), exports: { '.': root, ...exports } });
const entry = (types, runtime) => ({ types, import: runtime });

async function withFixture(additions, modules, consumer, check) {
  const directory = await mkdtemp(join(tmpdir(), 'astrological-esm-resolve-'));
  try {
    const plan = planEsmExportUnion([baseline(), candidate(additions)]);
    await writeFile(join(directory, 'package.json'), JSON.stringify({
      ...baseline(), exports: plan.exports
    }, null, 2));
    for (const [relative, source] of Object.entries({ [root]: 'export const rootReady = true;\n', ...modules })) {
      const target = join(directory, relative.slice(2));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, source);
    }
    const entrypoint = join(directory, 'consumer.mjs');
    await writeFile(entrypoint, consumer);
    const result = spawnSync(process.execPath, [entrypoint], {
      cwd: directory, encoding: 'utf8', timeout: 10000, env: { ...process.env, NODE_OPTIONS: '' }
    });
    await check({ result, plan, directory });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('real Node self-import resolves the root, .mjs and .js conditional imports', async () => {
  await withFixture({
    './transits': entry('./src/transits.d.mts', './src/transits.mjs'),
    './provider': entry('./src/provider.d.ts', './src/provider.js')
  }, {
    './src/transits.mjs': 'export const body = "transits";\n',
    './src/provider.js': 'export const body = "provider";\n'
  }, `import { rootReady } from 'astrological-functions';
import { body as transitBody } from 'astrological-functions/transits';
import { body as providerBody } from 'astrological-functions/provider';
const resolved = import.meta.resolve('astrological-functions/provider');
console.log(JSON.stringify({ rootReady, transitBody, providerBody, resolved }));`,
  ({ result }) => {
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.deepEqual([output.rootReady, output.transitBody, output.providerBody],
      [true, 'transits', 'provider']);
    assert.match(output.resolved, /\/src\/provider\.js$/);
    assert.doesNotMatch(output.resolved, /\.d\.ts$/);
  });
});

test('runtime ESM condition is chosen despite types preceding import', async () => {
  await withFixture({
    './facts': entry('./src/facts.d.ts', './src/facts.mjs')
  }, { './src/facts.mjs': 'export const value = 21;\n' },
  `const mod = await import('astrological-functions/facts');
console.log(JSON.stringify({ value: mod.value, file: import.meta.resolve('astrological-functions/facts') }));`,
  ({ result }) => {
    assert.equal(result.status, 0, result.stderr);
    const out = JSON.parse(result.stdout);
    assert.equal(out.value, 21);
    assert.match(out.file, /\/facts\.mjs$/);
  });
});

test('two distinct subpaths sharing exactly one runtime file have module identity', async () => {
  const same = entry('./src/shared.d.mts', './src/shared.mjs');
  await withFixture({ './first': same, './second': same },
    { './src/shared.mjs': 'export const stamp = Object.freeze({ n: 1 });\n' },
    `const one = await import('astrological-functions/first');
const two = await import('astrological-functions/second');
console.log(JSON.stringify({ sameModule: one === two, sameValue: one.stamp === two.stamp }));`,
    ({ result }) => {
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), { sameModule: true, sameValue: true });
    });
});

test('unexported internal file is blocked by Node package export boundary', async () => {
  await withFixture({ './visible': entry('./src/visible.d.ts', './src/visible.js') }, {
    './src/visible.js': 'export const ok = true;\n',
    './src/private.js': 'export const secret = "not-exported";\n'
  }, `await import('astrological-functions/src/private.js');`,
  ({ result }) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
  });
});

test('require cannot resolve a subpath with import-only conditions', async () => {
  await withFixture({ './esm-only': entry('./src/esm-only.d.mts', './src/esm-only.mjs') }, {
    './src/esm-only.mjs': 'export const esmOnly = true;\n'
  }, `import { createRequire } from 'node:module';
createRequire(import.meta.url)('astrological-functions/esm-only');`,
  ({ result }) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
  });
});

test('Node detects missing file that a manifest-only planner cannot check', async () => {
  await withFixture({ './missing': entry('./src/missing.d.ts', './src/missing.js') }, {},
  `await import('astrological-functions/missing');`,
  ({ result }) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ERR_MODULE_NOT_FOUND/);
  });
});

test('Node detects runtime syntax errors beyond the planner scope', async () => {
  await withFixture({ './broken': entry('./src/broken.d.ts', './src/broken.mjs') }, {
    './src/broken.mjs': 'export const unclosed = ;\n'
  }, `await import('astrological-functions/broken');`,
  ({ result }) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /SyntaxError/);
  });
});

test('CLI-generated union is consumed by real Node self-import without modifying inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'astrological-esm-cli-integration-'));
  try {
    const initial = JSON.stringify(baseline());
    const second = JSON.stringify(candidate({
      './from-cli': entry('./src/from-cli.d.ts', './src/from-cli.mjs')
    }));
    const basePath = join(directory, 'base.json'), candidatePath = join(directory, 'candidate.json');
    await writeFile(basePath, initial);
    await writeFile(candidatePath, second);
    const script = fileURLToPath(new URL('../scripts/plan-esm-export-union.mjs', import.meta.url));
    const cli = spawnSync(process.execPath, [script, basePath, candidatePath], {
      encoding: 'utf8', timeout: 10000
    });
    assert.equal(cli.status, 0, cli.stderr);
    const plan = JSON.parse(cli.stdout);
    assert.deepEqual(Object.keys(plan.exports), ['.', './from-cli']);
    await writeFile(join(directory, 'package.json'), JSON.stringify({ ...baseline(), exports: plan.exports }));
    await mkdir(join(directory, 'src'));
    await writeFile(join(directory, 'src/index.mjs'), 'export const rootReady = true;\n');
    await writeFile(join(directory, 'src/from-cli.mjs'), 'export const ready = 42;\n');
    const consumer = join(directory, 'consumer.mjs');
    await writeFile(consumer, `import { ready } from 'astrological-functions/from-cli';
console.log(ready);`);
    const result = spawnSync(process.execPath, [consumer], {
      cwd: directory, encoding: 'utf8', timeout: 10000, env: { ...process.env, NODE_OPTIONS: '' }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '42');
    assert.equal(await readFile(basePath, 'utf8'), initial);
    assert.equal(await readFile(candidatePath, 'utf8'), second);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
