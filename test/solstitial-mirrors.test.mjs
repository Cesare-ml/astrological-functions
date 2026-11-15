import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSolstitialMirrors } from '../src/solstitial-mirrors.mjs';

const context = Object.freeze({
  zodiac: 'TROPICAL', center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
});
const mirror = (longitudeDeg, ctx = context) => calculateSolstitialMirrors({ longitudeDeg, context: ctx });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('Taurus 10 degrees reflects to Leo 20 and Aquarius 20', () => {
  const result = mirror(40);
  assert.equal(result.antisciaLongitudeDeg, 140);
  assert.equal(result.contraAntisciaLongitudeDeg, 320);
  assert.equal(result.longitudeDeg, 40);
});

test('solstice axes are fixed by antiscia and exchanged by contra-antiscia', () => {
  for (const longitude of [90, 270]) {
    const result = mirror(longitude);
    assert.equal(result.antisciaLongitudeDeg, longitude);
    assert.equal(result.contraAntisciaLongitudeDeg, (longitude + 180) % 360);
  }
});

test('exact Aries/Libra boundary has stable zero/180 normalization', () => {
  assert.deepEqual([mirror(0).antisciaLongitudeDeg, mirror(0).contraAntisciaLongitudeDeg], [180, 0]);
  assert.deepEqual([mirror(360).antisciaLongitudeDeg, mirror(360).contraAntisciaLongitudeDeg], [180, 0]);
  assert.deepEqual([mirror(180).antisciaLongitudeDeg, mirror(180).contraAntisciaLongitudeDeg], [0, 180]);
});

test('whole-turn inputs including negative longitudes agree', () => {
  for (const delta of [-1080, -360, 360, 1080]) {
    near(mirror(23.5 + delta).antisciaLongitudeDeg, mirror(23.5).antisciaLongitudeDeg);
    near(mirror(23.5 + delta).contraAntisciaLongitudeDeg, mirror(23.5).contraAntisciaLongitudeDeg);
  }
});

test('antiscia and contra-antiscia are each involutions', () => {
  for (const longitude of [0, 1e-8, 40, 89.9999, 90, 179.99, 270, 359.99999]) {
    const first = mirror(longitude);
    near(mirror(first.antisciaLongitudeDeg).antisciaLongitudeDeg, longitude);
    near(mirror(first.contraAntisciaLongitudeDeg).contraAntisciaLongitudeDeg, longitude);
    near((first.antisciaLongitudeDeg + 180) % 360, first.contraAntisciaLongitudeDeg);
  }
});

test('invalid or absent longitude fails closed with existing error code', () => {
  for (const value of [undefined, null, '40', NaN, Infinity, -Infinity]) {
    assert.throws(() => mirror(value), e => e.code === 'INVALID_ANGLE');
  }
});

test('wrong or missing context fails closed: never infer tropical from sidereal', () => {
  for (const bad of [null, undefined, {}, { ...context, zodiac: 'SIDEREAL' },
    { ...context, frame: 'J2000' }, { ...context, corrections: 'GEOMETRIC' },
    { ...context, center: 'SUN' }, { ...context, ayanamsa: 'UNSPECIFIED' }]) {
    assert.throws(() => calculateSolstitialMirrors({ longitudeDeg: 40, context: bad }),
      e => e.code === 'INVALID_COORDINATE_CONTEXT');
  }
  assert.throws(() => calculateSolstitialMirrors(null), e => e.code === 'INVALID_ARGUMENT');
});

test('result and detached coordinate-context snapshot are immutable', () => {
  const supplied = { ...context };
  const result = mirror(40, supplied);
  supplied.frame = 'J2000';
  assert.equal(result.coordinateContext.frame, 'ECLIPTIC_OF_DATE');
  assert.equal(result.coordinateContextStatus, 'CALLER_ASSERTED_NOT_VERIFIED');
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.coordinateContext), true);
  assert.throws(() => { result.antisciaLongitudeDeg = 0; }, TypeError);
});
