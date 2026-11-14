/**
 * Opt-in-to-tooling, read-only strict TypeScript consumer gate.
 * Uses only an existing local tsc executable. No npm install or GitHub Actions.
 * Does not execute the compile-only .mts fixtures or any astronomy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = [
  'test/types/provider-package-consumer.test.mts',
  'test/types/provider-public-house-composition.test.mts',
  'test/types/provider-zodiac-export-union.test.mts',
];
const probe = spawnSync('tsc', ['--version'], { cwd: root, encoding: 'utf8', timeout: 10000 });
const compilerMissing = probe.error?.code === 'ENOENT';
const gate = (name, fn) => test(name, { skip: compilerMissing ? 'TypeScript compiler tsc is not installed; full release validation still required' : false }, fn);

for (const mode of ['NodeNext', 'Bundler']) {
  for (const exactOptional of [false, true]) {
    gate(`real provider TypeScript consumers: ${mode}, exactOptionalPropertyTypes=${exactOptional}`, () => {
      for (const path of fixtures) {
        assert.ok(existsSync(resolve(root, path)), `Missing real consumer fixture ${path}`);
      }
      const args = [
        '--noEmit', '--strict', '--target', 'ES2022',
        '--module', mode === 'NodeNext' ? 'NodeNext' : 'ESNext',
        '--moduleResolution', mode, '--pretty', 'false',
        '--noUncheckedIndexedAccess',
        ...(exactOptional ? ['--exactOptionalPropertyTypes'] : []),
        ...fixtures,
      ];
      const result = spawnSync('tsc', args, {
        cwd: root, encoding: 'utf8', timeout: 20000,
        env: { ...process.env, NODE_OPTIONS: '' }, maxBuffer: 1024 * 1024,
      });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, 0,
        `TypeScript ${probe.stdout.trim()} ${mode} failed: ${result.stdout}${result.stderr}`);
    });
  }
}
