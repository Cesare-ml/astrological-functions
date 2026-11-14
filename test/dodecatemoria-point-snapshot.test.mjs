import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDodecatemoriaBatchFacts } from '../src/dodecatemoria-batch.mjs';
import { calculateDodecatemoriaFacts } from '../src/dodecatemoria-methods.mjs';

const batch = (points) => calculateDodecatemoriaBatchFacts({
  points, zodiac: 'TROPICAL', method: 'PAULUS_13_V1',
});

test('a changing id getter is sampled once and the validated value is emitted', () => {
  let reads = 0;
  const point = {
    get id() { return ++reads <= 7 ? 'SUN' : 'MOON'; },
    longitudeDeg: 11,
  };
  const result = batch([point]);
  assert.equal(reads, 1);
  assert.equal(result.points[0].id, 'SUN');
  assert.equal(result.points[0].facts.projectedLongitudeDeg, 143);
});

test('a mutable accessor cannot create duplicate output ids after uniqueness validation', () => {
  let reads = 0;
  const chameleon = {
    get id() { return ++reads <= 7 ? 'SUN' : 'MOON'; },
    longitudeDeg: 11,
  };
  const result = batch([chameleon, { id: 'MOON', longitudeDeg: 27 }]);
  assert.deepEqual(result.points.map(point => point.id), ['SUN', 'MOON']);
  assert.equal(new Set(result.points.map(point => point.id)).size, 2);
  assert.equal(reads, 1);
});

test('longitude accessor is sampled once, with immutable detached facts', () => {
  let longitudeReads = 0;
  const point = {
    id: 'MARS',
    get longitudeDeg() { return ++longitudeReads === 1 ? 11 : 270; },
    metadata: { secret: 'discard' },
  };
  const result = batch([point]);
  assert.equal(longitudeReads, 1);
  assert.deepEqual(result.points[0].facts, calculateDodecatemoriaFacts({
    longitudeDeg: 11, method: 'PAULUS_13_V1', zodiac: 'TROPICAL',
  }));
  assert.deepEqual(Object.keys(result.points[0]), ['id', 'facts']);
  assert.equal(Object.isFrozen(result.points[0]), true);
  assert.equal(JSON.stringify(result).includes('discard'), false);
});

test('a first-read invalid id fails even if a later read would be valid', () => {
  let idReads = 0;
  const point = {
    get id() { return ++idReads === 1 ? ' SUN' : 'SUN'; },
    longitudeDeg: 11,
  };
  assert.throws(() => batch([point]), err => err?.code === 'INVALID_POINT');
  assert.equal(idReads, 1);
});
