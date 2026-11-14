import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const base = {
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'Sun', longitudeDeg: 0 }],
  targetPoints: [{ name: 'Moon', longitudeDeg: 180 }],
  aspectDefinitions: [{ id: 'opposition', angleDeg: 180, maxOrbDeg: 0 }]
};

test('malformed source and target longitudes fail with INVALID_POINT', () => {
  for (const field of ['sourcePoints', 'targetPoints']) {
    for (const longitudeDeg of [undefined, null, '180', NaN, Infinity, -Infinity]) {
      assert.throws(() => calculateCrossAspects({
        ...base, [field]: [{ name: 'Body', longitudeDeg }]
      }), error => error instanceof AstrologyError && error.code === 'INVALID_POINT');
    }
  }
});

test('finite point longitudes still normalize and match at wrap boundary', () => {
  const matches = calculateCrossAspects({
    ...base, sourcePoints: [{ name: 'Sun', longitudeDeg: 360 }],
    targetPoints: [{ name: 'Moon', longitudeDeg: -180 }]
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].actualAngleDeg, 180);
  assert.equal(matches[0].source.longitudeDeg, 0);
  assert.equal(matches[0].target.longitudeDeg, 180);
});
