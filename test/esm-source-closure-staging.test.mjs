/** Validate the actual assembled manifest, not the historical 12-subpath draft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verifyEsmSourceClosure } from '../scripts/verify-esm-source-closure.mjs';

test('all current private ESM exports have a parseable local runtime and type closure', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const report = await verifyEsmSourceClosure(root);
  const entries = Object.entries(manifest.exports);
  assert.equal(manifest.private, true);
  assert.equal(report.status, 'READY');
  assert.equal(report.packageName, manifest.name);
  assert.equal(report.exportCount, entries.length);
  assert.equal(report.declarationCount, entries.length - 1);
  assert.ok(report.declarationModuleCount >= report.declarationCount);
  assert.ok(report.runtimeModuleCount >= report.exportCount);
  assert.ok(report.runtimeFiles.includes('src/index.mjs'));
  for (const [, target] of entries) {
    if (typeof target === 'string') continue;
    assert.ok(report.declarationFiles.includes(target.types.slice(2)));
    assert.ok(report.runtimeFiles.includes(target.import.slice(2)));
  }
});
