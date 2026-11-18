import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareRegoloLegacyParts } from '../scripts/compare-regolo-legacy-parts.mjs';

test('the optional Regolo parity runner rejects an unpinned source before executing it', async () => {
  await assert.rejects(compareRegoloLegacyParts('function initParte() {}'),
    /Unexpected Regolo source blob/);
});

test('the optional Regolo parity runner requires explicit source and never downloads one', () => {
  const path = fileURLToPath(new URL('../scripts/compare-regolo-legacy-parts.mjs', import.meta.url));
  const absent = spawnSync(process.execPath, [path], {encoding: 'utf8', timeout: 5000});
  assert.equal(absent.status, 1);
  assert.match(absent.stderr, /--source <file-or->/);

  const invalid = spawnSync(process.execPath, [path, '--source', '-'], {
    input: 'modified source', encoding: 'utf8', timeout: 5000,
  });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Unexpected Regolo source blob/);
});
