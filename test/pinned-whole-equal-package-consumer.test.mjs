import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as root from 'astrological-functions';
import { compareWholeSignEqualWithPinnedSources } from 'astrological-functions/pinned-whole-equal-comparison';
import { compareWholeSignAndEqualFromAscendant } from 'astrological-functions/whole-equal-house-comparison';

const datetimeUtc = '2026-11-13T12:00:00Z';
const longitudeBasis = Object.freeze({ type: 'TROPICAL' });
const source = {
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  observerType: 'TOPOCENTRIC',
  observer: { latitudeDeg: 44.8, longitudeDegEast: 11.9 },
  engineVersion: 'SYNTHETIC_RUST_V1',
  kernelSetId: 'SYNTHETIC_KERNEL',
  timeModel: 'SYNTHETIC_TIME_V1',
  corrections: 'APPARENT',
  calculationProfileId: 'CANONICAL_V1',
};
const input = {
  birthTimeKnown: true, ascendantLongitudeDeg: 345,
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  wholeSignSource: source, equalAscendantSource: source,
  points: [
    { id: 'SUN', longitudeDeg: 355 },
    { id: 'MOON', longitudeDeg: 340 },
    { id: 'MARS', longitudeDeg: 10 },
  ],
};
const code = wanted => error => error?.name === 'AstrologyError' && error.code === wanted;

test('package self-reference resolves new pinned ESM subpath only in ESM', () => {
  assert.equal(typeof compareWholeSignEqualWithPinnedSources, 'function');
  assert.equal(typeof compareWholeSignAndEqualFromAscendant, 'function');
  assert.equal(typeof root.locateLongitudeInHouses, 'function');
  assert.equal(Object.hasOwn(root, 'compareWholeSignEqualWithPinnedSources'), false);
  assert.match(import.meta.resolve('astrological-functions/pinned-whole-equal-comparison'),
    /\/src\/pinned-whole-equal-comparison\.mjs$/);
});

test('private pinned consumer import returns expected immutable facts and honest provenance', () => {
  const result = compareWholeSignEqualWithPinnedSources(input);
  assert.equal(result.contract, 'PinnedHouseMethodComparison');
  assert.equal(result.status, 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.source.kernelSetId, 'SYNTHETIC_KERNEL');
  assert.deepEqual(result.comparison.facts.map(
    ({ id, leftHouse, rightHouse, changed }) => [id, leftHouse, rightHouse, changed]),
    [['SUN',1,1,false],['MOON',1,12,true],['MARS',2,1,true]]);
  assert.equal(result.comparison.changedCount, 2);
  for (const value of [result, result.source, result.source.observer,
    result.comparison, result.comparison.facts, result.comparison.left.cuspsDeg])
    assert.ok(Object.isFrozen(value));
});

test('mismatched observer and kernel fail closed through the package entrypoint', () => {
  assert.throws(() => compareWholeSignEqualWithPinnedSources({
    ...input, equalAscendantSource: {
      ...source, observer: { ...source.observer, latitudeDeg: 45 },
    },
  }), code('INCOMPATIBLE_SOURCE_CONTEXT'));
  assert.throws(() => compareWholeSignEqualWithPinnedSources({
    ...input, equalAscendantSource: { ...source, kernelSetId: 'OTHER_KERNEL' },
  }), code('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('unknown birth time and unsupported geometric J2000 source are rejected', () => {
  assert.throws(() => compareWholeSignEqualWithPinnedSources({
    ...input, birthTimeKnown: false,
  }), code('BIRTH_TIME_UNKNOWN'));
  assert.throws(() => compareWholeSignEqualWithPinnedSources({
    ...input, wholeSignSource: { ...source, frame: 'J2000' },
  }), code('INVALID_SOURCE_CONTEXT'));
});

test('CommonJS and unknown package aliases remain unavailable', () => {
  const require = createRequire(import.meta.url);
  for (const name of [
    'astrological-functions/pinned-whole-equal-comparison',
    'astrological-functions/whole-equal-house-comparison',
    'astrological-functions/unknown-house-api',
  ]) {
    assert.throws(() => require(name), error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
  }
});
