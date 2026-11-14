import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { classifyZodiacDecan as viaPackage } from 'astrological-functions/zodiac-decan-facts';
import { classifyZodiacDecan as viaFile } from '../src/zodiac-decan-facts.mjs';
import { normalize360, AstrologyError } from 'astrological-functions';

const require = createRequire(import.meta.url);

test('ESM package subpath resolves to the same runtime export as its source', () => {
  assert.equal(viaPackage, viaFile);
  const result = viaPackage({ longitudeDeg: 45, zodiac: { type: 'TROPICAL' } });
  assert.equal(result.contract, 'ZodiacDecanFact');
  assert.equal(result.contractVersion, '1-experimental');
  assert.equal(result.signIndex, 1);
  assert.equal(result.decanNumber, 2);
  assert.equal(result.globalDecanIndex, 4);
  assert.equal(result.startDeg, 40);
  assert.equal(result.endDeg, 50);
  assert.equal(result.distanceFromStartDeg, 5);
  assert.equal(Object.isFrozen(result), true);
});

test('package root keeps the established math and AstrologyError exports', () => {
  assert.equal(normalize360(-1), 359);
  assert.ok(new AstrologyError('TEST', 'test') instanceof Error);
});

test('sidereal input requires a declared ayanamsa without silently projecting it', () => {
  const result = viaPackage({ longitudeDeg: -1, zodiac: { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' } });
  assert.deepEqual(result.zodiac, { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' });
  assert.equal(result.globalDecanIndex, 35);
  assert.throws(() => viaPackage({ longitudeDeg: 1, zodiac: { type: 'SIDEREAL' } }),
    error => error instanceof AstrologyError && error.code === 'INVALID_ZODIAC');
});

test('CommonJS require is intentionally not exported from the decan subpath', () => {
  assert.throws(() => require('astrological-functions/zodiac-decan-facts'),
    error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
});

test('unspecified internal or misspelled subpaths stay private', async () => {
  for (const specifier of ['astrological-functions/src/zodiac-decan-facts.mjs',
    'astrological-functions/zodiac-decan', 'astrological-functions/zodiac-decan-facts.js']) {
    await assert.rejects(import(specifier), error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
  }
});
