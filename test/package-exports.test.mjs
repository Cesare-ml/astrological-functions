import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

function exportTargets(entry) {
  if (typeof entry === 'string') return { import: entry };
  assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry),
    'each export must be a path or conditional-export object');
  return entry;
}

test('package remains private ESM and cannot be accidentally published', () => {
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, 'module');
  assert.match(manifest.engines?.node ?? '', /^>=20$/);
});

test('every export target is a repository-local existing file', () => {
  assert.ok(manifest.exports && Object.keys(manifest.exports).length > 0);
  for (const [subpath, raw] of Object.entries(manifest.exports)) {
    const targets = exportTargets(raw);
    assert.equal(typeof targets.import, 'string', `${subpath}: missing ESM import target`);
    for (const [condition, target] of Object.entries(targets)) {
      assert.equal(typeof target, 'string', `${subpath}: ${condition} target must be a path`);
      assert.ok(target.startsWith('./src/'), `${subpath}: target must stay inside src/`);
      assert.ok(!target.split('/').includes('..'), `${subpath}: target must not traverse directories`);
      assert.ok(existsSync(resolve(root, target)), `${subpath}: missing ${condition} target ${target}`);
    }
    if (targets.types) assert.ok(targets.types.endsWith('.d.mts'), `${subpath}: ESM declaration must use .d.mts`);
    assert.ok(targets.import.endsWith('.mjs'), `${subpath}: ESM target must use .mjs`);
  }
});

test('every public ESM subpath can be imported by its package self-reference', async () => {
  for (const subpath of Object.keys(manifest.exports)) {
    const specifier = subpath === '.' ? manifest.name : manifest.name + subpath.slice(1);
    const namespace = await import(specifier);
    assert.ok(namespace && typeof namespace === 'object', `${specifier}: expected ESM namespace`);
  }
});
