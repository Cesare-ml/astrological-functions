/**
 * This gate is intentionally run on the true combined staging branch, not on
 * an individual feature PR, which has fewer ESM package exports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { verifyEsmSourceClosure } from '../scripts/verify-esm-source-closure.mjs';

test('all 12 reviewed ESM subpaths have a parseable local source closure', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const report = await verifyEsmSourceClosure(root);
  assert.equal(report.status, 'READY');
  assert.equal(report.packageName, 'astrological-functions');
  assert.equal(report.exportCount, 13); // 12 opt-in subpaths + original package root
  assert.equal(report.declarationCount, 12);
  assert.ok(report.declarationModuleCount >= 12);
  assert.ok(report.declarationFiles.includes('src/declination-provider-gate.d.mts'));
  assert.ok(report.declarationFiles.includes('src/ephemeris-provider.d.ts'));
  assert.ok(report.declarationFiles.includes('src/transit-event-pipeline.d.mts'));
  assert.ok(report.declarationFiles.includes('src/sourced-house-placement-matrix.d.mts'));
  assert.ok(report.runtimeModuleCount >= 13);
  assert.ok(report.runtimeFiles.includes('src/index.mjs'));
  assert.ok(report.runtimeFiles.includes('src/declination-provider-gate.mjs'));
  assert.ok(report.runtimeFiles.includes('src/transit-event-pipeline.mjs'));
  assert.ok(report.runtimeFiles.includes('src/ephemeris-provider.js'));
  assert.ok(report.runtimeFiles.includes('src/house-source-consistency.mjs'));
});
