import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, normalize360, dodecatemoriaLongitude } from '../src/index.mjs';
import { calculateDodecatemoriaFacts } from '../src/dodecatemoria-methods.mjs';
import { calculateDodecatemoriaBatchFacts } from '../src/dodecatemoria-batch.mjs';

const paulus = longitudeDeg => calculateDodecatemoriaFacts({
  longitudeDeg, zodiac: 'TROPICAL', method: 'PAULUS_13_V1',
});

// The exact IEEE-754 double 359.99999999999994 is 360 - 2^-44.
// Its 13-fold image is 360 - 13*2^-44 = 359.99999999999926.
test('13-fold mapping retains precision immediately before the 360-degree seam', () => {
  const before360 = 359.99999999999994;
  const image = dodecatemoriaLongitude(before360);
  assert.equal(image, 359.99999999999926);
  assert.equal(paulus(before360).projectedLongitudeDeg, image);
  assert.equal(paulus(before360).projectedSignIndex, 11);
});

test('sector-local multiplication preserves the exact 13-fold seam at Pisces tail', () => {
  const before330 = 329.99999999999994;
  const expected = 329.99999999999926;
  assert.equal(dodecatemoriaLongitude(before330), expected);
  assert.equal(paulus(before330).projectedLongitudeDeg, expected);
});

test('binary64 values immediately before internal 13-fold wraps remain Pisces, not Aries', () => {
  // Each pre-wrap longitude is a precisely representable binary64 value.
  // Raw longitude*13 rounds some products to an exact multiple of 360,
  // falsely turning a Pisces result into 0 Aries.
  for (const [longitude, expected] of [
    [138.46153846153845, 359.9999999999999],
    [193.84615384615384, 359.9999999999999],
    [249.23076923076923, 359.99999999999994],
    [276.9230769230769, 359.9999999999998],
  ]) {
    assert.equal(dodecatemoriaLongitude(longitude), expected);
    const result = paulus(longitude);
    assert.equal(result.projectedLongitudeDeg, expected);
    assert.equal(result.projectedSignIndex, 11);
  }
});

test('finite huge longitudes normalize before multiplication and do not overflow', () => {
  for (const longitude of [Number.MAX_VALUE, 1e308, -1e308, -Number.MAX_VALUE]) {
    const result = dodecatemoriaLongitude(longitude);
    assert.ok(Number.isFinite(result));
    assert.ok(result >= 0 && result < 360);
    assert.equal(result, dodecatemoriaLongitude(normalize360(longitude)));
    assert.equal(paulus(longitude).projectedLongitudeDeg, result);
  }
});

test('ordinary historical 13-fold examples and versioned batch shape remain unchanged', () => {
  for (const [source, expected] of [[0, 0], [11, 143], [30, 30], [45, 225], [359, 347], [360, 0]]) {
    assert.equal(dodecatemoriaLongitude(source), expected);
    assert.equal(paulus(source).projectedLongitudeDeg, expected);
  }
  const batch = calculateDodecatemoriaBatchFacts({
    points: [{id:'SUN',longitudeDeg:11}, {id:'MOON',longitudeDeg:359.99999999999994}],
    zodiac: 'TROPICAL', method: 'PAULUS_13_V1',
  });
  assert.deepEqual(batch.points.map(p=>p.id), ['SUN', 'MOON']);
  assert.equal(batch.points[1].facts.projectedLongitudeDeg, 359.99999999999926);
  assert.ok(Object.isFrozen(batch.points));
  assert.throws(() => dodecatemoriaLongitude(Infinity),
    err => err instanceof AstrologyError && err.code === 'INVALID_ANGLE');
});
