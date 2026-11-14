import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const input = {
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'Sun', longitudeDeg: 0 }],
  targetPoints: [{ name: 'Moon', longitudeDeg: 180 }]
};

test('cross-aspect orb cannot exceed maximum angular separation', () => {
  for (const maxOrbDeg of [180.000001, 181, 360, Number.MAX_VALUE]) {
    assert.throws(() => calculateCrossAspects({
      ...input, aspectDefinitions: [{ id: 'opposition', angleDeg: 180, maxOrbDeg }]
    }), error => error instanceof AstrologyError && error.code === 'INVALID_ASPECT');
  }
});

test('cross-aspect orb accepts zero and 180 degree bounds', () => {
  for (const maxOrbDeg of [0, 180]) {
    const matches = calculateCrossAspects({
      ...input, aspectDefinitions: [{ id: 'opposition', angleDeg: 180, maxOrbDeg }]
    });
    assert.equal(matches.length, 1);
    assert.equal(matches[0].actualAngleDeg, 180);
  }
});
