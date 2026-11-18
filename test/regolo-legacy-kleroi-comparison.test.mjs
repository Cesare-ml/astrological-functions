import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareRegoloLegacyKleroi } from '../scripts/compare-regolo-legacy-kleroi.mjs';

test('the Regolo nine-kleroi compatibility runner verifies the source blob before execution', () => {
  assert.throws(() => compareRegoloLegacyKleroi('unrelated source'),
    /Unexpected Regolo source blob/);
});

test('the Regolo nine-kleroi compatibility CLI cannot silently fetch an original source', () => {
  const path = fileURLToPath(new URL('../scripts/compare-regolo-legacy-kleroi.mjs', import.meta.url));
  const missing = spawnSync(process.execPath, [path], {encoding: 'utf8', timeout: 5000});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /--source <file-or->/);
  const invalid = spawnSync(process.execPath, [path, '--source', '-'], {
    input: 'mutated original', encoding: 'utf8', timeout: 5000,
  });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Unexpected Regolo source blob/);
});
