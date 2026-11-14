/**
 * Staging-only integration guards for the twelve proposed private typed ESM
 * subpaths. These imports are code, not scientific reference calculations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { auditEsmExportStage } from '../scripts/audit-esm-export-stage.mjs';
import { planEsmExportUnion } from '../scripts/plan-esm-export-union.mjs';
import { verifyEsmCheckout } from '../scripts/verify-esm-checkout.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fromProject = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const manifest = fromProject('package.json');
const fixedPlan = fromProject('fixtures/esm-export-union-plan-20261114.json');
const fixture = fromProject('fixtures/esm-export-candidates-20261114.json');
const manifests = [fixture.baseline.manifest, ...fixture.candidates.map(x => x.manifest)];
const subpaths = Object.keys(fixedPlan.exports).filter(x => x !== '.');
const expectedNamedExports = {
  './declination-contacts': 'calculateDeclinationContacts',
  './declination-provider': 'calculateDeclinationContactsWithProvider',
  './dodecatemoria': 'calculateDodecatemoriaFacts',
  './ephemeris-provider': 'calculateNatalWithProvider',
  './house-method-comparison': 'compareHouseMethodPlacements',
  './pinned-whole-equal-comparison': 'compareWholeSignEqualWithPinnedSources',
  './sourced-declination-contacts': 'calculateSourcedDeclinationContacts',
  './sourced-house-placement-matrix': 'buildSourcedHousePlacementMatrix',
  './transit-events': 'prepareTransitAspectEventCandidates',
  './transits': 'calculateTransitFacts',
  './whole-equal-house-comparison': 'compareWholeSignAndEqualFromAscendant',
  './zodiac-decan-facts': 'classifyZodiacDecan',
};

test('staged private ESM manifest exactly preserves the reviewed twelve-path union', () => {
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.name, 'astrological-functions');
  assert.equal(fixedPlan.exportCount, 13);
  assert.equal(subpaths.length, 12);
  assert.deepEqual(Object.keys(expectedNamedExports).sort(), [...subpaths].sort());
  assert.deepEqual(planEsmExportUnion(manifests), fixedPlan);
  assert.deepEqual(manifest.exports, fixedPlan.exports);
  assert.equal(manifest.exports['.'], './src/index.mjs');
});

test('every typed export target is present on the integrated staging checkout', async () => {
  const report = await auditEsmExportStage(root, manifests);
  assert.equal(report.status, 'READY', JSON.stringify(report.issues));
  assert.equal(report.totalTargetCount, 25);
  assert.equal(report.presentTargetCount, 25);
  assert.equal(report.missingTargetCount, 0);
  assert.deepEqual(report.nonExportDrift, []);
});

test('every declared ESM subpath resolves, imports and exposes its required fact function', async () => {
  const named = Object.entries(expectedNamedExports).map(([path, name]) => path + ':' + name);
  const result = await verifyEsmCheckout(root, subpaths, named);
  assert.equal(result.packageName, 'astrological-functions');
  assert.equal(result.exportCount, 13);
  assert.equal(result.importedSpecifiers.length, 13);
  assert.equal(result.verifiedNamedExports.length, 12);
});

test('cross-branch math precision survives the integrated root entrypoint', async () => {
  const { normalize360, signedAngularDistance, AstrologyError,
    resolveHouseSystem } = await import('astrological-functions');
  assert.equal(typeof AstrologyError, 'function');
  assert.equal(typeof resolveHouseSystem, 'function');
  assert.equal(normalize360(-0), 0);
  const value = 359.99999999999994;
  assert.equal(normalize360(value), value);
  assert.equal(signedAngularDistance(0, Number.MIN_VALUE), Number.MIN_VALUE);
});

test('private internal paths and CommonJS attempts remain unavailable to consumers', async () => {
  const require = createRequire(import.meta.url);
  for (const subpath of subpaths) {
    assert.throws(() => require(manifest.name + subpath.slice(1)),
      error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
      'Unexpected CommonJS access to ' + subpath);
  }
  for (const path of ['astrological-functions/src/index.mjs',
    'astrological-functions/src/ephemeris-provider.js',
    'astrological-functions/missing-subpath']) {
    await assert.rejects(import(path), error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
  }
});
