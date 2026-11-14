import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AstrologyError,
  normalize360,
  signedAngularDistance,
  angularSeparation,
  calculateCrossAspects,
  zodiacSignIndex,
  locateLongitudeInHouses,
  calculateNatalWithProvider,
} from '../src/index.mjs';

const below360 = 359.99999999999994; // greatest finite binary64 strictly below 360

test('last representable longitude before 360 is not rounded to zero', () => {
  assert.ok(below360 < 360);
  assert.equal(normalize360(below360), below360);
  assert.equal(normalize360(normalize360(below360)), below360);
  assert.equal(zodiacSignIndex(below360), 11);
});

test('finite aliasing, exact zero and negative zero stay canonical', () => {
  for (const value of [0, 360, -360, 720, -720, -0]) {
    assert.equal(normalize360(value), 0);
    assert.equal(Object.is(normalize360(value), -0), false);
  }
  for (const [value, expected] of [[-1, 359], [-30, 330], [390, 30], [-390, 330], [Number.MIN_VALUE, Number.MIN_VALUE]]) {
    assert.equal(normalize360(value), expected);
  }
});

test('all representative finite values normalize to a half-open [0,360) interval', () => {
  for (const value of [below360, 360, -Number.MIN_VALUE, Number.MIN_VALUE, -1e100, 1e100,
    -359.99999999999994, -721, 721, -12.75, 12.75]) {
    const result = normalize360(value);
    assert.ok(Number.isFinite(result), `finite output for ${value}`);
    assert.ok(result >= 0 && result < 360, `normalized interval for ${value}: ${result}`);
    assert.equal(normalize360(result), result);
  }
});

test('invalid inputs retain canonical INVALID_ANGLE errors', () => {
  for (const value of [NaN, Infinity, -Infinity, null, undefined, '359.9']) {
    assert.throws(() => normalize360(value), error => error instanceof AstrologyError && error.code === 'INVALID_ANGLE');
  }
});

test('house ownership immediately below the Aries boundary remains house twelve', () => {
  const cusps = Array.from({ length: 12 }, (_, index) => index * 30);
  assert.equal(locateLongitudeInHouses(below360, cusps).house, 12);
  assert.equal(locateLongitudeInHouses(360, cusps).house, 1);
});

test('synthetic natal provider does not accidentally relabel near-360 longitude as Aries', async () => {
  const result = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-13T00:00:00Z',
    latitudeDeg: 44.8,
    longitudeDegEast: 11.9,
    bodyNames: ['Sun'],
    provider: {
      getGeocentricEcliptic: async () => ({
        longitudeDeg: below360,
        latitudeDeg: 0,
        metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' },
      }),
    },
  });
  assert.equal(result.bodies.Sun.longitudeDeg, below360);
  assert.equal(result.bodies.Sun.zodiacSignIndex, 11);
});

test('signed shortest-arc distance retains tiny nonzero seam separation', () => {
  const positive = 360 - below360;
  assert.equal(signedAngularDistance(below360, 0), positive);
  assert.equal(signedAngularDistance(0, below360), -positive);
  assert.equal(angularSeparation(0, below360), positive);
  assert.equal(signedAngularDistance(0, 360), 0);
  assert.equal(signedAngularDistance(0, 180), -180);
  assert.equal(signedAngularDistance(180, 0), -180);
  assert.equal(signedAngularDistance(359, 1), 2);
  assert.equal(signedAngularDistance(1, 359), -2);
});

test('cross-aspect facts retain the nonzero angular residual near 360', () => {
  const [fact] = calculateCrossAspects({
    direction: 'A_TO_B',
    sourcePoints: [{ name: 'Mars', longitudeDeg: below360 }],
    targetPoints: [{ name: 'Sun', longitudeDeg: 0 }],
    aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 1 }],
  });
  assert.equal(fact.source.longitudeDeg, below360);
  assert.equal(fact.actualAngleDeg, 360 - below360);
  assert.ok(fact.signedOrbDeg > 0);
});
