import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { calculateDodecatemoriaFacts } from 'astrological-functions/dodecatemoria';
import { dodecatemoriaLongitude } from 'astrological-functions';

const require = createRequire(import.meta.url);

test('ESM package self-reference exposes versioned dodecatemoria facts', () => {
  const result = calculateDodecatemoriaFacts({
    longitudeDeg: 11, zodiac: 'TROPICAL', method: 'PAULUS_13_V1',
  });
  assert.equal(result.contract, 'DodecatemoriaFacts');
  assert.equal(result.contractVersion, '1');
  assert.equal(result.projectedLongitudeDeg, 143);
  assert.equal(result.projectedLongitudeDeg, dodecatemoriaLongitude(11));
  assert.equal(Object.isFrozen(result), true);
});

test('consumer can choose the twelve-equal-parts convention explicitly', () => {
  const result = calculateDodecatemoriaFacts({
    longitudeDeg: 11, zodiac: 'SIDEREAL', method: 'TWELVE_EQUAL_PARTS_V1',
  });
  assert.equal(result.zodiac, 'SIDEREAL');
  assert.equal(result.partIndex, 4);
  assert.equal(result.projectedLongitudeDeg, 132);
});

test('unsupported CommonJS entry remains unavailable', () => {
  assert.throws(
    () => require('astrological-functions/dodecatemoria'),
    error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  );
});

test('unsupported entry names are not accidentally exported', async () => {
  await assert.rejects(
    () => import('astrological-functions/dodecatemoria-methods'),
    error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  );
});

test('consumer import enforces method and zodiac with deterministic error codes', () => {
  assert.throws(() => calculateDodecatemoriaFacts({ longitudeDeg: 1, zodiac: 'TROPICAL' }),
    error => error?.code === 'INVALID_DODECATEMORIA_METHOD');
  assert.throws(() => calculateDodecatemoriaFacts({ longitudeDeg: 1, method: 'PAULUS_13_V1' }),
    error => error?.code === 'INVALID_ZODIAC');
});
