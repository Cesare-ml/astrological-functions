import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const base = {
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'Sun', longitudeDeg: 0 }],
  targetPoints: [{ name: 'Moon', longitudeDeg: 0 }]
};

test('duplicate aspect rule IDs fail closed even when their angles differ', () => {
  assert.throws(() => calculateCrossAspects({
    ...base,
    aspectDefinitions: [
      { id: 'conjunction', angleDeg: 0, maxOrbDeg: 2 },
      { id: 'conjunction', angleDeg: 90, maxOrbDeg: 2 }
    ]
  }), error => error instanceof AstrologyError && error.code === 'INVALID_ASPECT');
});

test('distinct aspect rule IDs retain normal directional results', () => {
  const matches = calculateCrossAspects({
    ...base,
    aspectDefinitions: [
      { id: 'conjunction', angleDeg: 0, maxOrbDeg: 2 },
      { id: 'square', angleDeg: 90, maxOrbDeg: 2 }
    ]
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].aspectId, 'conjunction');
  assert.equal(matches[0].direction, 'SKY_TO_NATAL');
});
