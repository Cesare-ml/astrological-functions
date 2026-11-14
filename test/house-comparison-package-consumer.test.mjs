import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as root from 'astrological-functions';
import { compareHouseMethodPlacements } from 'astrological-functions/house-method-comparison';
import { compareWholeSignAndEqualFromAscendant } from 'astrological-functions/whole-equal-house-comparison';

const input = {
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  ascendantLongitudeDeg: 345,
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  points: [
    { id: 'SUN', longitudeDeg: 355 },
    { id: 'MOON', longitudeDeg: 340 },
    { id: 'MARS', longitudeDeg: 10 },
  ],
};

test('package self-reference exposes both typed ESM-only house comparison subpaths', () => {
  assert.equal(typeof compareHouseMethodPlacements, 'function');
  assert.equal(typeof compareWholeSignAndEqualFromAscendant, 'function');
  assert.equal(typeof root.locateLongitudeInHouses, 'function');
  assert.equal(Object.hasOwn(root, 'compareWholeSignAndEqualFromAscendant'), false);
});

test('consumer package import yields synthetic, direction-safe facts without full path imports', () => {
  const result = compareWholeSignAndEqualFromAscendant(input);
  assert.equal(result.left.houseSystem, 'WHOLE_SIGN');
  assert.equal(result.right.houseSystem, 'EQUAL_ASCENDANT');
  assert.deepEqual(result.facts.map(x => [x.id, x.leftHouse, x.rightHouse, x.changed]), [
    ['SUN', 1, 1, false],
    ['MOON', 1, 12, true],
    ['MARS', 2, 1, true],
  ]);
  assert.equal(result.changedCount, 2);
  assert.equal(result.status, 'CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.left.cuspsDeg));
});

test('package path has no accidental CJS or unresolved API alias export', () => {
  const require = createRequire(import.meta.url);
  for (const subpath of [
    'astrological-functions/whole-equal-house-comparison',
    'astrological-functions/house-method-comparison',
    'astrological-functions/unsupported-house-methods',
  ]) {
    assert.throws(() => require(subpath), error =>
      error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
  }
});

test('unknown birth time fails through consumer import rather than inventing houses', () => {
  assert.throws(
    () => compareWholeSignAndEqualFromAscendant({ ...input, birthTimeKnown: false }),
    error => error?.name === 'AstrologyError' && error.code === 'BIRTH_TIME_UNKNOWN',
  );
});
