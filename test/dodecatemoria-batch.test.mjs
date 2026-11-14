import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { calculateDodecatemoriaBatchFacts } from 'astrological-functions/dodecatemoria-batch';
import { calculateDodecatemoriaFacts } from 'astrological-functions/dodecatemoria';

const require = createRequire(import.meta.url);
const batch = (points, method = 'PAULUS_13_V1', zodiac = 'TROPICAL') =>
  calculateDodecatemoriaBatchFacts({ points, method, zodiac });

test('ordered batch equals independently computed single-point facts', () => {
  const points = [
    { id: 'SUN', longitudeDeg: 359 },
    { id: 'MOON', longitudeDeg: 11 },
    { id: 'ASC', longitudeDeg: 720 },
  ];
  const result = batch(points);
  assert.deepEqual(result.points.map(({ id }) => id), ['SUN', 'MOON', 'ASC']);
  assert.equal(result.contract, 'DodecatemoriaBatchFacts');
  assert.equal(result.contractVersion, '1');
  for (const [index, point] of points.entries()) {
    assert.deepEqual(result.points[index].facts, calculateDodecatemoriaFacts({
      longitudeDeg: point.longitudeDeg, method: 'PAULUS_13_V1', zodiac: 'TROPICAL',
    }));
  }
});

test('twelve equal parts uses the same explicit convention for all entries', () => {
  const result = batch([
    { id: 'SUN', longitudeDeg: 2.5 },
    { id: 'MOON', longitudeDeg: 11 },
    { id: 'VENUS', longitudeDeg: 29.999 },
    { id: 'MARS', longitudeDeg: 30 },
  ], 'TWELVE_EQUAL_PARTS_V1', 'SIDEREAL');
  assert.deepEqual(result.points.map(p => p.facts.partIndex), [1, 4, 11, 0]);
  assert.deepEqual(result.points.filter((_, i) => i !== 2).map(p => p.facts.projectedLongitudeDeg), [30, 132, 30]);
  assert.ok(Math.abs(result.points[2].facts.projectedLongitudeDeg - 359.988) < 1e-10);
  assert.equal(result.zodiac, 'SIDEREAL');
  assert.equal(result.method, 'TWELVE_EQUAL_PARTS_V1');
});

test('returned facts are detached immutable data without unapproved caller metadata', () => {
  const point = { id: 'SUN', longitudeDeg: 11, userEmail: 'private@example.test', metadata: { token: 'x' } };
  const input = [point];
  const result = batch(input);
  const before = JSON.stringify(result);
  point.longitudeDeg = 90;
  point.id = 'MOON';
  input.push({ id: 'VENUS', longitudeDeg: 14 });
  assert.equal(JSON.stringify(result), before);
  assert.equal(before.includes('private@example.test'), false);
  assert.equal(before.includes('token'), false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.points), true);
  assert.equal(Object.isFrozen(result.points[0]), true);
  assert.equal(Object.isFrozen(result.points[0].facts), true);
  assert.deepEqual(Object.keys(result.points[0]), ['id', 'facts']);
  assert.throws(() => { result.points[0].id = 'ALTERED'; }, TypeError);
});

test('non-array, empty, oversized and sparse point collections fail closed', () => {
  for (const points of [undefined, null, {}, [], new Array(1), Array(65).fill({ id: 'X', longitudeDeg: 0 })]) {
    assert.throws(() => batch(points), error => error.code === 'INVALID_POINTS');
  }
  const sparse = [{ id: 'SUN', longitudeDeg: 10 }, , { id: 'MOON', longitudeDeg: 20 }];
  assert.throws(() => batch(sparse), error => error.code === 'INVALID_POINTS');
});

test('duplicate ids, invalid point records and ambiguous whitespace fail closed', () => {
  assert.throws(() => batch([{ id: 'SUN', longitudeDeg: 10 }, { id: 'SUN', longitudeDeg: 20 }]),
    error => error.code === 'DUPLICATE_POINT');
  for (const bad of [null, {}, [], { id: 42, longitudeDeg: 10 }, { id: '', longitudeDeg: 10 },
    { id: ' SUN', longitudeDeg: 10 }, { id: 'MOON ', longitudeDeg: 10 },
    { id: 'x'.repeat(129), longitudeDeg: 10 }]) {
    assert.throws(() => batch([bad]), error => error.code === 'INVALID_POINT');
  }
});

test('shared method and zodiac options are validated with canonical single-point codes', () => {
  assert.throws(() => calculateDodecatemoriaBatchFacts(null), error => error.code === 'INVALID_ARGUMENT');
  assert.throws(() => calculateDodecatemoriaBatchFacts([]), error => error.code === 'INVALID_ARGUMENT');
  assert.throws(() => calculateDodecatemoriaBatchFacts({ points: [{ id: 'A', longitudeDeg: 1 }], method: 'PAULUS_13_V1' }),
    error => error.code === 'INVALID_ZODIAC');
  assert.throws(() => calculateDodecatemoriaBatchFacts({ points: [{ id: 'A', longitudeDeg: 1 }], zodiac: 'TROPICAL' }),
    error => error.code === 'INVALID_DODECATEMORIA_METHOD');
  assert.throws(() => batch([{ id: 'X', longitudeDeg: Infinity }]), error => error.code === 'INVALID_ANGLE');
});

test('bounded 64 point collection preserves deterministic order and independent identities', () => {
  const points = Array.from({ length: 64 }, (_, i) => ({ id: `P${i}`, longitudeDeg: i * 5.625 }));
  const result = batch(points);
  assert.equal(result.points.length, 64);
  assert.equal(result.points[0].id, 'P0');
  assert.equal(result.points[63].id, 'P63');
  assert.notEqual(result.points[0].facts, result.points[1].facts);
});

test('CommonJS and undeclared package paths do not bypass the ESM contract', async () => {
  assert.throws(() => require('astrological-functions/dodecatemoria-batch'),
    error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
  await assert.rejects(() => import('astrological-functions/src/dodecatemoria-batch.mjs'),
    error => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
});
