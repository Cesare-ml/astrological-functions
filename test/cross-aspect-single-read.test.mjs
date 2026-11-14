import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCrossAspects, AstrologyError } from '../src/index.mjs';

const baseline = {
  direction: 'A_TO_B',
  sourcePoints: [{ name: 'SUN', longitudeDeg: 0 }],
  targetPoints: [{ name: 'MOON', longitudeDeg: 0 }],
  aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 1 }],
};

test('point name getter is validated and published from one read', () => {
  let reads = 0;
  const source = { get name() { return ++reads <= 2 ? 'SUN' : 'FORGED'; }, longitudeDeg: 0 };
  const [match] = calculateCrossAspects({ ...baseline, sourcePoints: [source] });
  assert.equal(reads, 1);
  assert.equal(match.source.name, 'SUN');
});

test('point longitude getter cannot move a match after validation', () => {
  let reads = 0;
  const source = { name: 'SUN', get longitudeDeg() { return ++reads <= 2 ? 0 : 120; } };
  const [match] = calculateCrossAspects({ ...baseline, sourcePoints: [source] });
  assert.equal(reads, 1);
  assert.equal(match.source.longitudeDeg, 0);
  assert.equal(match.actualAngleDeg, 0);
});

test('point type getter cannot change the emitted source classification', () => {
  let reads = 0;
  const source = {
    name: 'SUN', longitudeDeg: 0,
    get type() { return ++reads <= 3 ? 'body' : 'FORGED'; },
  };
  const [match] = calculateCrossAspects({ ...baseline, sourcePoints: [source] });
  assert.equal(reads, 1);
  assert.equal(match.source.type, 'body');
});

test('aspect id getter cannot switch the emitted aspect identity', () => {
  let reads = 0;
  const aspect = { get id() { return ++reads <= 2 ? 'conjunction' : 'FORGED'; }, angleDeg: 0, maxOrbDeg: 1 };
  const [match] = calculateCrossAspects({ ...baseline, aspectDefinitions: [aspect] });
  assert.equal(reads, 1);
  assert.equal(match.aspectId, 'conjunction');
});

test('aspect angle getter cannot move the calculation after validation', () => {
  let reads = 0;
  const aspect = { id: 'conjunction', get angleDeg() { return ++reads <= 3 ? 0 : 180; }, maxOrbDeg: 1 };
  const [match] = calculateCrossAspects({ ...baseline, aspectDefinitions: [aspect] });
  assert.equal(reads, 1);
  assert.equal(match.exactAngleDeg, 0);
  assert.equal(match.actualAngleDeg, 0);
});

test('aspect orb getter cannot alter the emitted configured maximum', () => {
  let reads = 0;
  const aspect = { id: 'conjunction', angleDeg: 0, get maxOrbDeg() { return ++reads <= 3 ? 1 : 0; } };
  const [match] = calculateCrossAspects({ ...baseline, aspectDefinitions: [aspect] });
  assert.equal(reads, 1);
  assert.equal(match.configuredMaxOrbDeg, 1);
});

test('invalid first-read point name is rejected before later accessor output', () => {
  let reads = 0;
  const source = { get name() { return ++reads === 1 ? '   ' : 'SUN'; }, longitudeDeg: 0 };
  assert.throws(() => calculateCrossAspects({ ...baseline, sourcePoints: [source] }),
    error => error instanceof AstrologyError && error.code === 'INVALID_POINT');
  assert.equal(reads, 1);
});

test('invalid first-read aspect angle is rejected with INVALID_ASPECT', () => {
  let reads = 0;
  const aspect = { id: 'conjunction', get angleDeg() { return ++reads === 1 ? NaN : 0; }, maxOrbDeg: 1 };
  assert.throws(() => calculateCrossAspects({ ...baseline, aspectDefinitions: [aspect] }),
    error => error instanceof AstrologyError && error.code === 'INVALID_ASPECT');
  assert.equal(reads, 1);
});
