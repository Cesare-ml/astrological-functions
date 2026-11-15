import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/verify-provider-integration.mjs', import.meta.url));
const execute = (path, ...args) => spawnSync(process.execPath, [path, ...args], { encoding: 'utf8' });

test('manual native integration gate documents its offline scope', () => {
  const result = execute(script, '--help');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /NodeNext\/Bundler/);
  assert.match(result.stdout, /No GitHub Actions/);
});

test('gate enumerates runtime and declaration fixtures without shell globs', () => {
  const result = execute(script, '--list');
  assert.equal(result.status, 0, result.stderr);
  const listed = result.stdout.replaceAll('\\', '/');
  assert.match(listed, /test\/math\.test\.mjs/);
  assert.match(listed, /test\/types\/dodecatemoria-methods\.ts/);
  assert.match(result.stdout, /Node test files; .* TypeScript fixtures/);
});

test('unknown invocation fails before running any tests', () => {
  for (const args of [['--unknown'], ['--list', '--help']]) {
    const result = execute(script, ...args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
  }
});

test('a partial checkout fails closed before invoking Node tests or TypeScript', () => {
  const root = mkdtempSync(join(tmpdir(), 'virgostars-manual-gate-'));
  try {
    mkdirSync(join(root, 'scripts'));
    const isolated = join(root, 'scripts', 'verify-provider-integration.mjs');
    copyFileSync(script, isolated);
    const result = execute(isolated);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Incomplete F2\/F3 checkout/);
    assert.doesNotMatch(result.stdout, /\[node-test\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
